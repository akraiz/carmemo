import { useState, useCallback, useRef } from 'react';
import { Vehicle, MaintenanceTask } from '../types';

interface DeletedItem<T> {
  item: T;
  deletedAt: Date;
  id: string;
}

interface UndoManagerState {
  deletedVehicles: DeletedItem<Vehicle>[];
  deletedTasks: DeletedItem<MaintenanceTask>[];
}

const UNDO_TIMEOUT = 30000; // 30 seconds to undo

export const useUndoManager = () => {
  const [state, setState] = useState<UndoManagerState>({
    deletedVehicles: [],
    deletedTasks: []
  });

  const cleanupTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addDeletedVehicle = useCallback((vehicle: Vehicle) => {
    const deletedItem: DeletedItem<Vehicle> = {
      item: vehicle,
      deletedAt: new Date(),
      id: vehicle.id
    };

    setState(prev => ({
      ...prev,
      deletedVehicles: [...prev.deletedVehicles, deletedItem]
    }));

    // Set cleanup timer
    const timer = setTimeout(() => {
      setState(prev => ({
        ...prev,
        deletedVehicles: prev.deletedVehicles.filter(v => v.id !== vehicle.id)
      }));
      cleanupTimers.current.delete(vehicle.id);
    }, UNDO_TIMEOUT);

    cleanupTimers.current.set(vehicle.id, timer);
  }, []);

  const addDeletedTask = useCallback((task: MaintenanceTask) => {
    const deletedItem: DeletedItem<MaintenanceTask> = {
      item: task,
      deletedAt: new Date(),
      id: task.id
    };

    setState(prev => ({
      ...prev,
      deletedTasks: [...prev.deletedTasks, deletedItem]
    }));

    // Set cleanup timer
    const timer = setTimeout(() => {
      setState(prev => ({
        ...prev,
        deletedTasks: prev.deletedTasks.filter(t => t.id !== task.id)
      }));
      cleanupTimers.current.delete(task.id);
    }, UNDO_TIMEOUT);

    cleanupTimers.current.set(task.id, timer);
  }, []);

  const undoVehicleDelete = useCallback((vehicleId: string) => {
    const deletedVehicle = state.deletedVehicles.find(v => v.id === vehicleId);
    if (!deletedVehicle) return null;

    // Clear the cleanup timer
    const timer = cleanupTimers.current.get(vehicleId);
    if (timer) {
      clearTimeout(timer);
      cleanupTimers.current.delete(vehicleId);
    }

    // Remove from deleted list
    setState(prev => ({
      ...prev,
      deletedVehicles: prev.deletedVehicles.filter(v => v.id !== vehicleId)
    }));

    return deletedVehicle.item;
  }, [state.deletedVehicles]);

  const undoTaskDelete = useCallback((taskId: string) => {
    const deletedTask = state.deletedTasks.find(t => t.id === taskId);
    if (!deletedTask) return null;

    // Clear the cleanup timer
    const timer = cleanupTimers.current.get(taskId);
    if (timer) {
      clearTimeout(timer);
      cleanupTimers.current.delete(taskId);
    }

    // Remove from deleted list
    setState(prev => ({
      ...prev,
      deletedTasks: prev.deletedTasks.filter(t => t.id !== taskId)
    }));

    return deletedTask.item;
  }, [state.deletedTasks]);

  const getDeletedVehicle = useCallback((vehicleId: string) => {
    return state.deletedVehicles.find(v => v.id === vehicleId);
  }, [state.deletedVehicles]);

  const getDeletedTask = useCallback((taskId: string) => {
    return state.deletedTasks.find(t => t.id === taskId);
  }, [state.deletedTasks]);

  const clearAllDeleted = useCallback(() => {
    // Clear all timers
    cleanupTimers.current.forEach(timer => clearTimeout(timer));
    cleanupTimers.current.clear();

    setState({
      deletedVehicles: [],
      deletedTasks: []
    });
  }, []);

  return {
    addDeletedVehicle,
    addDeletedTask,
    undoVehicleDelete,
    undoTaskDelete,
    getDeletedVehicle,
    getDeletedTask,
    clearAllDeleted,
    deletedVehicles: state.deletedVehicles,
    deletedTasks: state.deletedTasks
  };
}; 