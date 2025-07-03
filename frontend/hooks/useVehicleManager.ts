import { useState, useEffect, useCallback } from 'react';
import { Vehicle, MaintenanceTask, TaskStatus, TaskImportance, ExtractedReceiptInfo, FileAttachment, TaskCategory, RecallInfo, BaselineTask } from '../types';
import { MOCK_MANUFACTURER_SCHEDULES, COMMON_MAINTENANCE_PRESETS } from '../constants';
import { getISODateString, addMonths, isDateOverdue } from '../utils/dateUtils';
import { loadVehiclesFromStorage, saveVehiclesToStorage, loadSelectedVehicleIdFromStorage, saveSelectedVehicleIdToStorage } from '../services/localStorageService';
import { ocrReceiptWithGemini, enrichBaselineSchedule } from '../services/aiService';
import { useTranslation } from './useTranslation'; // Added for t function
import { API_CONFIG, buildApiUrl } from '../config/api';

// --- App State Interface ---
interface VehicleManagerState {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  isLoading: boolean;
  error: string | null; // This could be a translation key
  showAddVehicleModal: boolean;
  showAddTaskModal: boolean;
  editingTask: MaintenanceTask | null;
  showEditVehicleModal: boolean; 
  editingVehicle: Vehicle | null;   
  showViewRecallsModal: boolean; // Added for viewing recalls
  viewingRecallsVehicle: Vehicle | null;
  // Add enrichment tracking
  enrichingVehicles: Set<string>; // Track vehicles being enriched
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
};

const useVehicleManager = () => {
  const [state, setState] = useState<VehicleManagerState>(initialState);
  const { t } = useTranslation(); // Get t function

  useEffect(() => {
    const loadedVehicles = loadVehiclesFromStorage();
    const loadedSelectedVehicleId = loadSelectedVehicleIdFromStorage();
    
    if (loadedVehicles.length > 0) {
      setState(prev => ({ ...prev, vehicles: loadedVehicles }));
      if (loadedSelectedVehicleId && loadedVehicles.find(v => v.id === loadedSelectedVehicleId)) {
        setState(prev => ({ ...prev, selectedVehicleId: loadedSelectedVehicleId }));
      } else if (loadedVehicles.length > 0) {
        setState(prev => ({ ...prev, selectedVehicleId: loadedVehicles[0].id }));
      }
    }
  }, []);

  useEffect(() => {
    saveVehiclesToStorage(state.vehicles);
    saveSelectedVehicleIdToStorage(state.selectedVehicleId);
  }, [state.vehicles, state.selectedVehicleId]);

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

      // Ensure task.title is treated as a translation key
      const titleKey = task.title || "task.defaultScheduledMaintenance";

      return {
        id,
        ...task,
        title: titleKey, // Store the key
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
      const newVehicle: Vehicle = {
        id: self.crypto.randomUUID(),
        ...baseVehicleData,
        maintenanceSchedule: [],
        imageId: vehicleData.imageId,
        recalls: recalls || [],
      };
      const completedInitialTasks = (initialMaintenanceTasks || []).map(task => ({
        ...task,
        id: task.id || self.crypto.randomUUID(),
        creationDate: task.creationDate || getISODateString(),
        status: TaskStatus.Completed,
      }));
      // Fetch baseline schedule from backend
      let baselineSchedule: BaselineTask[] = [];
      try {
        const baselineResponse = await enrichBaselineSchedule(newVehicle.make, newVehicle.model, newVehicle.year);
        baselineSchedule = baselineResponse.schedule || [];
      } catch (error) {
        console.warn('Failed to fetch baseline schedule, using empty array:', error);
        baselineSchedule = [];
      }
      // Fetch forecasted schedule from backend
      const forecastedSchedule = await fetchForecastedSchedule(newVehicle, completedInitialTasks, baselineSchedule);
      newVehicle.maintenanceSchedule = forecastedSchedule;
      setState(prev => ({
        ...prev,
        vehicles: [...prev.vehicles, newVehicle],
        selectedVehicleId: prev.vehicles.length === 0 ? newVehicle.id : prev.selectedVehicleId || newVehicle.id,
        isLoading: false,
        showAddVehicleModal: false,
      }));
    } catch (error) {
      console.error("Error adding vehicle:", error);
      setState(prev => ({ ...prev, isLoading: false, error: "errors.addVehicleFailed" }));
    }
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setState(prev => {
      const updatedVehicles = prev.vehicles.filter(v => v.id !== vehicleId);
      let newSelectedId = prev.selectedVehicleId;
      if (prev.selectedVehicleId === vehicleId) {
        newSelectedId = updatedVehicles.length > 0 ? updatedVehicles[0].id : null;
      }
      return { ...prev, vehicles: updatedVehicles, selectedVehicleId: newSelectedId };
    });
  };
  
  const handleSelectVehicle = (vehicleId: string) => {
    setState(prev => ({ ...prev, selectedVehicleId: vehicleId, error: null }));
  };

  const handleOpenAddTaskModal = (task?: MaintenanceTask) => {
    setState(prev => ({ ...prev, showAddTaskModal: true, editingTask: task || null, error: null }));
  };

  const handleUpsertTask = (taskData: MaintenanceTask) => {
    if (!state.selectedVehicleId) return;

    setState(prev => {
      const vehiclesCopy = [...prev.vehicles];
      const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
      if (vehicleIndex === -1) return prev;

      const vehicle = { ...vehiclesCopy[vehicleIndex] };
      let schedule = [...(vehicle.maintenanceSchedule || [])]; 

      const existingTaskIndex = schedule.findIndex(t => t.id === taskData.id);
      if (existingTaskIndex !== -1) {
        schedule[existingTaskIndex] = taskData;
      } else {
        schedule.push({ ...taskData, id: self.crypto.randomUUID(), creationDate: getISODateString() });
      }
      
      schedule = schedule.map(t => {
        if (t.status !== TaskStatus.Completed && t.status !== TaskStatus.Skipped && t.dueDate) {
          return { ...t, status: isDateOverdue(t.dueDate) ? TaskStatus.Overdue : TaskStatus.Upcoming };
        }
        return t;
      });

      vehicle.maintenanceSchedule = schedule;
      vehiclesCopy[vehicleIndex] = vehicle;

      return { ...prev, vehicles: vehiclesCopy, showAddTaskModal: false, editingTask: null };
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!state.selectedVehicleId) return;
    setState(prev => {
      const vehiclesCopy = [...prev.vehicles];
      const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
      if (vehicleIndex === -1) return prev;
      
      const vehicle = { ...vehiclesCopy[vehicleIndex] };
      vehicle.maintenanceSchedule = (vehicle.maintenanceSchedule || []).filter(t => t.id !== taskId);
      vehiclesCopy[vehicleIndex] = vehicle;
      return { ...prev, vehicles: vehiclesCopy };
    });
  };

  const handleToggleTaskStatus = (taskId: string, newStatus?: TaskStatus) => {
     if (!state.selectedVehicleId) return;
     setState(prev => {
        const vehiclesCopy = [...prev.vehicles];
        const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
        if (vehicleIndex === -1) return prev;

        const vehicle = { ...vehiclesCopy[vehicleIndex] };
        const schedule = [...(vehicle.maintenanceSchedule || [])];
        const taskIndex = schedule.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return prev;

        const task = { ...schedule[taskIndex] };
        if (newStatus) {
            task.status = newStatus;
        } else { 
            task.status = task.status === TaskStatus.Completed ? TaskStatus.Upcoming : TaskStatus.Completed;
        }
        
        if (task.status === TaskStatus.Completed) {
            task.completedDate = getISODateString();
        } else {
            task.completedDate = undefined;
            if (task.dueDate && isDateOverdue(task.dueDate)) {
                task.status = TaskStatus.Overdue;
            } else if (task.dueDate) {
                task.status = TaskStatus.Upcoming;
            } else { 
                 task.status = TaskStatus.InProgress; 
            }
        }
        schedule[taskIndex] = task;
        vehicle.maintenanceSchedule = schedule;
        vehiclesCopy[vehicleIndex] = vehicle;
        return { ...prev, vehicles: vehiclesCopy };
     });
  };
  
  const handleFileUpload = async (file: File, taskId: string, type: 'photo' | 'receipt'): Promise<FileAttachment | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const newAttachment: FileAttachment = {
          id: self.crypto.randomUUID(),
          name: file.name,
          url: url,
          type: file.type,
          uploadedDate: getISODateString(),
        };

        if (!state.selectedVehicleId) {
          resolve(null);
          return;
        }

        setState(prev => {
          const vehiclesCopy = [...prev.vehicles];
          const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
          if (vehicleIndex === -1) return prev;

          const vehicle = { ...vehiclesCopy[vehicleIndex] };
          const schedule = [...(vehicle.maintenanceSchedule || [])];
          const taskIndex = schedule.findIndex(t => t.id === taskId);
          if (taskIndex === -1) return prev;

          const task = { ...schedule[taskIndex] };
          if (type === 'photo') {
            task.photos = [...(task.photos || []), newAttachment];
          } else {
            task.receipts = [...(task.receipts || []), newAttachment];
          }
          schedule[taskIndex] = task;
          vehicle.maintenanceSchedule = schedule;
          vehiclesCopy[vehicleIndex] = vehicle;
          return { ...prev, vehicles: vehiclesCopy };
        });
        resolve(newAttachment);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const handleOCRReceipt = async (file: File, taskId: string): Promise<ExtractedReceiptInfo | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
        const extractedInfo = await ocrReceiptWithGemini(file);

        if (extractedInfo && state.selectedVehicleId) {
             setState(prev => {
                const vehiclesCopy = [...prev.vehicles];
                const vehicleIndex = vehiclesCopy.findIndex(v => v.id === prev.selectedVehicleId);
                if (vehicleIndex === -1) return { ...prev, isLoading: false };

                const vehicle = { ...vehiclesCopy[vehicleIndex] };
                const schedule = [...(vehicle.maintenanceSchedule || [])];
                const taskIndex = schedule.findIndex(t => t.id === taskId);
                if (taskIndex === -1) return { ...prev, isLoading: false };

                const task = { ...schedule[taskIndex] };
                
                if (extractedInfo.taskName) {
                    const commonTaskMatch = COMMON_MAINTENANCE_PRESETS.find(p =>
                        t(p.title).toLowerCase() === extractedInfo.taskName!.toLowerCase() ||
                        p.key.toLowerCase().replace('_', ' ') === extractedInfo.taskName!.toLowerCase()
                    );
                    if (commonTaskMatch) {
                        task.title = commonTaskMatch.title; // Use the translation key
                        task.category = commonTaskMatch.category;
                    } else {
                        task.title = extractedInfo.taskName; // Use the raw extracted name
                        // Simple category guessing if not matched, can be expanded
                        if (extractedInfo.taskName.toLowerCase().includes("oil")) task.category = TaskCategory.OilChange;
                        else if (extractedInfo.taskName.toLowerCase().includes("tire")) task.category = TaskCategory.TireRotation;
                        else if (extractedInfo.taskName.toLowerCase().includes("brake")) task.category = TaskCategory.BrakeService;
                    }
                }
                
                task.completedDate = extractedInfo.date || task.completedDate || getISODateString();
                task.cost = extractedInfo.cost !== undefined ? extractedInfo.cost : task.cost;
                
                const ocrNotesContent: string[] = [];
                if (extractedInfo.notes) ocrNotesContent.push(`${t('ocr.ocrInfo')}: ${extractedInfo.notes}`);
                if (extractedInfo.items && extractedInfo.items.length > 0) ocrNotesContent.push(`${t('ocr.ocrInfoItems')}: ${extractedInfo.items.join(', ')}`);
                
                if (ocrNotesContent.length > 0) {
                    task.notes = (task.notes ? `${task.notes}\n` : '') + ocrNotesContent.join('\n');
                }

                task.status = TaskStatus.Completed; 

                schedule[taskIndex] = task;
                vehicle.maintenanceSchedule = schedule;
                vehiclesCopy[vehicleIndex] = vehicle;
                return { ...prev, vehicles: vehiclesCopy, isLoading: false };
             });
        } else {
             setState(prev => ({ ...prev, isLoading: false, error: "errors.ocrFailed" }));
        }
        return extractedInfo;

    } catch (error) {
        console.error("Error during OCR processing:", error);
        setState(prev => ({ ...prev, isLoading: false, error: "errors.ocrFailed" })); 
        return null;
    }
  };

  const handleOpenEditVehicleModal = (vehicle: Vehicle) => {
    setState(prev => ({ ...prev, showEditVehicleModal: true, editingVehicle: vehicle, error: null }));
  };

  const handleUpdateVehicle = (updatedVehicleData: Partial<Vehicle> & { id: string }) => {
    setState(prev => {
      const vehiclesCopy = [...prev.vehicles];
      const vehicleIndex = vehiclesCopy.findIndex(v => v.id === updatedVehicleData.id);
      if (vehicleIndex === -1) return { ...prev, error: "errors.vehicleNotFoundUpdate" }; 

      vehiclesCopy[vehicleIndex] = { ...vehiclesCopy[vehicleIndex], ...updatedVehicleData };
      return { ...prev, vehicles: vehiclesCopy, showEditVehicleModal: false, editingVehicle: null };
    });
  };

  const handleUpdateVehiclePhoto = (vehicleId: string, imageId: string) => {
    setState(prev => {
      const vehiclesCopy = [...prev.vehicles];
      const vehicleIndex = vehiclesCopy.findIndex(v => v.id === vehicleId);
      if (vehicleIndex === -1) return prev; 
      vehiclesCopy[vehicleIndex] = { ...vehiclesCopy[vehicleIndex], imageId };
      return { ...prev, vehicles: vehiclesCopy };
    });
  };

  const handleOpenViewRecallsModal = () => {
    setState(prev => ({ ...prev, showViewRecallsModal: true }));
  };

  const handleCloseViewRecallsModal = () => {
    setState(prev => ({ ...prev, showViewRecallsModal: false }));
  };

  // Helper functions for enrichment tracking
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
      return {
        ...prev,
        enrichingVehicles: newEnrichingVehicles
      };
    });
  };

  const isEnriching = (vehicleId: string) => {
    return state.enrichingVehicles.has(vehicleId);
  };

  // Computed properties
  const selectedVehicle = state.selectedVehicleId 
    ? state.vehicles.find(v => v.id === state.selectedVehicleId) || null 
    : null;

  return {
    // State
    vehicles: state.vehicles,
    selectedVehicleId: state.selectedVehicleId,
    selectedVehicle,
    isLoading: state.isLoading,
    error: state.error,
    
    // State setter
    setState,
    
    // Modal states
    showAddVehicleModal: state.showAddVehicleModal,
    showEditVehicleModal: state.showEditVehicleModal,
    editingVehicle: state.editingVehicle,
    showAddTaskModal: state.showAddTaskModal,
    editingTask: state.editingTask,
    showViewRecallsModal: state.showViewRecallsModal,
    viewingRecallsVehicle: state.viewingRecallsVehicle,
    
    // Enrichment tracking
    enrichingVehicles: state.enrichingVehicles,
    
    // Actions
    handleAddVehicle,
    handleUpdateVehicle,
    handleDeleteVehicle,
    handleSelectVehicle,
    handleOpenAddTaskModal,
    handleUpsertTask,
    handleDeleteTask,
    handleToggleTaskStatus,
    handleFileUpload,
    handleOCRReceipt,
    handleOpenEditVehicleModal, 
    handleOpenViewRecallsModal,
    handleCloseViewRecallsModal,
    handleUpdateVehiclePhoto, 
    
    // Modal handlers
    handleOpenAddVehicleModal: () => setState(prev => ({ ...prev, showAddVehicleModal: true, error: null })),
    handleCloseAddVehicleModal: () => setState(prev => ({ ...prev, showAddVehicleModal: false })),
    handleCloseEditVehicleModal: () => setState(prev => ({ ...prev, showEditVehicleModal: false, editingVehicle: null })),
    handleCloseAddTaskModal: () => setState(prev => ({ ...prev, showAddTaskModal: false, editingTask: null })),
    
    // Enrichment helpers
    startEnrichment,
    stopEnrichment,
    isEnriching,
  };
};

export default useVehicleManager;

export const mergeBaselineSchedule = (vehicle: Vehicle, baselineTasks: BaselineTask[]): Vehicle => {
  const existingTasks = vehicle.maintenanceSchedule || [];
  const existingKeys = new Set(existingTasks.map(t => `${t.title}|${t.category}|${t.dueMileage}`));
  
  const milesPerYear = 12000;
  const monthsPerMile = 12 / milesPerYear;
  const newTasks: MaintenanceTask[] = (baselineTasks || []).map((task: BaselineTask) => {
    // Calculate dueMileage and dueDate
    let dueMileage = task.intervalMileage || (task.interval_km ? task.interval_km * 0.621371 : undefined);
    let dueDate: string | undefined;
    
    if (task.intervalMileage && vehicle.currentMileage && vehicle.currentMileage < task.intervalMileage) {
      const milesRemaining = task.intervalMileage - vehicle.currentMileage;
      const monthsFromNowMileage = Math.max(1, Math.ceil(milesRemaining * monthsPerMile));
      const mileageBasedDueDate = addMonths(new Date(), monthsFromNowMileage);
      
      if (task.intervalMonths) {
        const monthBasedDueDate = addMonths(new Date(), task.intervalMonths);
        dueDate = getISODateString(mileageBasedDueDate < monthBasedDueDate ? mileageBasedDueDate : monthBasedDueDate);
      } else {
        dueDate = getISODateString(mileageBasedDueDate);
      }
    } else if (task.intervalMonths) {
      dueDate = getISODateString(addMonths(new Date(), task.intervalMonths));
      if (task.intervalMileage) { 
        dueMileage = (vehicle.currentMileage || 0) + task.intervalMileage; 
      }
    }
    
    const status = (dueDate && isDateOverdue(dueDate)) ? TaskStatus.Overdue : TaskStatus.Upcoming;
    const _key = `${task.item}|${task.category}|${dueMileage}`;
    return {
      id: self.crypto.randomUUID(),
      title: task.item || 'task.defaultScheduledMaintenance',
      category: task.category as TaskCategory || TaskCategory.Other,
      importance: TaskImportance.Recommended,
      status,
      dueDate,
      dueMileage,
      creationDate: getISODateString(),
      isRecurring: true,
      recurrenceInterval: `${task.intervalMileage ? task.intervalMileage + ' miles' : ''}${task.intervalMileage && task.intervalMonths ? ' / ' : ''}${task.intervalMonths ? task.intervalMonths + ' months' : ''}`,
    } as MaintenanceTask;
  }).filter(task => !existingKeys.has(`${task.title}|${task.category}|${task.dueMileage}`));
  
  return {
    ...vehicle,
    maintenanceSchedule: [...existingTasks, ...newTasks]
  };
};

// Helper to fetch forecasted schedule from backend
export async function fetchForecastedSchedule(vehicle: Vehicle, completedTasks: MaintenanceTask[], baselineSchedule: BaselineTask[]): Promise<MaintenanceTask[]> {
  try {
    console.log('[FRONTEND] Fetching forecast for vehicle:', vehicle.make, vehicle.model, vehicle.year);
    console.log('[FRONTEND] Current mileage:', vehicle.currentMileage);
    console.log('[FRONTEND] Baseline schedule items:', baselineSchedule.length);
    
    const response = await fetch(buildApiUrl('/generateForecastSchedule'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vehicle: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          currentMileage: vehicle.currentMileage || 0,
          purchaseDate: vehicle.purchaseDate,
        },
        completedTasks: completedTasks.map(task => ({
          title: task.title,
          category: task.category,
          completedDate: task.completedDate,
          cost: task.cost,
        })),
        baselineSchedule: baselineSchedule.map(task => ({
          item: task.item,
          interval_km: task.interval_km,
          interval_months: task.interval_months,
          category: task.category,
          urgency: task.urgency,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[FRONTEND] Received response:', data);
    console.log('[FRONTEND] Response has schedule property:', !!data.schedule);
    console.log('[FRONTEND] Schedule is array:', Array.isArray(data.schedule));
    console.log('[FRONTEND] Schedule length:', data.schedule?.length || 0);
    
    if (!data.schedule || !Array.isArray(data.schedule) || data.schedule.length === 0) {
      console.warn('No schedule returned from backend, using baseline schedule with 20K limit');
      // Convert baseline schedule to maintenance tasks with 20K limit
      const currentMileage = vehicle.currentMileage || 0;
      const MAX_FORECAST_KM = 20000;
      const tasks: MaintenanceTask[] = [];
      
      for (const task of baselineSchedule) {
        let nextMileage = currentMileage + (task.interval_km || 0);
        
        // Only add tasks within 20K mileage limit
        while (nextMileage <= currentMileage + MAX_FORECAST_KM) {
          tasks.push({
            id: self.crypto.randomUUID(),
            title: task.item,
            category: task.category as TaskCategory || TaskCategory.Other,
            importance: task.urgency === 'High' ? TaskImportance.Required : task.urgency === 'Medium' ? TaskImportance.Recommended : TaskImportance.Optional,
            status: TaskStatus.Upcoming,
            dueDate: task.interval_months ? getISODateString(addMonths(new Date(), task.interval_months)) : undefined,
            dueMileage: nextMileage,
            creationDate: getISODateString(),
            isRecurring: true,
            isForecast: true,
            recurrenceInterval: `${task.interval_km ? task.interval_km + ' km' : ''}${task.interval_km && task.interval_months ? ' / ' : ''}${task.interval_months ? task.interval_months + ' months' : ''}`,
          });
          
          nextMileage += (task.interval_km || 0);
        }
      }
      
      console.log('[FRONTEND] Generated fallback tasks:', tasks.length);
      return tasks;
    }

    console.log('[FRONTEND] Using backend forecasted schedule:', data.schedule.length, 'tasks');
    return data.schedule;
  } catch (error) {
    console.error('Error fetching forecasted schedule:', error);
    // Use baseline schedule as fallback with 20K limit
    console.warn('Using baseline schedule as fallback due to error');
    const currentMileage = vehicle.currentMileage || 0;
    const MAX_FORECAST_KM = 20000;
    const tasks: MaintenanceTask[] = [];
    
    for (const task of baselineSchedule) {
      let nextMileage = currentMileage + (task.interval_km || 0);
      
      // Only add tasks within 20K mileage limit
      while (nextMileage <= currentMileage + MAX_FORECAST_KM) {
        tasks.push({
          id: self.crypto.randomUUID(),
          title: task.item,
          category: task.category as TaskCategory || TaskCategory.Other,
          importance: task.urgency === 'High' ? TaskImportance.Required : task.urgency === 'Medium' ? TaskImportance.Recommended : TaskImportance.Optional,
          status: TaskStatus.Upcoming,
          dueDate: task.interval_months ? getISODateString(addMonths(new Date(), task.interval_months)) : undefined,
          dueMileage: nextMileage,
          creationDate: getISODateString(),
          isRecurring: true,
          isForecast: true,
          recurrenceInterval: `${task.interval_km ? task.interval_km + ' km' : ''}${task.interval_km && task.interval_months ? ' / ' : ''}${task.interval_months ? task.interval_months + ' months' : ''}`,
        });
        
        nextMileage += (task.interval_km || 0);
      }
    }
    
    return tasks;
  }
}