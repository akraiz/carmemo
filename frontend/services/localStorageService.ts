import { Vehicle } from '../types';

const VEHICLES_KEY = 'autoLogVehicles';
const SELECTED_VEHICLE_ID_KEY = 'autoLogSelectedVehicleId';

export const loadVehiclesFromStorage = (): Vehicle[] => {
  const storedVehicles = localStorage.getItem(VEHICLES_KEY);
  if (storedVehicles) {
    try {
      const parsedVehicles = JSON.parse(storedVehicles) as Vehicle[];
      // Basic validation/migration: ensure maintenanceSchedule is an array
      return parsedVehicles.map(v => ({
        ...v,
        maintenanceSchedule: (Array.isArray(v.maintenanceSchedule) ? v.maintenanceSchedule : []).map(task => {
          // If a task is missing an id or has an empty id, generate one to guarantee uniqueness
          const hasValidId = typeof task.id === 'string' && task.id.trim().length > 0;
          return hasValidId ? task : { ...task, id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) };
        })
      }));
    } catch (e) {
      console.error("Failed to parse vehicles from localStorage", e);
      localStorage.removeItem(VEHICLES_KEY); // Clear corrupted data
      return [];
    }
  }
  return [];
};

export const saveVehiclesToStorage = (vehicles: Vehicle[]): void => {
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
};

export const loadSelectedVehicleIdFromStorage = (): string | null => {
  return localStorage.getItem(SELECTED_VEHICLE_ID_KEY);
};

export const saveSelectedVehicleIdToStorage = (vehicleId: string | null): void => {
  if (vehicleId) {
    localStorage.setItem(SELECTED_VEHICLE_ID_KEY, vehicleId);
  } else {
    localStorage.removeItem(SELECTED_VEHICLE_ID_KEY);
  }
};

export function getPushSubscription(): PushSubscription | null {
  const sub = localStorage.getItem('pushSubscription');
  return sub ? JSON.parse(sub) : null;
}

export function setPushSubscription(sub: PushSubscription) {
  localStorage.setItem('pushSubscription', JSON.stringify(sub));
}
