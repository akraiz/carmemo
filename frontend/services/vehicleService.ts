import { Vehicle, MaintenanceTask } from '../types';
import { API_CONFIG, buildApiUrl, logApiCall, logApiResponse, logApiError } from '../config/api';
import { SessionService } from './sessionService';

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
    const sessionId = SessionService.getSessionId();
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
    const sessionId = SessionService.getSessionId();
    return this.makeRequest<VehicleResponse>(`/vehicles?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      body: JSON.stringify(vehicleData),
    });
  }

  /**
   * Get all vehicles
   */
  async getAllVehicles(): Promise<VehicleResponse> {
    const sessionId = SessionService.getSessionId();
    return this.makeRequest<VehicleResponse>(`/vehicles?sessionId=${encodeURIComponent(sessionId)}`);
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
    const sessionId = SessionService.getSessionId();
    return this.makeRequest<VehicleResponse>(`/vehicles/${id}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete vehicle
   */
  async deleteVehicle(id: string): Promise<VehicleResponse> {
    const sessionId = SessionService.getSessionId();
    return this.makeRequest<VehicleResponse>(`/vehicles/${id}?sessionId=${encodeURIComponent(sessionId)}`, {
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
}

// Export singleton instance
export const vehicleService = new VehicleService();

// Export the class for testing
export { VehicleService };