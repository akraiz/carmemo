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

export default function useVehicleManagement() {
  let hookIndex = 1;
  const hook = (desc: string) => {
    // eslint-disable-next-line no-console
    console.log(`[useVehicleManagement] ${hookIndex++}. ${desc}`);
  };
  hook('useState vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  hook('useState selectedVehicleId');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  hook('useState isLoading');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  hook('useState error');
  const [error, setError] = useState<string | null>(null);
  hook('useState showAddVehicleModal');
  const [showAddVehicleModal, setShowAddVehicleModal] = useState<boolean>(false);
  hook('useState showAddTaskModal');
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  hook('useState editingTask');
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  hook('useState showEditVehicleModal');
  const [showEditVehicleModal, setShowEditVehicleModal] = useState<boolean>(false);
  hook('useState editingVehicle');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  hook('useState showViewRecallsModal');
  const [showViewRecallsModal, setShowViewRecallsModal] = useState<boolean>(false);
  hook('useState viewingRecallsVehicle');
  const [viewingRecallsVehicle, setViewingRecallsVehicle] = useState<Vehicle | null>(null);
  hook('useState enrichingVehicles');
  const [enrichingVehicles, setEnrichingVehicles] = useState<Set<string>>(new Set());
  // Backend integration state
  hook('useState useBackend');
  const [useBackend, setUseBackend] = useState<boolean>(true);
  hook('useState backendConnected');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  hook('useState showCompleteTaskModal');
  const [showCompleteTaskModal, setShowCompleteTaskModal] = useState<boolean>(false);
  hook('useState completingTask');
  const [completingTask, setCompletingTask] = useState<MaintenanceTask | null>(null);

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
      setBackendConnected(true);
    } catch (error) {
      console.warn('[BACKEND] Backend not available, falling back to localStorage:', error);
      setBackendConnected(false);
      setUseBackend(false);
    }
  };

  // Load vehicles from backend or localStorage
  useEffect(() => {
    loadVehicles();
  }, [useBackend, backendConnected]);

  const loadVehicles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (useBackend && backendConnected) {
        // Load from backend
        const response: VehicleResponse = await vehicleService.getAllVehicles();
        if (response.success && response.data) {
          const normalizeVehicle = (v: any) => {
            const id = v.id || v._id;
            return {
              ...v,
              id,
              _id: v._id || id,
            };
          };
          const vehicles = response.data.map(normalizeVehicle);
          console.log('Loaded vehicles after normalization:', vehicles);
          setVehicles(vehicles);
          setSelectedVehicleId(vehicles.length > 0 ? vehicles[0].id : null);
          setIsLoading(false);
        } else {
          throw new Error(response.error || 'Failed to load vehicles from backend');
        }
      } else {
        // Fallback to localStorage
        const loadedVehicles = loadVehiclesFromStorage();
        const loadedSelectedVehicleId = loadSelectedVehicleIdFromStorage();
        
        if (loadedVehicles.length > 0) {
          setVehicles(loadedVehicles);
          setSelectedVehicleId(loadedSelectedVehicleId || loadedVehicles[0].id);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setIsLoading(false);
      setError('errors.loadVehiclesFailed');
      setUseBackend(false); // Fallback to localStorage
    }
  };

  // Save vehicles to localStorage when they change (for offline support)
  useEffect(() => {
    if (!useBackend) {
      saveVehiclesToStorage(vehicles);
      saveSelectedVehicleIdToStorage(selectedVehicleId);
    }
  }, [vehicles, selectedVehicleId, useBackend]);

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
    setIsLoading(true);
    setError(null);
    
    try {
      const { initialMaintenanceTasks, recalls, ...baseVehicleData } = vehicleData;
      
      console.log('[ADD VEHICLE] State:', { useBackend, backendConnected });
      
      if (useBackend && backendConnected) {
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

          setVehicles(prev => [...prev, backendVehicle]);
          setSelectedVehicleId(backendVehicle.id);
          setIsLoading(false);
          setShowAddVehicleModal(false);
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
          if (backendConnected) {
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
          if (backendConnected) {
            const forecastResponse = await vehicleService.generateForecastSchedule(newVehicle, completedInitialTasks, baselineSchedule);
            forecastedSchedule = forecastResponse.data?.schedule || [];
          }
        } catch (error) {
          console.warn('Failed to fetch forecasted schedule, using local generation:', error);
          forecastedSchedule = _generateInitialSchedule(newVehicle);
        }

        newVehicle.maintenanceSchedule = forecastedSchedule;

        setVehicles(prev => [...prev, newVehicle]);
        setSelectedVehicleId(newVehicle.id);
        setIsLoading(false);
        setShowAddVehicleModal(false);
        return newVehicle.id;
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      setIsLoading(false);
      setError("errors.addVehicleFailed");
      return undefined;
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      if (useBackend && backendConnected) {
        const response: VehicleResponse = await vehicleService.deleteVehicle(vehicleId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete vehicle');
        }
      }

      setVehicles(prev => {
        const updatedVehicles = prev.filter(v => v.id !== vehicleId);
        if (selectedVehicleId === vehicleId) {
          setSelectedVehicleId(updatedVehicles.length > 0 ? updatedVehicles[0].id : null);
        }
        return updatedVehicles;
      });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      setError("errors.deleteVehicleFailed");
    }
  };
  
  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setError(null);
  };

  const handleOpenAddTaskModal = (task?: MaintenanceTask) => {
    setShowAddTaskModal(true);
    setEditingTask(task || null);
    setError(null);
  };

  const refreshVehicleData = async (vehicleId: string) => {
    if (!useBackend || !backendConnected) return;

    try {
      const response = await vehicleService.getVehicleById(vehicleId);
      if (response.success && response.data) {
        setVehicles(prev => {
          const vehiclesCopy = [...prev];
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
          return vehiclesCopy;
        });
        setSelectedVehicleId(vehicleId);
      }
    } catch (error) {
      console.error('Error refreshing vehicle data:', error);
    }
  };

  const handleUpsertTask = async (taskData: MaintenanceTask) => {
    if (!selectedVehicleId) return;

    const isNewTask = !taskData.id || !vehicles.some(v => v.maintenanceSchedule.some(t => t.id === taskData.id));

    // Optimistic update
    const optimisticUpdate = () => {
      setVehicles(prev => {
        const vehiclesCopy = [...prev];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === selectedVehicleId);
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
        return vehiclesCopy;
      });
      setShowAddTaskModal(false);
      setEditingTask(null);
    };

    // Apply optimistic update immediately
    optimisticUpdate();

    try {
      if (useBackend && backendConnected) {
        let response: VehicleResponse;
        
        if (taskData.id && vehicles.some(v => v.maintenanceSchedule.some(t => t.id === taskData.id))) {
          // Update existing task
          response = await vehicleService.updateTask(selectedVehicleId, taskData.id, taskData);
        } else {
          // Add new task
          response = await vehicleService.addTask(selectedVehicleId, taskData);
        }
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to save task');
        }

        // Refresh vehicle data to ensure consistency
        await refreshVehicleData(selectedVehicleId);

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
      setVehicles(prev => {
        const vehiclesCopy = [...prev];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === selectedVehicleId);
        if (vehicleIndex === -1) return prev;

        const vehicle = { ...vehiclesCopy[vehicleIndex] };
        
        // Remove the task if it was newly added, or revert to previous state
        if (!taskData.id || !vehicles.some(v => v.maintenanceSchedule.some(t => t.id === taskData.id))) {
          vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.filter(t => t.id !== taskData.id);
        }
        
        vehiclesCopy[vehicleIndex] = vehicle;
        return vehiclesCopy;
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedVehicleId) return;

    // Store the task for potential undo
    const taskToDelete = vehicles
      .find(v => v.id === selectedVehicleId)
      ?.maintenanceSchedule.find(t => t.id === taskId);

    // Optimistic update
    setVehicles(prev => {
      const vehiclesCopy = [...prev];
      const vehicleIndex = vehiclesCopy.findIndex(v => v.id === selectedVehicleId);
      if (vehicleIndex === -1) return prev;

      const vehicle = { ...vehiclesCopy[vehicleIndex] };
      vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.filter(t => t.id !== taskId);
      vehiclesCopy[vehicleIndex] = vehicle;
      return vehiclesCopy;
    });

    try {
      if (useBackend && backendConnected) {
        const response: VehicleResponse = await vehicleService.deleteTask(selectedVehicleId, taskId);
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete task');
        }

        // Refresh vehicle data to ensure consistency
        await refreshVehicleData(selectedVehicleId);
      }

      // Show success toast
      toast.showGenericSuccess('Task deleted successfully!');
    } catch (error) {
      console.error("Error deleting task:", error);
      
      // Show error toast
      toast.showGenericError('Failed to delete task');
      
      // Revert optimistic update on error
      if (taskToDelete) {
        setVehicles(prev => {
          const vehiclesCopy = [...prev];
          const vehicleIndex = vehiclesCopy.findIndex(v => v.id === selectedVehicleId);
          if (vehicleIndex === -1) return prev;

          const vehicle = { ...vehiclesCopy[vehicleIndex] };
          vehicle.maintenanceSchedule.push(taskToDelete);
          vehiclesCopy[vehicleIndex] = vehicle;
          return vehiclesCopy;
        });
      }
    }
  };

  const handleToggleTaskStatus = async (taskId: string, newStatus?: TaskStatus, skipEdit?: boolean) => {
    if (!selectedVehicleId) return;

    const currentVehicle = vehicles.find(v => v.id === selectedVehicleId);
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
      setShowAddTaskModal(true);
      setEditingTask(updatedTask);
      return;
    }

    // Optimistic update
    setVehicles(prev => {
      const vehiclesCopy = [...prev];
      const vehicleIndex = vehiclesCopy.findIndex(v => v.id === selectedVehicleId);
      if (vehicleIndex === -1) return prev;

      const vehicle = { ...vehiclesCopy[vehicleIndex] };
      vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.map(t =>
        t.id === taskId ? updatedTask : t
      );
      vehiclesCopy[vehicleIndex] = vehicle;
      return vehiclesCopy;
    });

    try {
      if (useBackend && backendConnected) {
        const response: VehicleResponse = await vehicleService.updateTask(selectedVehicleId, taskId, updatedTask);
        if (!response.success) {
          throw new Error(response.error || 'Failed to update task status');
        }

        // Refresh vehicle data to ensure consistency
        await refreshVehicleData(selectedVehicleId);
      }

      // Show success toast
      toast.showGenericSuccess(isCompleting ? 'Task completed successfully!' : 'Task status updated!');
    } catch (error) {
      console.error("Error toggling task status:", error);
      // Show error toast
      toast.showGenericError('Failed to update task status');
      // Revert optimistic update on error
      setVehicles(prev => {
        const vehiclesCopy = [...prev];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === selectedVehicleId);
        if (vehicleIndex === -1) return prev;

        const vehicle = { ...vehiclesCopy[vehicleIndex] };
        const taskIndex = vehicle.maintenanceSchedule.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          vehicle.maintenanceSchedule[taskIndex] = currentTask;
        }
        vehiclesCopy[vehicleIndex] = vehicle;
        return vehiclesCopy;
      });
    }
  };

  const handleFileUpload = async (file: File, taskId: string, type: 'photo' | 'receipt'): Promise<FileAttachment | null> => {
    if (!selectedVehicleId) return null;

    try {
      if (useBackend && backendConnected) {
        const response: VehicleResponse = await vehicleService.uploadTaskReceipt(selectedVehicleId, taskId, file);
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

      setVehicles(prev => {
        const vehiclesCopy = [...prev];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === selectedVehicleId);
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
        return vehiclesCopy;
      });

      return fileAttachment;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleOCRReceipt = async (file: File, taskId: string): Promise<ExtractedReceiptInfo | null> => {
    if (!selectedVehicleId) return null;

    try {
      if (useBackend && backendConnected) {
        const response: VehicleResponse = await vehicleService.completeTaskViaOCR(selectedVehicleId, file);
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
    setShowEditVehicleModal(true);
    setEditingVehicle(vehicle);
    setError(null);
  };

  const handleUpdateVehicle = async (updatedVehicleData: Partial<Vehicle> & { id: string }) => {
    try {
      if (useBackend && backendConnected) {
        const response: VehicleResponse = await vehicleService.updateVehicle(updatedVehicleData.id, updatedVehicleData);
        if (!response.success) {
          throw new Error(response.error || 'Failed to update vehicle');
        }
      }

      setVehicles(prev => {
        const vehiclesCopy = [...prev];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === updatedVehicleData.id);
        if (vehicleIndex !== -1) {
          vehiclesCopy[vehicleIndex] = { ...vehiclesCopy[vehicleIndex], ...updatedVehicleData };
        }
        return vehiclesCopy;
      });
      setShowEditVehicleModal(false);
      setEditingVehicle(null);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      setError("errors.updateVehicleFailed");
    }
  };

  const handleUpdateVehiclePhoto = async (vehicleId: string, file: File) => {
    try {
      if (useBackend && backendConnected) {
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
      setError("errors.updateVehiclePhotoFailed");
    }
  };

  const handleOpenViewRecallsModal = () => {
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (selectedVehicle) {
      setShowViewRecallsModal(true);
      setViewingRecallsVehicle(selectedVehicle);
    }
  };

  const handleCloseViewRecallsModal = () => {
    setShowViewRecallsModal(false);
    setViewingRecallsVehicle(null);
  };

  const startEnrichment = (vehicleId: string) => {
    setEnrichingVehicles(prev => new Set([...prev, vehicleId]));
  };

  const stopEnrichment = (vehicleId: string) => {
    setEnrichingVehicles(prev => {
      const newEnrichingVehicles = new Set(prev);
      newEnrichingVehicles.delete(vehicleId);
      return newEnrichingVehicles;
    });
  };

  const isEnriching = (vehicleId: string) => {
    return enrichingVehicles.has(vehicleId);
  };

  const toggleBackendMode = () => {
    setUseBackend(prev => !prev);
    setError(null);
  };

  const refreshVehicles = () => {
    loadVehicles();
  };

  const handleUploadVehicleImage = async (vehicleId: string, file: File) => {
    await vehicleService.uploadVehicleImage(vehicleId, file);
  };

  const handleOpenCompleteTaskModal = (task: MaintenanceTask) => {
    setShowCompleteTaskModal(true);
    setCompletingTask(task);
  };

  const handleCloseCompleteTaskModal = () => {
    setShowCompleteTaskModal(false);
    setCompletingTask(null);
  };

  const handleCompleteTask = async (taskUpdate: Partial<MaintenanceTask>) => {
    if (!selectedVehicleId || !taskUpdate.id) return;
    try {
      if (useBackend && backendConnected) {
        await vehicleService.updateTask(selectedVehicleId, taskUpdate.id, taskUpdate);
        await refreshVehicleData(selectedVehicleId);
      } else {
        // Local update
        setVehicles(prev => {
          const vehiclesCopy = [...prev];
          const vehicleIndex = vehiclesCopy.findIndex(v => v.id === selectedVehicleId);
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
          return vehiclesCopy;
        });
      }
      toast.showGenericSuccess('Task completed successfully!');
      handleCloseCompleteTaskModal();
    } catch (error) {
      toast.showGenericError('Failed to complete task');
    }
  };

  return {
    vehicles,
    selectedVehicleId,
    isLoading,
    error,
    showAddVehicleModal,
    showAddTaskModal,
    editingTask,
    showEditVehicleModal,
    editingVehicle,
    showViewRecallsModal,
    viewingRecallsVehicle,
    enrichingVehicles,
    useBackend,
    backendConnected,
    showCompleteTaskModal,
    completingTask,
    setVehicles,
    setSelectedVehicleId,
    setIsLoading,
    setError,
    setShowAddVehicleModal,
    setShowAddTaskModal,
    setEditingTask,
    setShowEditVehicleModal,
    setEditingVehicle,
    setShowViewRecallsModal,
    setViewingRecallsVehicle,
    setEnrichingVehicles,
    setUseBackend,
    setBackendConnected,
    setShowCompleteTaskModal,
    setCompletingTask,
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
    clearError: () => setError(null),
    // Modal handlers added for compatibility
    handleOpenAddVehicleModal: () => setShowAddVehicleModal(true),
    handleCloseAddVehicleModal: () => setShowAddVehicleModal(false),
    handleCloseEditVehicleModal: () => setShowEditVehicleModal(false),
    handleCloseAddTaskModal: () => setShowAddTaskModal(false),
    handleOpenCompleteTaskModal,
    handleCloseCompleteTaskModal,
    handleCompleteTask,
  };
}; 