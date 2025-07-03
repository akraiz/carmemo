import { useState, useEffect, useCallback, useMemo } from 'react';
import { Vehicle, MaintenanceTask, TaskStatus, TaskImportance, ExtractedReceiptInfo, FileAttachment, TaskCategory, RecallInfo, BaselineTask } from '../types';
import { MOCK_MANUFACTURER_SCHEDULES, COMMON_MAINTENANCE_PRESETS } from '../constants';
import { getISODateString, addMonths, isDateOverdue } from '../utils/dateUtils';
import { loadVehiclesFromStorage, saveVehiclesToStorage, loadSelectedVehicleIdFromStorage, saveSelectedVehicleIdToStorage } from '../services/localStorageService';
import { ocrReceiptWithGemini, enrichBaselineSchedule } from '../services/aiService';
import { vehicleService, CreateVehicleRequest, VehicleResponse } from '../services/vehicleService';
import { useTranslation } from './useTranslation';
import { useToast } from '../contexts/ToastContext';

// --- App State Interface ---
interface VehicleManagerState {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  isLoading: boolean;
  error: string | null;
  showAddVehicleModal: boolean;
  showAddTaskModal: boolean;
  editingTask: MaintenanceTask | null;
  showEditVehicleModal: boolean; 
  editingVehicle: Vehicle | null;   
  showViewRecallsModal: boolean;
  viewingRecallsVehicle: Vehicle | null;
  enrichingVehicles: Set<string>;
  // Backend integration state
  useBackend: boolean;
  backendConnected: boolean;
  showCompleteTaskModal: boolean;
  completingTask: MaintenanceTask | null;
}

const initialState: VehicleManagerState = {
  vehicles: [],
  selectedVehicleId: null,
  isLoading: false,
  error: null,
  showAddVehicleModal: false,
  showAddTaskModal: false,
  editingTask: null,
  showEditVehicleModal: false, 
  editingVehicle: null,       
  showViewRecallsModal: false,
  viewingRecallsVehicle: null,
  enrichingVehicles: new Set(),
  useBackend: true, // Default to using backend
  backendConnected: false,
  showCompleteTaskModal: false,
  completingTask: null,
};

const useVehicleManagement = () => {
  const [state, setState] = useState<VehicleManagerState>(initialState);
  const { t } = useTranslation();
  const toast = useToast();

  // Check backend connectivity on mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      console.log('[BACKEND] Checking backend connection...');
      const response = await vehicleService.healthCheck();
      console.log('[BACKEND] Health check successful:', response);
      setState(prev => ({ ...prev, backendConnected: true }));
    } catch (error) {
      console.warn('[BACKEND] Backend not available, falling back to localStorage:', error);
      setState(prev => ({ ...prev, backendConnected: false, useBackend: false }));
    }
  };

  // Load vehicles from backend or localStorage
  useEffect(() => {
    loadVehicles();
  }, [state.useBackend, state.backendConnected]);

  const loadVehicles = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (state.useBackend && state.backendConnected) {
        // Load from backend
        const response: VehicleResponse = await vehicleService.getAllVehicles();
        if (response.success && response.data) {
          const normalizeVehicle = (v: any) => ({
            ...v,
            id: v.id || v._id,
            _id: v._id || v.id,
          });
          const vehicles = response.data.map(normalizeVehicle);
          
          setState(prev => ({ 
            ...prev, 
            vehicles,
            selectedVehicleId: vehicles.length > 0 ? vehicles[0].id : null,
            isLoading: false 
          }));
        } else {
          throw new Error(response.error || 'Failed to load vehicles from backend');
        }
      } else {
        // Fallback to localStorage
        const loadedVehicles = loadVehiclesFromStorage();
        const loadedSelectedVehicleId = loadSelectedVehicleIdFromStorage();
        
        if (loadedVehicles.length > 0) {
          setState(prev => ({ 
            ...prev, 
            vehicles: loadedVehicles,
            selectedVehicleId: loadedSelectedVehicleId || loadedVehicles[0].id,
            isLoading: false 
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'errors.loadVehiclesFailed',
        useBackend: false // Fallback to localStorage
      }));
    }
  };

  // Save vehicles to localStorage when they change (for offline support)
  useEffect(() => {
    if (!state.useBackend) {
      saveVehiclesToStorage(state.vehicles);
      saveSelectedVehicleIdToStorage(state.selectedVehicleId);
    }
  }, [state.vehicles, state.selectedVehicleId, state.useBackend]);

  const _generateInitialSchedule = useCallback((vehicle: Pick<Vehicle, 'year' | 'make' | 'model' | 'currentMileage' | 'purchaseDate'>): MaintenanceTask[] => {
    const baseScheduleKey = `${vehicle.make.toUpperCase()}_${vehicle.model.toUpperCase()}_${vehicle.year}`.replace(/\s+/g, '_');
    const scheduleTemplate = MOCK_MANUFACTURER_SCHEDULES[baseScheduleKey] || MOCK_MANUFACTURER_SCHEDULES["DEFAULT"];
    
    const referenceDate = vehicle.purchaseDate ? new Date(vehicle.purchaseDate) : new Date();
    const currentMileage = vehicle.currentMileage || 0;

    const tasks: MaintenanceTask[] = scheduleTemplate.map(templateItem => {
      const { intervalMileage, intervalMonths, task } = templateItem;
      const id = self.crypto.randomUUID();
      const creationDate = getISODateString();
      
      let dueDate: string | undefined;
      let dueMileage: number | undefined;

      const milesPerYear = 12000; 
      const monthsPerMile = 12 / milesPerYear;

      if (intervalMileage && currentMileage < intervalMileage) {
        dueMileage = intervalMileage;
        const milesRemaining = intervalMileage - currentMileage;
        const monthsFromNowMileage = Math.max(1, Math.ceil(milesRemaining * monthsPerMile));
        const mileageBasedDueDate = addMonths(referenceDate, monthsFromNowMileage);
        
        if (intervalMonths) {
            const monthBasedDueDate = addMonths(referenceDate, intervalMonths);
            dueDate = getISODateString(mileageBasedDueDate < monthBasedDueDate ? mileageBasedDueDate : monthBasedDueDate);
        } else {
            dueDate = getISODateString(mileageBasedDueDate);
        }
      } else if (intervalMonths) {
        dueDate = getISODateString(addMonths(referenceDate, intervalMonths));
        if (intervalMileage) { 
            dueMileage = currentMileage + intervalMileage; 
        }
      }
      
      if (dueDate && isDateOverdue(dueDate)) {
        const isRecentPurchaseOrNoDate = !vehicle.purchaseDate || new Date(vehicle.purchaseDate).getFullYear() === new Date().getFullYear();
        if (isRecentPurchaseOrNoDate) {
           dueDate = getISODateString(addMonths(new Date(), 1)); 
        }
      }

      const status = (dueDate && isDateOverdue(dueDate)) ? TaskStatus.Overdue : TaskStatus.Upcoming;

      const titleKey = task.title || "task.defaultScheduledMaintenance";

      return {
        id,
        ...task,
        title: titleKey,
        category: task.category || TaskCategory.Other,
        importance: task.importance || TaskImportance.Recommended,
        status,
        dueDate,
        dueMileage,
        creationDate,
        isRecurring: true,
        recurrenceInterval: `${intervalMileage ? intervalMileage + ' miles' : ''}${intervalMileage && intervalMonths ? ' / ' : ''}${intervalMonths ? intervalMonths + ' months' : ''}`,
      } as MaintenanceTask;
    });
    return tasks;
  }, []);
  
  const handleAddVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'maintenanceSchedule'> & { initialMaintenanceTasks?: MaintenanceTask[], recalls?: RecallInfo[] }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { initialMaintenanceTasks, recalls, ...baseVehicleData } = vehicleData;
      
      console.log('[ADD VEHICLE] State:', { useBackend: state.useBackend, backendConnected: state.backendConnected });
      
      if (state.useBackend && state.backendConnected) {
        console.log('[ADD VEHICLE] Using backend mode');
        // Create vehicle via backend
        const createRequest: CreateVehicleRequest = {
          make: baseVehicleData.make,
          model: baseVehicleData.model,
          year: baseVehicleData.year,
          vin: baseVehicleData.vin,
          nickname: baseVehicleData.nickname,
          currentMileage: baseVehicleData.currentMileage,
          purchaseDate: baseVehicleData.purchaseDate,
          // imageId: baseVehicleData.imageId, // Remove this line
          // Include VIN-derived fields
          trim: baseVehicleData.trim,
          driveType: baseVehicleData.driveType,
          primaryFuelType: baseVehicleData.primaryFuelType,
          secondaryFuelType: baseVehicleData.secondaryFuelType,
          engineBrakeHP: baseVehicleData.engineBrakeHP,
          engineDisplacementL: baseVehicleData.engineDisplacementL,
          transmissionStyle: baseVehicleData.transmissionStyle,
          gvwr: baseVehicleData.gvwr,
          cylinders: baseVehicleData.cylinders,
          electrificationLevel: baseVehicleData.electrificationLevel,
          engineModel: baseVehicleData.engineModel,
          bodyClass: baseVehicleData.bodyClass,
          doors: baseVehicleData.doors,
          engineConfiguration: baseVehicleData.engineConfiguration,
          manufacturerName: baseVehicleData.manufacturerName,
          plantCountry: baseVehicleData.plantCountry,
          plantState: baseVehicleData.plantState,
          plantCity: baseVehicleData.plantCity,
        };

        console.log('[ADD VEHICLE] Sending request to backend:', createRequest);
        const response: VehicleResponse = await vehicleService.createVehicle(createRequest);
        console.log('[ADD VEHICLE] Backend response:', response);
        
        if (response.success && response.data) {
          const backendVehicle = {
            ...response.data,
            id: response.data.id || response.data._id,
            _id: response.data._id || response.data.id,
            maintenanceSchedule: response.data.maintenanceSchedule || [],
            recalls: recalls || [],
          };

          setState(prev => ({
            ...prev,
            vehicles: [...prev.vehicles, backendVehicle],
            selectedVehicleId: backendVehicle.id,
            isLoading: false,
            showAddVehicleModal: false,
          }));
          return backendVehicle.id;
        } else {
          throw new Error(response.error || 'Failed to create vehicle');
        }
      } else {
        console.log('[ADD VEHICLE] Using localStorage mode');
        // Fallback to localStorage approach
        const newVehicle: Vehicle = {
          id: self.crypto.randomUUID(),
          ...baseVehicleData,
          maintenanceSchedule: [],
          imageId: vehicleData.imageId,
          recalls: recalls || [],
        };

        const completedInitialTasks = (initialMaintenanceTasks || []).map(task => ({
          ...task,
          id: typeof task.id === 'string' && task.id.trim().length > 0 ? task.id : self.crypto.randomUUID(),
          creationDate: task.creationDate || getISODateString(),
          status: TaskStatus.Completed,
        }));

        // Fetch baseline schedule from backend if available
        let baselineSchedule: BaselineTask[] = [];
        try {
          if (state.backendConnected) {
            const baselineResponse = await vehicleService.enrichBaselineSchedule(newVehicle.make, newVehicle.model, newVehicle.year);
            baselineSchedule = baselineResponse.data?.schedule || [];
          }
        } catch (error) {
          console.warn('Failed to fetch baseline schedule, using empty array:', error);
          baselineSchedule = [];
        }

        // Fetch forecasted schedule from backend if available
        let forecastedSchedule: MaintenanceTask[] = [];
        try {
          if (state.backendConnected) {
            const forecastResponse = await vehicleService.generateForecastSchedule(newVehicle, completedInitialTasks, baselineSchedule);
            forecastedSchedule = forecastResponse.data?.schedule || [];
          }
        } catch (error) {
          console.warn('Failed to fetch forecasted schedule, using local generation:', error);
          forecastedSchedule = _generateInitialSchedule(newVehicle);
        }

        newVehicle.maintenanceSchedule = forecastedSchedule;

        setState(prev => ({
          ...prev,
          vehicles: [...prev.vehicles, newVehicle],
          selectedVehicleId: newVehicle.id,
          isLoading: false,
          showAddVehicleModal: false,
        }));
        return newVehicle.id;
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      setState(prev => ({ ...prev, isLoading: false, error: "errors.addVehicleFailed" }));
      return undefined;
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      if (state.useBackend && state.backendConnected) {
        const response: VehicleResponse = await vehicleService.deleteVehicle(vehicleId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete vehicle');
        }
      }

      setState(prev => {
        const updatedVehicles = prev.vehicles.filter(v => v.id !== vehicleId);
        let newSelectedId = prev.selectedVehicleId;
        if (prev.selectedVehicleId === vehicleId) {
          newSelectedId = updatedVehicles.length > 0 ? updatedVehicles[0].id : null;
        }
        return { ...prev, vehicles: updatedVehicles, selectedVehicleId: newSelectedId };
      });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      setState(prev => ({ ...prev, error: "errors.deleteVehicleFailed" }));
    }
  };
  
  const handleSelectVehicle = (vehicleId: string) => {
    setState(prev => ({ ...prev, selectedVehicleId: vehicleId, error: null }));
  };

  const handleOpenAddTaskModal = (task?: MaintenanceTask) => {
    setState(prev => ({ ...prev, showAddTaskModal: true, editingTask: task || null, error: null }));
  };

  const refreshVehicleData = async (vehicleId: string) => {
    if (!state.useBackend || !state.backendConnected) return;

    try {
      const response = await vehicleService.getVehicleById(vehicleId);
      if (response.success && response.data) {
        setState(prev => {
          const vehiclesCopy = [...prev.vehicles];
          const vehicleIndex = vehiclesCopy.findIndex(v => v.id === vehicleId);
          if (vehicleIndex !== -1) {
            vehiclesCopy[vehicleIndex] = {
              ...response.data,
              id: response.data.id || response.data._id,
              _id: response.data._id || response.data.id,
              maintenanceSchedule: [...(response.data.maintenanceSchedule || [])]
            };
          }
          // Ensure selectedVehicleId is set to the refreshed vehicle
          return { ...prev, vehicles: vehiclesCopy, selectedVehicleId: vehicleId };
        });
      }
    } catch (error) {
      console.error('Error refreshing vehicle data:', error);
    }
  };

  const handleUpsertTask = async (taskData: MaintenanceTask) => {
    if (!state.selectedVehicleId) return;

    const isNewTask = !taskData.id || !state.vehicles.some(v => v.maintenanceSchedule.some(t => t.id === taskData.id));

    // Optimistic update
    const optimisticUpdate = () => {
      setState(prev => {
        const vehiclesCopy = [...prev.vehicles];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
        if (vehicleIndex === -1) return prev;

        const vehicle = { ...vehiclesCopy[vehicleIndex] };
        const taskIndex = vehicle.maintenanceSchedule.findIndex(t => t.id === taskData.id);
        
        const safeTask = {
          ...taskData,
          id: typeof taskData.id === 'string' && taskData.id.trim().length > 0 ? taskData.id : self.crypto.randomUUID(),
        };

        if (taskIndex !== -1) {
          vehicle.maintenanceSchedule[taskIndex] = safeTask;
        } else {
          vehicle.maintenanceSchedule.push(safeTask);
        }
        
        vehiclesCopy[vehicleIndex] = vehicle;
        return { ...prev, vehicles: vehiclesCopy, showAddTaskModal: false, editingTask: null };
      });
    };

    // Apply optimistic update immediately
    optimisticUpdate();

    try {
      if (state.useBackend && state.backendConnected) {
        let response: VehicleResponse;
        
        if (taskData.id && state.vehicles.some(v => v.maintenanceSchedule.some(t => t.id === taskData.id))) {
          // Update existing task
          response = await vehicleService.updateTask(state.selectedVehicleId, taskData.id, taskData);
        } else {
          // Add new task
          response = await vehicleService.addTask(state.selectedVehicleId, taskData);
        }
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to save task');
        }

        // Refresh vehicle data to ensure consistency
        await refreshVehicleData(state.selectedVehicleId);

        // Show success toast
        toast.showGenericSuccess(isNewTask ? 'Task added successfully!' : 'Task updated successfully!');
      } else {
        // Show success toast for local-only operations
        toast.showGenericSuccess(isNewTask ? 'Task added successfully!' : 'Task updated successfully!');
      }
    } catch (error) {
      console.error("Error upserting task:", error);
      
      // Show error toast
      toast.showGenericError(isNewTask ? 'Failed to add task' : 'Failed to update task');
      
      // Revert optimistic update on error
      setState(prev => {
        const vehiclesCopy = [...prev.vehicles];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
        if (vehicleIndex === -1) return prev;

        const vehicle = { ...vehiclesCopy[vehicleIndex] };
        
        // Remove the task if it was newly added, or revert to previous state
        if (!taskData.id || !state.vehicles.some(v => v.maintenanceSchedule.some(t => t.id === taskData.id))) {
          vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.filter(t => t.id !== taskData.id);
        }
        
        vehiclesCopy[vehicleIndex] = vehicle;
        return { ...prev, vehicles: vehiclesCopy, error: "errors.upsertTaskFailed" };
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!state.selectedVehicleId) return;

    // Store the task for potential undo
    const taskToDelete = state.vehicles
      .find(v => v.id === state.selectedVehicleId)
      ?.maintenanceSchedule.find(t => t.id === taskId);

    // Optimistic update
    setState(prev => {
      const vehiclesCopy = [...prev.vehicles];
      const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
      if (vehicleIndex === -1) return prev;

      const vehicle = { ...vehiclesCopy[vehicleIndex] };
      vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.filter(t => t.id !== taskId);
      vehiclesCopy[vehicleIndex] = vehicle;
      return { ...prev, vehicles: vehiclesCopy };
    });

    try {
      if (state.useBackend && state.backendConnected) {
        const response: VehicleResponse = await vehicleService.deleteTask(state.selectedVehicleId, taskId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete task');
        }

        // Refresh vehicle data to ensure consistency
        await refreshVehicleData(state.selectedVehicleId);
      }

      // Show success toast
      toast.showGenericSuccess('Task deleted successfully!');
    } catch (error) {
      console.error("Error deleting task:", error);
      
      // Show error toast
      toast.showGenericError('Failed to delete task');
      
      // Revert optimistic update on error
      if (taskToDelete) {
        setState(prev => {
          const vehiclesCopy = [...prev.vehicles];
          const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
          if (vehicleIndex === -1) return prev;

          const vehicle = { ...vehiclesCopy[vehicleIndex] };
          vehicle.maintenanceSchedule.push(taskToDelete);
          vehiclesCopy[vehicleIndex] = vehicle;
          return { ...prev, vehicles: vehiclesCopy, error: "errors.deleteTaskFailed" };
        });
      }
    }
  };

  const handleToggleTaskStatus = async (taskId: string, newStatus?: TaskStatus, skipEdit?: boolean) => {
    if (!state.selectedVehicleId) return;

    const currentVehicle = state.vehicles.find(v => v.id === state.selectedVehicleId);
    if (!currentVehicle) return;

    const currentTask = currentVehicle.maintenanceSchedule.find(t => t.id === taskId);
    if (!currentTask) return;

    const updatedTask = {
      ...currentTask,
      status: newStatus || (currentTask.status === TaskStatus.Completed ? TaskStatus.Upcoming : TaskStatus.Completed),
      completedDate: newStatus === TaskStatus.Completed ? getISODateString() : undefined,
    };

    const isCompleting = updatedTask.status === TaskStatus.Completed;

    if (isCompleting && !skipEdit) {
      // Open edit modal for completion, let user edit optional fields
      setState(prev => ({ ...prev, showAddTaskModal: true, editingTask: updatedTask }));
      return;
    }

    // Optimistic update
    setState(prev => {
      const vehiclesCopy = [...prev.vehicles];
      const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
      if (vehicleIndex === -1) return prev;

      const vehicle = { ...vehiclesCopy[vehicleIndex] };
      vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.map(t =>
        t.id === taskId ? updatedTask : t
      );
      vehiclesCopy[vehicleIndex] = vehicle;
      return { ...prev, vehicles: vehiclesCopy };
    });

    try {
      if (state.useBackend && state.backendConnected) {
        const response: VehicleResponse = await vehicleService.updateTask(state.selectedVehicleId, taskId, updatedTask);
        if (!response.success) {
          throw new Error(response.error || 'Failed to update task status');
        }

        // Refresh vehicle data to ensure consistency
        await refreshVehicleData(state.selectedVehicleId);
      }

      // Show success toast
      toast.showGenericSuccess(isCompleting ? 'Task completed successfully!' : 'Task status updated!');
    } catch (error) {
      console.error("Error toggling task status:", error);
      // Show error toast
      toast.showGenericError('Failed to update task status');
      // Revert optimistic update on error
      setState(prev => {
        const vehiclesCopy = [...prev.vehicles];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
        if (vehicleIndex === -1) return prev;

        const vehicle = { ...vehiclesCopy[vehicleIndex] };
        const taskIndex = vehicle.maintenanceSchedule.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          vehicle.maintenanceSchedule[taskIndex] = currentTask;
        }
        vehiclesCopy[vehicleIndex] = vehicle;
        return { ...prev, vehicles: vehiclesCopy, error: "errors.toggleTaskStatusFailed" };
      });
    }
  };

  const handleFileUpload = async (file: File, taskId: string, type: 'photo' | 'receipt'): Promise<FileAttachment | null> => {
    if (!state.selectedVehicleId) return null;

    try {
      if (state.useBackend && state.backendConnected) {
        const response: VehicleResponse = await vehicleService.uploadTaskReceipt(state.selectedVehicleId, taskId, file);
        if (response.success && response.data) {
          return {
            id: response.data.id || self.crypto.randomUUID(),
            name: response.data.name || file.name,
            url: response.data.url,
            type: response.data.type || file.type,
            uploadedDate: response.data.uploadedDate || getISODateString(),
          };
        }
      }

      // Fallback to local file handling
      const fileAttachment: FileAttachment = {
        id: self.crypto.randomUUID(),
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        uploadedDate: getISODateString(),
      };

      setState(prev => {
        const vehiclesCopy = [...prev.vehicles];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
        if (vehicleIndex === -1) return prev;

        const vehicle = { ...vehiclesCopy[vehicleIndex] };
        const taskIndex = vehicle.maintenanceSchedule.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          const task = { ...vehicle.maintenanceSchedule[taskIndex] };
          if (type === 'receipt') {
            task.receipts = [...(task.receipts || []), fileAttachment];
          } else {
            task.photos = [...(task.photos || []), fileAttachment];
          }
          vehicle.maintenanceSchedule[taskIndex] = task;
        }
        vehiclesCopy[vehicleIndex] = vehicle;
        return { ...prev, vehicles: vehiclesCopy };
      });

      return fileAttachment;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleOCRReceipt = async (file: File, taskId: string): Promise<ExtractedReceiptInfo | null> => {
    if (!state.selectedVehicleId) return null;

    try {
      if (state.useBackend && state.backendConnected) {
        const response: VehicleResponse = await vehicleService.completeTaskViaOCR(state.selectedVehicleId, file);
        if (response.success && response.data) {
          return {
            taskName: response.data.taskName,
            date: response.data.date,
            cost: response.data.cost,
            items: response.data.items,
            notes: response.data.notes,
          };
        }
      }

      // Fallback to local OCR
      return await ocrReceiptWithGemini(file);
    } catch (error) {
      console.error("Error processing OCR:", error);
      return null;
    }
  };

  const handleOpenEditVehicleModal = (vehicle: Vehicle) => {
    setState(prev => ({ ...prev, showEditVehicleModal: true, editingVehicle: vehicle, error: null }));
  };

  const handleUpdateVehicle = async (updatedVehicleData: Partial<Vehicle> & { id: string }) => {
    try {
      if (state.useBackend && state.backendConnected) {
        const response: VehicleResponse = await vehicleService.updateVehicle(updatedVehicleData.id, updatedVehicleData);
        if (!response.success) {
          throw new Error(response.error || 'Failed to update vehicle');
        }
      }

      setState(prev => {
        const vehiclesCopy = [...prev.vehicles];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === updatedVehicleData.id);
        if (vehicleIndex !== -1) {
          vehiclesCopy[vehicleIndex] = { ...vehiclesCopy[vehicleIndex], ...updatedVehicleData };
        }
        return { ...prev, vehicles: vehiclesCopy, showEditVehicleModal: false, editingVehicle: null };
      });
    } catch (error) {
      console.error("Error updating vehicle:", error);
      setState(prev => ({ ...prev, error: "errors.updateVehicleFailed" }));
    }
  };

  const handleUpdateVehiclePhoto = async (vehicleId: string, file: File) => {
    try {
      if (state.useBackend && state.backendConnected) {
        const response: VehicleResponse = await vehicleService.uploadVehicleImage(vehicleId, file);
        if (response.success && response.data) {
          const imageId = response.data.imageId;
          await handleUpdateVehicle({ id: vehicleId, imageId });
        }
      } else {
        // Fallback to local file handling
        const imageId = URL.createObjectURL(file);
        await handleUpdateVehicle({ id: vehicleId, imageId });
      }
    } catch (error) {
      console.error("Error updating vehicle photo:", error);
      setState(prev => ({ ...prev, error: "errors.updateVehiclePhotoFailed" }));
    }
  };

  const handleOpenViewRecallsModal = () => {
    const selectedVehicle = state.vehicles.find(v => v.id === state.selectedVehicleId);
    if (selectedVehicle) {
      setState(prev => ({ ...prev, showViewRecallsModal: true, viewingRecallsVehicle: selectedVehicle }));
    }
  };

  const handleCloseViewRecallsModal = () => {
    setState(prev => ({ ...prev, showViewRecallsModal: false, viewingRecallsVehicle: null }));
  };

  const startEnrichment = (vehicleId: string) => {
    setState(prev => ({
      ...prev,
      enrichingVehicles: new Set([...prev.enrichingVehicles, vehicleId])
    }));
  };

  const stopEnrichment = (vehicleId: string) => {
    setState(prev => {
      const newEnrichingVehicles = new Set(prev.enrichingVehicles);
      newEnrichingVehicles.delete(vehicleId);
      return { ...prev, enrichingVehicles: newEnrichingVehicles };
    });
  };

  const isEnriching = (vehicleId: string) => {
    return state.enrichingVehicles.has(vehicleId);
  };

  const toggleBackendMode = () => {
    setState(prev => ({ 
      ...prev, 
      useBackend: !prev.useBackend,
      error: null 
    }));
  };

  const refreshVehicles = () => {
    loadVehicles();
  };

  const handleUploadVehicleImage = async (vehicleId: string, file: File) => {
    await vehicleService.uploadVehicleImage(vehicleId, file);
  };

  const handleOpenCompleteTaskModal = (task: MaintenanceTask) => {
    setState(prev => ({ ...prev, showCompleteTaskModal: true, completingTask: task }));
  };

  const handleCloseCompleteTaskModal = () => {
    setState(prev => ({ ...prev, showCompleteTaskModal: false, completingTask: null }));
  };

  const handleCompleteTask = async (taskUpdate: Partial<MaintenanceTask>) => {
    if (!state.selectedVehicleId || !taskUpdate.id) return;
    try {
      if (state.useBackend && state.backendConnected) {
        await vehicleService.updateTask(state.selectedVehicleId, taskUpdate.id, taskUpdate);
        await refreshVehicleData(state.selectedVehicleId);
      } else {
        // Local update
        setState(prev => {
          const vehiclesCopy = [...prev.vehicles];
          const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
          if (vehicleIndex === -1) return prev;
          const vehicle = { ...vehiclesCopy[vehicleIndex] };
          const taskIndex = vehicle.maintenanceSchedule.findIndex(t => t.id === taskUpdate.id);
          if (taskIndex !== -1) {
            vehicle.maintenanceSchedule[taskIndex] = {
              ...vehicle.maintenanceSchedule[taskIndex],
              ...taskUpdate,
            };
          }
          vehiclesCopy[vehicleIndex] = vehicle;
          return { ...prev, vehicles: vehiclesCopy };
        });
      }
      toast.showGenericSuccess('Task completed!');
      handleCloseCompleteTaskModal();
    } catch (error) {
      toast.showGenericError('Failed to complete task');
    }
  };

  return {
    ...state,
    setState,
    handleAddVehicle,
    handleUpdateVehicle,
    handleDeleteVehicle,
    handleSelectVehicle,
    handleOpenAddTaskModal,
    handleUpsertTask,
    handleDeleteTask,
    handleToggleTaskStatus,
    handleUpdateVehiclePhoto,
    handleOpenViewRecallsModal,
    handleCloseViewRecallsModal,
    handleOpenEditVehicleModal,
    startEnrichment,
    stopEnrichment,
    isEnriching,
    toggleBackendMode,
    refreshVehicles,
    handleUploadVehicleImage,
    refreshVehicleData,
    clearError: () => setState(prev => ({ ...prev, error: null })),
    // Modal handlers added for compatibility
    handleOpenAddVehicleModal: () => setState(prev => ({ ...prev, showAddVehicleModal: true, error: null })),
    handleCloseAddVehicleModal: () => setState(prev => ({ ...prev, showAddVehicleModal: false })),
    handleCloseEditVehicleModal: () => setState(prev => ({ ...prev, showEditVehicleModal: false, editingVehicle: null })),
    handleCloseAddTaskModal: () => setState(prev => ({ ...prev, showAddTaskModal: false, editingTask: null })),
    handleOpenCompleteTaskModal,
    handleCloseCompleteTaskModal,
    handleCompleteTask,
  };
};

export default useVehicleManagement; 