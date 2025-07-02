import { Vehicle } from '../types';
import { decodeVinWithGemini } from './aiService';
import { buildApiUrl } from '../config/api';

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
    
    const response = await fetch(buildApiUrl('/vin-lookup'), {
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

/**
 * Decode VIN using Gemini AI (calls backend)
 */
export const decodeVinWithGeminiBackend = async (vinToDecode: string): Promise<Partial<Vehicle> | null> => {
  if (!vinToDecode || vinToDecode.length !== 17) {
    console.warn('Invalid VIN provided for Gemini decoding:', vinToDecode);
    return null;
  }
  try {
    const response = await fetch(buildApiUrl('/vin-lookup-gemini'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vin: vinToDecode }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini VIN lookup API error:', errorData);
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Gemini VIN decoding error:', error);
    return null;
  }
};

/**
 * Merge VIN lookup results from API Ninjas and Gemini
 */
export const mergeVinResults = (vinNinjas: Partial<Vehicle> | null, vinGemini: Partial<Vehicle> | null): Partial<Vehicle> | null => {
  if (!vinNinjas && !vinGemini) return null;
  return {
    year: vinNinjas?.year ?? vinGemini?.year,
    make: vinNinjas?.make || vinGemini?.make,
    model: vinNinjas?.model || vinGemini?.model,
    trim: vinNinjas?.trim || vinGemini?.trim,
    engineDisplacementL: vinNinjas?.engineDisplacementL || vinGemini?.engineDisplacementL,
    cylinders: vinNinjas?.cylinders || vinGemini?.cylinders,
    driveType: vinNinjas?.driveType || vinGemini?.driveType,
    primaryFuelType: vinNinjas?.primaryFuelType || vinGemini?.primaryFuelType,
    secondaryFuelType: vinNinjas?.secondaryFuelType || vinGemini?.secondaryFuelType,
    engineBrakeHP: vinNinjas?.engineBrakeHP || vinGemini?.engineBrakeHP,
    transmissionStyle: vinNinjas?.transmissionStyle || vinGemini?.transmissionStyle,
    bodyClass: vinNinjas?.bodyClass || vinGemini?.bodyClass,
    doors: vinNinjas?.doors || vinGemini?.doors,
    manufacturerName: vinNinjas?.manufacturerName || vinGemini?.manufacturerName,
    plantCountry: vinNinjas?.plantCountry || vinGemini?.plantCountry,
    plantState: vinNinjas?.plantState || vinGemini?.plantState,
    plantCity: vinNinjas?.plantCity || vinGemini?.plantCity,
    engineModel: vinNinjas?.engineModel || vinGemini?.engineModel,
    engineConfiguration: vinNinjas?.engineConfiguration || vinGemini?.engineConfiguration,
    electrificationLevel: vinNinjas?.electrificationLevel || vinGemini?.electrificationLevel,
    gvwr: vinNinjas?.gvwr || vinGemini?.gvwr,
    vin: vinNinjas?.vin || vinGemini?.vin,
  };
};

export const decodeVinMerged = async (vin: string): Promise<{ merged: Partial<Vehicle>, apiNinjas: Partial<Vehicle> | null, gemini: null } | null> => {
  const apiNinjasResult = await decodeVinWithApiNinjas(vin);
  if (!apiNinjasResult) return null;
  return { merged: apiNinjasResult, apiNinjas: apiNinjasResult, gemini: null };
}; 