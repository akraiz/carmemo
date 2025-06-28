import { Vehicle } from '../models/Vehicle.js';
import { Vehicle as VehicleType } from '../types.js';
import { decodeVinMerged } from './vinLookupService.js';
import { getOrCreateMaintenanceSchedule } from './maintenanceScheduleService.js';
import { getRecallsByVinWithGemini } from './aiService.js';
import crypto from 'crypto';

export interface CreateVehicleRequest {
  make: string;
  model: string;
  year: number;
  vin: string;
  nickname?: string;
  currentMileage?: number;
  purchaseDate?: string;
  imageUrl?: string;
  // Additional fields from VIN decoding
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

export interface VehicleResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class VehicleService {
  /**
   * Synchronous: Validate, check, create, and save vehicle
   */
  static async createVehicleSync(vehicleData: CreateVehicleRequest): Promise<VehicleResponse> {
    // 1. Validate input
    if (!vehicleData.make || !vehicleData.model || !vehicleData.year || !vehicleData.vin) {
      return {
        success: false,
        error: 'Missing required fields: make, model, year, and vin are required'
      };
    }
    // 2. Check for duplicate VIN
    const existingVehicle = await Vehicle.findOne({ vin: vehicleData.vin });
    if (existingVehicle) {
      return {
        success: false,
        error: 'Vehicle with this VIN already exists'
      };
    }
    // 3. Validate year and mileage
    const currentYear = new Date().getFullYear();
    if (vehicleData.year < 1900 || vehicleData.year > currentYear + 1) {
      return {
        success: false,
        error: `Invalid year: must be between 1900 and ${currentYear + 1}`
      };
    }
    if (vehicleData.currentMileage !== undefined && vehicleData.currentMileage < 0) {
      return {
        success: false,
        error: 'Current mileage cannot be negative'
      };
    }
    // 4. Create a new Vehicle document (do not enrich yet)
    const vehicle = new Vehicle({
      ...vehicleData,
      maintenanceSchedule: [],
      recalls: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    // 5. Save the Vehicle to MongoDB
    await vehicle.save();
    // 6. Return a success response
    return {
      success: true,
      data: vehicle,
      message: 'Vehicle created successfully'
    };
  }

  /**
   * Asynchronous: Enrich and schedule vehicle (can be called in background)
   */
  static async enrichAndScheduleVehicleAsync(vehicleId: string): Promise<void> {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return;
    // 1. Optionally enrich data using VIN lookup if some fields are missing
    let enrichedData = {};
    if (!vehicle.get('trim') || !vehicle.get('driveType') || !vehicle.get('primaryFuelType')) {
      try {
        const vinData = await decodeVinMerged(vehicle.vin);
        if (vinData?.merged) {
          enrichedData = {
            ...vinData.merged,
            make: vehicle.make || vinData.merged.make || '',
            model: vehicle.model || vinData.merged.model || '',
            year: vehicle.year || vinData.merged.year || 0,
          };
        }
      } catch (err) {
        console.warn('VIN enrichment failed:', err);
      }
    }
    Object.assign(vehicle, enrichedData);
    // 2. Generate a maintenance schedule
    try {
      const maintenanceSchedule = await getOrCreateMaintenanceSchedule({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.currentMileage ?? undefined
      });
      // 3. Map the schedule to tasks and attach to the vehicle
      if (maintenanceSchedule && maintenanceSchedule.schedule) {
        // Coerce nulls to undefined for currentMileage
        if (vehicle.currentMileage === null) vehicle.currentMileage = undefined;
        vehicle.maintenanceSchedule = (maintenanceSchedule.schedule.map((item: any) => {
          const intervalKm = (item.interval_km !== null && item.interval_km !== undefined ? item.interval_km : undefined) as unknown as number | undefined;
          const intervalMonths = (item.interval_months !== null && item.interval_months !== undefined ? item.interval_months : undefined) as unknown as number | undefined;
          const currentMileage = (vehicle.currentMileage !== null && vehicle.currentMileage !== undefined ? vehicle.currentMileage : undefined) as unknown as number | undefined;
          const dueMileage = (currentMileage !== undefined && intervalKm !== undefined)
            ? (Number(currentMileage) + Number(intervalKm)) as unknown as number | undefined
            : undefined;
          return {
            id: crypto.randomUUID(),
            title: item.item,
            category: item.category || 'Other',
            status: 'Upcoming',
            dueMileage,
            dueDate: item.dueDate,
            importance: item.urgency === 'High' ? 'Required' : item.urgency === 'Medium' ? 'Recommended' : 'Optional',
            creationDate: new Date().toISOString(),
            isRecurring: true,
            recurrenceInterval: `${intervalKm ? intervalKm + ' km' : ''}${intervalKm && intervalMonths ? ' / ' : ''}${intervalMonths ? intervalMonths + ' months' : ''}`,
            urgencyBaseline: item.urgency,
            interval_km: typeof intervalKm === 'number' ? intervalKm : undefined,
            interval_months: typeof intervalMonths === 'number' ? intervalMonths : undefined,
          };
        }) as any);
        await vehicle.save();
      }
    } catch (scheduleError) {
      console.warn('Failed to generate maintenance schedule:', scheduleError);
    }
    // 4. Fetch and attach recalls
    try {
      const recalls = await getRecallsByVinWithGemini(vehicle.vin, vehicle.make, vehicle.model);
      if (recalls && recalls.length > 0) {
        (vehicle.recalls as any) = recalls;
        await vehicle.save();
      }
    } catch (recallError) {
      console.warn('Failed to fetch or save recalls:', recallError);
    }
    // After mapping, ensure no nulls in dueMileage
    vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.map((task: any) => ({
      ...task,
      dueMileage: task.dueMileage === null ? undefined : task.dueMileage
    })) as any;
  }

  /**
   * Standalone: Update vehicle schedule (can be called after task add/edit/complete)
   */
  static async updateVehicleSchedule(vehicleId: string): Promise<void> {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return;
    try {
      const maintenanceSchedule = await getOrCreateMaintenanceSchedule({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        currentMileage: vehicle.currentMileage ?? undefined
      });
      if (maintenanceSchedule && maintenanceSchedule.schedule) {
        vehicle.maintenanceSchedule = (maintenanceSchedule.schedule.map((item: any) => {
          const intervalKm = (item.interval_km !== null && item.interval_km !== undefined ? item.interval_km : undefined) as unknown as number | undefined;
          const intervalMonths = (item.interval_months !== null && item.interval_months !== undefined ? item.interval_months : undefined) as unknown as number | undefined;
          const currentMileage = (vehicle.currentMileage !== null && vehicle.currentMileage !== undefined ? vehicle.currentMileage : undefined) as unknown as number | undefined;
          const dueMileage = (currentMileage !== undefined && intervalKm !== undefined)
            ? (Number(currentMileage) + Number(intervalKm)) as unknown as number | undefined
            : undefined;
          return {
            id: crypto.randomUUID(),
            title: item.item,
            category: item.category || 'Other',
            status: 'Upcoming',
            dueMileage,
            dueDate: item.dueDate,
            importance: item.urgency === 'High' ? 'Required' : item.urgency === 'Medium' ? 'Recommended' : 'Optional',
            creationDate: new Date().toISOString(),
            isRecurring: true,
            recurrenceInterval: `${intervalKm ? intervalKm + ' km' : ''}${intervalKm && intervalMonths ? ' / ' : ''}${intervalMonths ? intervalMonths + ' months' : ''}`,
            urgencyBaseline: item.urgency,
            interval_km: typeof intervalKm === 'number' ? intervalKm : undefined,
            interval_months: typeof intervalMonths === 'number' ? intervalMonths : undefined,
          };
        }) as any);
        await vehicle.save();
      }
    } catch (scheduleError) {
      console.warn('Failed to update maintenance schedule:', scheduleError);
    }
  }

  /**
   * Main entry: createVehicle (calls sync, then triggers async)
   */
  static async createVehicle(vehicleData: CreateVehicleRequest): Promise<VehicleResponse> {
    const syncResult = await this.createVehicleSync(vehicleData);
    if (syncResult.success && syncResult.data && syncResult.data._id) {
      // Trigger async enrichment and schedule in background
      this.enrichAndScheduleVehicleAsync(syncResult.data._id.toString());
    }
    return syncResult;
  }

  /**
   * Get all vehicles
   */
  static async getAllVehicles(): Promise<VehicleResponse> {
    try {
      const vehicles = await Vehicle.find().sort({ createdAt: -1 });
      return {
        success: true,
        data: vehicles,
        message: `Found ${vehicles.length} vehicles`
      };
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get vehicle by ID
   */
  static async getVehicleById(id: string): Promise<VehicleResponse> {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Vehicle ID is required'
        };
      }

      const vehicle = await Vehicle.findById(id);
      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        };
      }

      return {
        success: true,
        data: vehicle,
        message: 'Vehicle found successfully'
      };
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get vehicle by VIN
   */
  static async getVehicleByVin(vin: string): Promise<VehicleResponse> {
    try {
      if (!vin) {
        return {
          success: false,
          error: 'VIN is required'
        };
      }

      const vehicle = await Vehicle.findOne({ vin });
      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        };
      }

      return {
        success: true,
        data: vehicle,
        message: 'Vehicle found successfully'
      };
    } catch (error) {
      console.error('Error fetching vehicle by VIN:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update vehicle
   */
  static async updateVehicle(updateData: UpdateVehicleRequest): Promise<VehicleResponse> {
    try {
      const { id, ...updateFields } = updateData;

      if (!id) {
        return {
          success: false,
          error: 'Vehicle ID is required'
        };
      }

      // Validate VIN if being updated
      if (updateFields.vin) {
        if (updateFields.vin.length !== 17) {
          return {
            success: false,
            error: 'Invalid VIN: must be exactly 17 characters long'
          };
        }

        // Check if VIN is already used by another vehicle
        const existingVehicle = await Vehicle.findOne({ 
          vin: updateFields.vin, 
          _id: { $ne: id } 
        });
        if (existingVehicle) {
          return {
            success: false,
            error: 'Vehicle with this VIN already exists'
          };
        }
      }

      // Validate year if being updated
      if (updateFields.year) {
        const currentYear = new Date().getFullYear();
        if (updateFields.year < 1900 || updateFields.year > currentYear + 1) {
          return {
            success: false,
            error: `Invalid year: must be between 1900 and ${currentYear + 1}`
          };
        }
      }

      // Validate mileage if being updated
      if (updateFields.currentMileage !== undefined && updateFields.currentMileage < 0) {
        return {
          success: false,
          error: 'Current mileage cannot be negative'
        };
      }

      // Update the vehicle
      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        id,
        {
          ...updateFields,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      if (!updatedVehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        };
      }

      return {
        success: true,
        data: updatedVehicle,
        message: 'Vehicle updated successfully'
      };

    } catch (error) {
      console.error('Error updating vehicle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete vehicle
   */
  static async deleteVehicle(id: string): Promise<VehicleResponse> {
    try {
      if (!id) {
        return {
          success: false,
          error: 'Vehicle ID is required'
        };
      }

      const vehicle = await Vehicle.findByIdAndDelete(id);
      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        };
      }

      return {
        success: true,
        data: { id },
        message: 'Vehicle deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting vehicle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Search vehicles by various criteria
   */
  static async searchVehicles(criteria: {
    make?: string;
    model?: string;
    year?: number;
    vin?: string;
    nickname?: string;
  }): Promise<VehicleResponse> {
    try {
      const query: any = {};

      if (criteria.make) {
        query.make = { $regex: criteria.make, $options: 'i' };
      }
      if (criteria.model) {
        query.model = { $regex: criteria.model, $options: 'i' };
      }
      if (criteria.year) {
        query.year = criteria.year;
      }
      if (criteria.vin) {
        query.vin = { $regex: criteria.vin, $options: 'i' };
      }
      if (criteria.nickname) {
        query.nickname = { $regex: criteria.nickname, $options: 'i' };
      }

      const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });

      return {
        success: true,
        data: vehicles,
        message: `Found ${vehicles.length} vehicles matching criteria`
      };

    } catch (error) {
      console.error('Error searching vehicles:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get vehicle statistics
   */
  static async getVehicleStats(): Promise<VehicleResponse> {
    try {
      const totalVehicles = await Vehicle.countDocuments();
      const vehiclesByMake = await Vehicle.aggregate([
        { $group: { _id: '$make', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      const vehiclesByYear = await Vehicle.aggregate([
        { $group: { _id: '$year', count: { $sum: 1 } } },
        { $sort: { _id: -1 } }
      ]);

      return {
        success: true,
        data: {
          totalVehicles,
          vehiclesByMake,
          vehiclesByYear
        },
        message: 'Vehicle statistics retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting vehicle stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
} 