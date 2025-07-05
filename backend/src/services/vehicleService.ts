import { Vehicle } from '../models/Vehicle.js';
import { Vehicle as VehicleType, RecallInfo } from '../types.js';
import { decodeVinMerged } from './vinLookupService.js';
import { getOrCreateMaintenanceSchedule, mapCategoryToTaskCategory, estimateDueDate, enrichTask } from './maintenanceScheduleService.js';
import { getRecallsByVinWithGemini } from './aiService.js';
import crypto from 'crypto';

export interface CreateVehicleRequest {
  make: string;
  model: string;
  year: number;
  vin: string | null;
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
  recalls?: string[];
  sessionId?: string; // Session ID for user differentiation
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

// Utility to clean and ensure all tasks in a vehicle have a unique id
function cleanAndEnsureTaskIds(vehicle: any): boolean {
  let updated = false;
  if (Array.isArray(vehicle.maintenanceSchedule)) {
    // Remove empty/malformed tasks
    const originalLength = vehicle.maintenanceSchedule.length;
    vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.filter(
      (t: any) => t && typeof t === 'object' && Object.keys(t).length > 0 && t.title
    );
    if (vehicle.maintenanceSchedule.length !== originalLength) updated = true;
    // Ensure all valid tasks have an id
    vehicle.maintenanceSchedule.forEach((task: any) => {
      if (!task.id || typeof task.id !== 'string' || task.id.trim().length === 0) {
        task.id = crypto.randomUUID();
        updated = true;
      }
    });
  }
  return updated;
}

export class VehicleService {
  /**
   * Synchronous: Validate, check, create, and save vehicle
   */
  static async createVehicleSync(vehicleData: CreateVehicleRequest): Promise<VehicleResponse> {
    // 1. Validate input
    if (!vehicleData.make || !vehicleData.model || !vehicleData.year) {
      return {
        success: false,
        error: 'Missing required fields: make, model, and year are required'
      };
    }
    // 1.5. Normalize VIN: set to null if missing or empty string
    if (!vehicleData.vin || vehicleData.vin.trim() === '') {
      vehicleData.vin = null;
    }
    // 1.6. Validate VIN format/length if provided
    if (vehicleData.vin && vehicleData.vin.length !== 17) {
      return {
        success: false,
        error: 'Invalid VIN: must be exactly 17 characters long'
      };
    }
    // 2. Check for duplicate VIN only if VIN is a valid 17-character string
    if (typeof vehicleData.vin === 'string' && vehicleData.vin.trim().length === 17) {
      const existingVehicle = await Vehicle.findOne({ vin: vehicleData.vin, owner: vehicleData.sessionId || 'anonymous' });
      if (existingVehicle) {
        return {
          success: false,
          error: 'Vehicle with this VIN already exists'
        };
      }
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
    // 4. Fetch recalls only if VIN is provided and non-empty
    let recalls: RecallInfo[] = [];
    if (vehicleData.vin && vehicleData.vin.trim() !== '') {
      try {
        const fetchedRecalls = await getRecallsByVinWithGemini(vehicleData.vin || '', vehicleData.make || '', vehicleData.model || '');
        recalls = Array.isArray(fetchedRecalls)
          ? fetchedRecalls.map((recall) => ({
              id: recall.id || recall.reference || '',
              reference: recall.reference || recall.id || '',
              date: recall.date || '',
              brand: recall.brand || '',
              model: recall.model || '',
              status: recall.status || '',
              detailUrl: recall.detailUrl || '',
              reportReceivedDate: recall.reportReceivedDate || recall.date || '',
              nhtsaCampaignNumber: recall.nhtsaCampaignNumber || recall.reference || recall.id || '',
              // Add any extra fields from the API response if needed
              ...(recall.description ? { description: recall.description } : {}),
              ...(recall.severity ? { severity: recall.severity } : {}),
              ...(recall.source ? { source: recall.source } : {}),
            }))
          : [];
      } catch (err) {
        console.warn('Failed to fetch recalls for vehicle:', err);
        recalls = [];
      }
    }
    // 5. Create a new Vehicle document with fetched recalls
    const vehicle = new Vehicle({
      ...vehicleData,
      owner: vehicleData.sessionId || 'anonymous', // Use sessionId as owner
      maintenanceSchedule: [],
      recalls: recalls,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    // 6. Save the Vehicle to MongoDB
    try {
      await vehicle.save();
    } catch (err: any) {
      if (err.code === 11000) {
        return {
          success: false,
          error: 'Vehicle with this VIN already exists'
        };
      }
      throw err;
    }
    // 7. Return a success response
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
        const vinData = await decodeVinMerged(vehicle.vin || '');
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
          const dueMileage = (vehicle.currentMileage !== null && vehicle.currentMileage !== undefined && item.interval_km !== null && item.interval_km !== undefined)
            ? (Number(vehicle.currentMileage) + Number(item.interval_km)) : undefined;
          const tempTask = {
            id: crypto.randomUUID(),
            title: item.item,
            category: mapCategoryToTaskCategory(item.category || item.item || 'Other'),
            status: 'Upcoming',
            dueMileage,
            dueDate: undefined as string | undefined, // will be set below
            importance: item.urgency === 'High' ? 'Required' : item.urgency === 'Medium' ? 'Recommended' : 'Optional',
            creationDate: new Date().toISOString(),
            isRecurring: true,
            recurrenceInterval: `${item.interval_km ? item.interval_km + ' km' : ''}${item.interval_km && item.interval_months ? ' / ' : ''}${item.interval_months ? item.interval_months + ' months' : ''}`,
            urgencyBaseline: item.urgency,
            interval_km: typeof item.interval_km === 'number' ? item.interval_km : undefined,
            interval_months: typeof item.interval_months === 'number' ? item.interval_months : undefined,
          };
          tempTask.dueDate = estimateDueDate(vehicle, tempTask);
          // Use enrichTask to ensure all fields
          return enrichTask(tempTask, vehicle);
        }) as any);
        await vehicle.save();
      }
    } catch (scheduleError) {
      console.warn('Failed to generate maintenance schedule:', scheduleError);
    }
    vehicle.maintenanceSchedule = vehicle.maintenanceSchedule.map((task: any) => ({
      ...task,
      dueMileage: task.dueMileage === null ? undefined : task.dueMileage
    })) as any;
    // Clean and ensure all tasks have ids after enrichment
    if (cleanAndEnsureTaskIds(vehicle)) await vehicle.save();
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
          return {
            id: crypto.randomUUID(),
            title: item.item,
            category: item.category || 'Other',
            status: 'Upcoming',
            dueMileage: (vehicle.currentMileage !== null && vehicle.currentMileage !== undefined && item.interval_km !== null && item.interval_km !== undefined)
              ? (Number(vehicle.currentMileage) + Number(item.interval_km)) : undefined,
            dueDate: item.dueDate,
            importance: item.urgency === 'High' ? 'Required' : item.urgency === 'Medium' ? 'Recommended' : 'Optional',
            creationDate: new Date().toISOString(),
            isRecurring: true,
            recurrenceInterval: `${item.interval_km ? item.interval_km + ' km' : ''}${item.interval_km && item.interval_months ? ' / ' : ''}${item.interval_months ? item.interval_months + ' months' : ''}`,
            urgencyBaseline: item.urgency,
            interval_km: typeof item.interval_km === 'number' ? item.interval_km : undefined,
            interval_months: typeof item.interval_months === 'number' ? item.interval_months : undefined,
          };
        }) as any);
        await vehicle.save();
      }
    } catch (scheduleError) {
      console.warn('Failed to update maintenance schedule:', scheduleError);
    }
    // Clean and ensure all tasks have ids after update
    if (cleanAndEnsureTaskIds(vehicle)) await vehicle.save();
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
   * Get all vehicles for a specific session
   */
  static async getAllVehicles(sessionId?: string): Promise<VehicleResponse> {
    try {
      let query = {};
      if (sessionId) {
        query = { owner: sessionId };
      }
      
      const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });
      for (const vehicle of vehicles) {
        if (cleanAndEnsureTaskIds(vehicle)) await vehicle.save();
      }
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
      if (cleanAndEnsureTaskIds(vehicle)) await vehicle.save();
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
  static async getVehicleByVin(vin: string, sessionId?: string): Promise<VehicleResponse> {
    try {
      if (!vin) {
        return {
          success: false,
          error: 'VIN is required'
        };
      }
      // Filter by VIN and owner/sessionId if provided
      const query: any = { vin };
      if (sessionId) {
        query.owner = sessionId;
      }
      const vehicle = await Vehicle.findOne(query);
      if (!vehicle) {
        return {
          success: false,
          error: 'Vehicle not found'
        };
      }
      if (cleanAndEnsureTaskIds(vehicle)) await vehicle.save();
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

      // Normalize VIN: set to null if missing or empty string
      if (updateFields.vin === undefined || updateFields.vin === null || updateFields.vin === '') {
        updateFields.vin = null;
      }

      // Validate VIN if being updated
      if (updateFields.vin) {
        if (updateFields.vin.length !== 17) {
          return {
            success: false,
            error: 'Invalid VIN: must be exactly 17 characters long'
          };
        }

        // Get the owner/sessionId of the vehicle being updated
        const vehicleBeforeUpdate = await Vehicle.findById(id);
        if (!vehicleBeforeUpdate) {
          return {
            success: false,
            error: 'Vehicle not found'
          };
        }
        const owner = vehicleBeforeUpdate.owner;

        // Check if VIN is already used by another vehicle for the same owner (only if VIN is valid)
        if (typeof updateFields.vin === 'string' && updateFields.vin.trim().length === 17) {
          const existingVehicle = await Vehicle.findOne({ 
            vin: updateFields.vin, 
            owner: owner,
            _id: { $ne: id } 
          });
          if (existingVehicle) {
            return {
              success: false,
              error: 'Vehicle with this VIN already exists'
            };
          }
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

      // Fetch the latest vehicle data (before update) to determine VIN/make/model
      const vehicleBeforeUpdate = await Vehicle.findById(id);
      if (!vehicleBeforeUpdate) {
        return {
          success: false,
          error: 'Vehicle not found'
        };
      }

      // Determine the latest VIN, make, and model (from updateFields or existing)
      const vin = updateFields.vin || vehicleBeforeUpdate.vin;
      const make = updateFields.make || vehicleBeforeUpdate.make;
      const model = updateFields.model || vehicleBeforeUpdate.model;

      // Check if enrichment is needed
      const makeChanged = updateFields.make && updateFields.make !== vehicleBeforeUpdate.make;
      const modelChanged = updateFields.model && updateFields.model !== vehicleBeforeUpdate.model;
      const yearChanged = updateFields.year && updateFields.year !== vehicleBeforeUpdate.year;
      const shouldEnrich = makeChanged || modelChanged || yearChanged;

      // Always refetch recalls for the latest data
      let recalls: RecallInfo[] = [];
      try {
        const fetchedRecalls = await getRecallsByVinWithGemini(vin || '', make || '', model || '');
        recalls = Array.isArray(fetchedRecalls)
          ? fetchedRecalls.map((recall) => ({
              id: recall.id || recall.reference || '',
              reference: recall.reference || recall.id || '',
              date: recall.date || '',
              brand: recall.brand || '',
              model: recall.model || '',
              status: recall.status || '',
              detailUrl: recall.detailUrl || '',
              reportReceivedDate: recall.reportReceivedDate || recall.date || '',
              nhtsaCampaignNumber: recall.nhtsaCampaignNumber || recall.reference || recall.id || '',
              // Add any extra fields from the API response if needed
              ...(recall.description ? { description: recall.description } : {}),
              ...(recall.severity ? { severity: recall.severity } : {}),
              ...(recall.source ? { source: recall.source } : {}),
            }))
          : [];
      } catch (err) {
        console.warn('Failed to fetch recalls for vehicle update:', err);
        recalls = [];
      }

      // Update the vehicle, including the refreshed recalls
      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        id,
        {
          ...updateFields,
          recalls: recalls.map((recall) => ({
            id: recall.id || recall.reference || '',
            reference: recall.reference || recall.id || '',
            date: recall.date || '',
            brand: recall.brand || '',
            model: recall.model || '',
            status: recall.status || '',
            detailUrl: recall.detailUrl || '',
            reportReceivedDate: recall.reportReceivedDate || recall.date || '',
            nhtsaCampaignNumber: recall.nhtsaCampaignNumber || recall.reference || recall.id || '',
            // Add any extra fields from the API response if needed
            ...(recall.description ? { description: recall.description } : {}),
            ...(recall.severity ? { severity: recall.severity } : {}),
            ...(recall.source ? { source: recall.source } : {}),
          })),
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

      // Only enrich if make, model, or year changed
      if (shouldEnrich) {
        this.enrichAndScheduleVehicleAsync(id);
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
    sessionId?: string;
  }): Promise<VehicleResponse> {
    try {
      const query: any = {};

      // Filter by session ID if provided
      if (criteria.sessionId) {
        query.owner = criteria.sessionId;
      }

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
  static async getVehicleStats(sessionId?: string): Promise<VehicleResponse> {
    try {
      let matchStage = {};
      if (sessionId) {
        matchStage = { owner: sessionId };
      }

      const totalVehicles = await Vehicle.countDocuments(matchStage);
      const vehiclesByMake = await Vehicle.aggregate([
        { $match: matchStage },
        { $group: { _id: '$make', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      const vehiclesByYear = await Vehicle.aggregate([
        { $match: matchStage },
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