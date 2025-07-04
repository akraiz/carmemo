import { Vehicle } from '../types';
import { SessionService } from './sessionService';

const VEHICLES_KEY = 'autoLogVehicles';
const SELECTED_VEHICLE_ID_KEY = 'autoLogSelectedVehicleId';

export const loadVehiclesFromStorage = (): Vehicle[] => {
  const sessionKey = SessionService.getSessionKey(VEHICLES_KEY);
  const storedVehicles = localStorage.getItem(sessionKey);
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
        localStorage.removeItem(sessionKey); // Clear corrupted data
        return [];
      }
  }
  return [];
};

export const saveVehiclesToStorage = (vehicles: Vehicle[]): void => {
  const sessionKey = SessionService.getSessionKey(VEHICLES_KEY);
  localStorage.setItem(sessionKey, JSON.stringify(vehicles));
};

export const loadSelectedVehicleIdFromStorage = (): string | null => {
  const sessionKey = SessionService.getSessionKey(SELECTED_VEHICLE_ID_KEY);
  return localStorage.getItem(sessionKey);
};

export const saveSelectedVehicleIdToStorage = (vehicleId: string | null): void => {
  const sessionKey = SessionService.getSessionKey(SELECTED_VEHICLE_ID_KEY);
  if (vehicleId) {
    localStorage.setItem(sessionKey, vehicleId);
  } else {
    localStorage.removeItem(sessionKey);
  }
};

export function getPushSubscription(): PushSubscription | null {
  const sub = localStorage.getItem('pushSubscription');
  return sub ? JSON.parse(sub) : null;
}

export function setPushSubscription(sub: PushSubscription) {
  localStorage.setItem('pushSubscription', JSON.stringify(sub));
}
