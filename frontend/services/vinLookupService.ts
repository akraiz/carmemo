import { Vehicle } from '../types';
import { decodeVinWithGemini } from './aiService';

export interface VinLookupResponse {
  make: string;
  model: string;
  year: number;
  trim?: string;
  engine_displacement?: string;
  cylinders?: number;
  drive_type?: string;
  fuel_type?: string;
  transmission?: string;
  body_class?: string;
  doors?: number;
  manufacturer?: string;
  plant_country?: string;
  plant_state?: string;
  plant_city?: string;
  engine_model?: string;
  engine_configuration?: string;
  electrification_level?: string;
  gvwr?: string;
}

export interface VinLookupError {
  error: string;
  message: string;
}

// Define a VinResponse interface

/**
 * Decode VIN using API Ninjas service
 */
export const decodeVinWithApiNinjas = async (vinToDecode: string): Promise<Partial<Vehicle> | null> => {
  if (!vinToDecode || vinToDecode.length !== 17) {
    console.warn('Invalid VIN provided for decoding:', vinToDecode);
    return null;
  }

  try {
    console.log(`🔍 Decoding VIN with API Ninjas: ${vinToDecode}`);
    
    const response = await fetch('/api/vin-lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vin: vinToDecode }),
    });

    if (!response.ok) {
      const errorData: VinLookupError = await response.json();
      console.error('VIN lookup API error:', errorData);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data: VinLookupResponse = await response.json();
    
    // Map API Ninjas response to Vehicle interface
    const decodedVehicle: Partial<Vehicle> = {
      vin: vinToDecode,
      make: data.make || undefined,
      model: data.model || undefined,
      year: data.year || undefined,
      trim: data.trim || undefined,
      engineDisplacementL: data.engine_displacement || undefined,
      cylinders: data.cylinders || undefined,
      driveType: data.drive_type || undefined,
      primaryFuelType: data.fuel_type || undefined,
      transmissionStyle: data.transmission || undefined,
      bodyClass: data.body_class || undefined,
      doors: data.doors || undefined,
      manufacturerName: data.manufacturer || undefined,
      plantCountry: data.plant_country || undefined,
      plantState: data.plant_state || undefined,
      plantCity: data.plant_city || undefined,
      engineModel: data.engine_model || undefined,
      engineConfiguration: data.engine_configuration || undefined,
      electrificationLevel: data.electrification_level || undefined,
      gvwr: data.gvwr || undefined,
    };

    // Filter out undefined fields to keep the object clean
    Object.keys(decodedVehicle).forEach(key => {
      const typedKey = key as keyof Partial<Vehicle>;
      if (decodedVehicle[typedKey] === undefined) {
        delete decodedVehicle[typedKey];
      }
    });

    // Accept if year is present, even if make/model are missing
    if (!decodedVehicle.year) {
      console.warn("API Ninjas VIN decoding: Missing year after mapping.", decodedVehicle);
      return null;
    }

    console.log('✅ VIN decoded successfully:', decodedVehicle);
    return decodedVehicle;

  } catch (error) {
    console.error("API Ninjas VIN decoding error:", error);
    return null;
  }
};

/**
 * Validate VIN format
 */
export const validateVin = (vin: string): boolean => {
  if (!vin || typeof vin !== 'string') {
    return false;
  }
  
  // VIN should be exactly 17 characters
  if (vin.length !== 17) {
    return false;
  }
  
  // VIN should only contain alphanumeric characters (no I, O, Q)
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(vin.toUpperCase());
};

/**
 * Format VIN for display (add spaces for readability)
 */
export const formatVin = (vin: string): string => {
  if (!validateVin(vin)) {
    return vin;
  }
  
  // Add spaces every 4 characters for better readability
  return vin.toUpperCase().replace(/(.{4})/g, '$1 ').trim();
};

export const decodeVinMerged = async (vin: string): Promise<{ merged: Partial<Vehicle>, apiNinjas: Partial<Vehicle> | null, gemini: Partial<Vehicle> | null } | null> => {
  const [apiNinjasResult, geminiResult] = await Promise.allSettled([
    decodeVinWithApiNinjas(vin),
    decodeVinWithGemini(vin)
  ]);

  const apiNinjas = apiNinjasResult.status === 'fulfilled' ? apiNinjasResult.value : null;
  const gemini = geminiResult.status === 'fulfilled' ? geminiResult.value : null;

  if (!apiNinjas && !gemini) return null;

  // Helper to check for the premium placeholder
  const isPremiumPlaceholder = (val?: string) =>
    typeof val === 'string' && val.trim().toLowerCase().includes('only available for premium subscribers');

  // Helper to get the best value for a field
  const bestValue = (apiVal: any, geminiVal: any) => {
    if (apiVal && !isPremiumPlaceholder(apiVal)) return apiVal;
    if (typeof apiVal === 'number') return apiVal; // for year, etc.
    return geminiVal;
  };

  // Always use year from API Ninjas if present
  const merged: Partial<Vehicle> = {
    ...gemini,
    ...apiNinjas,
    year: apiNinjas?.year ?? gemini?.year,
    make: bestValue(apiNinjas?.make, gemini?.make),
    model: bestValue(apiNinjas?.model, gemini?.model),
    trim: bestValue(apiNinjas?.trim, gemini?.trim),
    driveType: bestValue(apiNinjas?.driveType, gemini?.driveType),
    primaryFuelType: bestValue(apiNinjas?.primaryFuelType, gemini?.primaryFuelType),
    bodyClass: bestValue(apiNinjas?.bodyClass, gemini?.bodyClass),
    manufacturerName: bestValue(apiNinjas?.manufacturerName, gemini?.manufacturerName),
    // Add similar logic for any other fields that may have the placeholder
  };

  return { merged, apiNinjas, gemini };
}; 