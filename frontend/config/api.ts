// API Configuration for Vehicle Management System
export const API_CONFIG = {
  // Backend API base URL - can be overridden by environment variable
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  
  // Whether to use backend APIs (default: true, can be overridden by environment variable)
  USE_BACKEND: import.meta.env.VITE_USE_BACKEND !== 'false',
  
  // Enable debug logging for API calls
  DEBUG: import.meta.env.VITE_DEBUG_API === 'true',
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
  
  // Retry configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Health check endpoint
export const HEALTH_CHECK_ENDPOINT = '/health';

// Vehicle management endpoints
export const VEHICLE_ENDPOINTS = {
  CREATE: '/vehicles',
  GET_ALL: '/vehicles',
  GET_BY_ID: (id: string) => `/vehicles/${id}`,
  GET_BY_VIN: (vin: string) => `/vehicles/vin/${vin}`,
  UPDATE: (id: string) => `/vehicles/${id}`,
  DELETE: (id: string) => `/vehicles/${id}`,
  SEARCH: '/vehicles/search',
  STATS: '/vehicles/stats',
  UPLOAD_IMAGE: (id: string) => `/vehicles/${id}/image`,
};

// Task management endpoints
export const TASK_ENDPOINTS = {
  ADD: (vehicleId: string) => `/tasks/${vehicleId}`,
  UPDATE: (vehicleId: string, taskId: string) => `/tasks/${vehicleId}/${taskId}`,
  DELETE: (vehicleId: string, taskId: string) => `/tasks/${vehicleId}/${taskId}`,
  GET: (vehicleId: string) => `/tasks/${vehicleId}`,
  UPLOAD_RECEIPT: (vehicleId: string) => `/tasks/${vehicleId}/upload-receipt`,
  OCR_COMPLETE: (vehicleId: string) => `/tasks/${vehicleId}/ocr-complete`,
};

// Maintenance schedule endpoints
export const MAINTENANCE_ENDPOINTS = {
  GET_SCHEDULE: '/maintenance-schedule',
  ENRICH_BASELINE: '/enrich-baseline',
  GENERATE_FORECAST: '/generateForecastSchedule',
};

// VIN and recall endpoints
export const VIN_ENDPOINTS = {
  LOOKUP: '/vin-lookup',
  RECALLS: (vin: string) => `/recall/${vin}`,
};

// Utility function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Utility function to log API calls in debug mode
export const logApiCall = (method: string, endpoint: string, data?: any) => {
  if (API_CONFIG.DEBUG) {
    console.log(`[API] ${method} ${endpoint}`, data ? { data } : '');
  }
};

// Utility function to log API responses in debug mode
export const logApiResponse = (method: string, endpoint: string, response: any) => {
  if (API_CONFIG.DEBUG) {
    console.log(`[API] ${method} ${endpoint} response:`, response);
  }
};

// Utility function to log API errors in debug mode
export const logApiError = (method: string, endpoint: string, error: any) => {
  if (API_CONFIG.DEBUG) {
    console.error(`[API] ${method} ${endpoint} error:`, error);
  }
}; 