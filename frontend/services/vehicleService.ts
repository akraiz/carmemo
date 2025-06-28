import { Vehicle, MaintenanceTask } from '../types';
import { API_CONFIG, buildApiUrl, logApiCall, logApiResponse, logApiError } from '../config/api';

// API Response interfaces
export interface VehicleResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface CreateVehicleRequest {
  make: string;
  model: string;
  year: number;
  vin: string;
  nickname?: string;
  currentMileage?: number;
  purchaseDate?: string;
  imageUrl?: string;
  trim?: string;
  driveType?: string;
  primaryFuelType?: string;
  secondaryFuelType?: string;
  engineBrakeHP?: number;
  engineDisplacementL?: string;
  transmissionStyle?: string;
  gvwr?: string;
  cylinders?: number;
  electrificationLevel?: string;
  engineModel?: string;
  bodyClass?: string;
  doors?: number;
  engineConfiguration?: string;
  manufacturerName?: string;
  plantCountry?: string;
  plantState?: string;
  plantCity?: string;
}

export interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> {
  id: string;
}

export interface SearchCriteria {
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  nickname?: string;
}

export interface VehicleStats {
  totalVehicles: number;
  vehiclesByMake: Array<{ _id: string; count: number }>;
  vehiclesByYear: Array<{ _id: number; count: number }>;
}

class VehicleService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = buildApiUrl(endpoint);
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Log the API call
    logApiCall(options.method || 'GET', endpoint, options.body ? JSON.parse(options.body as string) : undefined);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...finalOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Log the response
      logApiResponse(options.method || 'GET', endpoint, data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      // Log the error
      logApiError(options.method || 'GET', endpoint, error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${API_CONFIG.TIMEOUT}ms`);
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Create a new vehicle
   */
  async createVehicle(vehicleData: CreateVehicleRequest): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
  }

  /**
   * Get all vehicles
   */
  async getAllVehicles(): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>('/vehicles');
  }

  /**
   * Get vehicle by ID
   */
  async getVehicleById(id: string): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>(`/vehicles/${id}`);
  }

  /**
   * Get vehicle by VIN
   */
  async getVehicleByVin(vin: string): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>(`/vehicles/vin/${vin}`);
  }

  /**
   * Update vehicle
   */
  async updateVehicle(id: string, updateData: Partial<Vehicle>): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete vehicle
   */
  async deleteVehicle(id: string): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search vehicles
   */
  async searchVehicles(criteria: SearchCriteria): Promise<VehicleResponse> {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    return this.makeRequest<VehicleResponse>(`/vehicles/search?${params.toString()}`);
  }

  /**
   * Get vehicle statistics
   */
  async getVehicleStats(): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>('/vehicles/stats');
  }

  /**
   * Upload vehicle image (best practice: use fetch directly with FormData)
   */
  async uploadVehicleImage(id: string, file: File): Promise<VehicleResponse> {
    const formData = new FormData();
    formData.append('image', file);
    const url = buildApiUrl(`/vehicles/${id}/image`);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    return data;
  }

  /**
   * Add a task to a vehicle
   */
  async addTask(vehicleId: string, task: MaintenanceTask): Promise<VehicleResponse> {
    try {
      const response = await this.makeRequest<VehicleResponse>(`/tasks/${vehicleId}`, {
        method: 'POST',
        body: JSON.stringify(task),
      });
      
      // Update the task with the backend-generated id if needed
      if (response.success && response.data?.task) {
        return {
          ...response,
          data: response.data.task
        };
      }
      
      return response;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  async updateTask(vehicleId: string, taskId: string, task: Partial<MaintenanceTask>): Promise<VehicleResponse> {
    try {
      const response = await this.makeRequest<VehicleResponse>(`/tasks/${vehicleId}/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(task),
      });
      
      // Return the updated task data
      if (response.success && response.data?.task) {
        return {
          ...response,
          data: response.data.task
        };
      }
      
      return response;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(vehicleId: string, taskId: string): Promise<VehicleResponse> {
    try {
      const response = await this.makeRequest<VehicleResponse>(`/tasks/${vehicleId}/${taskId}`, {
        method: 'DELETE',
      });
      
      return response;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Upload receipt for a task
   */
  async uploadTaskReceipt(vehicleId: string, taskId: string, file: File): Promise<VehicleResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest<VehicleResponse>(`/tasks/${vehicleId}/upload-receipt`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
  }

  /**
   * Complete task via OCR
   */
  async completeTaskViaOCR(vehicleId: string, file: File): Promise<VehicleResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.makeRequest<VehicleResponse>(`/tasks/${vehicleId}/ocr-complete`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
  }

  /**
   * Get tasks for a vehicle with filters
   */
  async getTasks(vehicleId: string, filters?: {
    status?: string;
    category?: string;
    minMileage?: number;
    maxMileage?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<VehicleResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    return this.makeRequest<VehicleResponse>(`/tasks/${vehicleId}?${params.toString()}`);
  }

  /**
   * Generate forecast schedule
   */
  async generateForecastSchedule(vehicle: Vehicle, completedTasks: MaintenanceTask[], baselineSchedule: any[]): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>('/generateForecastSchedule', {
      method: 'POST',
      body: JSON.stringify({
        vehicle,
        completedTasks,
        baselineSchedule,
      }),
    });
  }

  /**
   * Get maintenance schedule
   */
  async getMaintenanceSchedule(make: string, model: string, year: number): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>('/maintenance-schedule', {
      method: 'POST',
      body: JSON.stringify({ make, model, year }),
    });
  }

  /**
   * Enrich baseline schedule
   */
  async enrichBaselineSchedule(make: string, model: string, year: number): Promise<VehicleResponse> {
    return this.makeRequest<VehicleResponse>('/enrich-baseline', {
      method: 'POST',
      body: JSON.stringify({ make, model, year }),
    });
  }

  /**
   * VIN lookup
   */
  async lookupVin(vin: string): Promise<any> {
    return this.makeRequest('/vin-lookup', {
      method: 'POST',
      body: JSON.stringify({ vin }),
    });
  }

  /**
   * Get recalls for a VIN
   */
  async getRecalls(vin: string): Promise<any> {
    return this.makeRequest(`/recall/${vin}`);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    // Health endpoint is at root level, not under /api
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    const url = `${baseUrl}/health`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Log the API call
    logApiCall('GET', '/health');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Log the response
      logApiResponse('GET', '/health', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      // Log the error
      logApiError('GET', '/health', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${API_CONFIG.TIMEOUT}ms`);
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }
}

// Export singleton instance
export const vehicleService = new VehicleService();

// Export the class for testing
export { VehicleService }; 