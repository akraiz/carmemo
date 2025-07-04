import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Vehicle, ExtractedReceiptInfo, RecallInfo } from '../types';
import { SaudiRecallManager } from './saudiRecallService';
import { VAPID_PUBLIC_KEY } from '../constants';
import { setPushSubscription, getPushSubscription } from './localStorageService';
import { buildApiUrl } from '../config/api';

let ai: GoogleGenAI | null = null;

export const initializeAIService = () => {
  // Use Vite's import.meta.env for frontend environment variables
  const apiKey = import.meta.env.VITE_API_KEY;
  if (typeof apiKey === 'string' && apiKey) {
    try {
      ai = new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Error initializing GoogleGenAI:", e);
      ai = null;
    }
  } else {
    if (!apiKey) {
      console.warn("VITE_API_KEY environment variable not set. Gemini AI features will be disabled.");
    }
    ai = null; // Ensure ai is null if not initialized
  }
};

initializeAIService(); // Called at module load time

export const decodeVinWithGemini = async (vinToDecode: string): Promise<Partial<Vehicle> | null> => {
  if (!ai) {
    console.warn("Gemini AI service not initialized. VIN decoding with AI unavailable.");
    return null;
  }
  try {
    const prompt = `Decode this VIN: ${vinToDecode}. Provide Make, Model, Year, Trim, Engine Displacement (L), Cylinders, Drive Type, Primary Fuel Type, Secondary Fuel Type, Horsepower (HP), Transmission Style, Body Class, Doors, Manufacturer Name. Respond in JSON format. If a field is not available, use null or omit it. Example JSON: {"make": "Toyota", "model": "Camry", "year": 2020, "trim": "LE", "engineDisplacementL": "2.5L", "cylinders": 4, ...}`;
    const response : GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    let jsonStr = response.text?.trim() || '';
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Explicit mapping for robustness
    const decodedVehicle: Partial<Vehicle> = {
        vin: vinToDecode, // Always include the original VIN
        make: parsed.Make || parsed.make || undefined,
        model: parsed.Model || parsed.model || undefined,
        year: (parsed.Year || parsed.year) ? parseInt(String(parsed.Year || parsed.year), 10) : undefined,
        trim: parsed.Trim || parsed.trim || undefined,
        engineDisplacementL: parsed.engineDisplacementL || parsed['Engine Displacement (L)'] || parsed.engine_displacement_l || parsed.EngineDisplacementL || undefined,
        cylinders: (parsed.Cylinders || parsed.cylinders || parsed['Engine Number of Cylinders'] || parsed.EngineCylinders) ? parseInt(String(parsed.Cylinders || parsed.cylinders || parsed['Engine Number of Cylinders'] || parsed.EngineCylinders), 10) : undefined,
        driveType: parsed.driveType || parsed['Drive Type'] || parsed.drive_type || parsed.DriveType || undefined,
        primaryFuelType: parsed.primaryFuelType || parsed['Fuel Type - Primary'] || parsed.fuel_type_primary || parsed.PrimaryFuelType || undefined,
        secondaryFuelType: parsed.secondaryFuelType || parsed['Fuel Type - Secondary'] || parsed.fuel_type_secondary || parsed.SecondaryFuelType || undefined,
        engineBrakeHP: (parsed.Horsepower || parsed.horsepower || parsed.engineBrakeHP || parsed['Engine Brake (hp)'] || parsed.EngineBrakeHP) ? parseInt(String(parsed.Horsepower || parsed.horsepower || parsed.engineBrakeHP || parsed['Engine Brake (hp)'] || parsed.EngineBrakeHP), 10) : undefined,
        transmissionStyle: parsed.transmissionStyle || parsed['Transmission Style'] || parsed.transmission_style || parsed.TransmissionStyle || undefined,
        bodyClass: parsed.bodyClass || parsed['Body Class'] || parsed.body_class || parsed.BodyClass || undefined,
        doors: (parsed.Doors || parsed.doors) ? parseInt(String(parsed.Doors || parsed.doors), 10) : undefined,
        manufacturerName: parsed.manufacturerName || parsed['Manufacturer Name'] || parsed.manufacturer_name || parsed.ManufacturerName || undefined,
    };

    // Filter out undefined fields to keep the object clean
    Object.keys(decodedVehicle).forEach(key => {
      const typedKey = key as keyof Partial<Vehicle>;
      if (decodedVehicle[typedKey] === undefined) {
        delete decodedVehicle[typedKey];
      }
    });
    
    // Ensure essential fields (make, model, year) are present for the vehicle to be considered validly decoded
    if (!decodedVehicle.make || !decodedVehicle.model || !decodedVehicle.year) {
        console.warn("Gemini VIN decoding: Missing essential fields (make, model, or year) after mapping.", decodedVehicle);
        return null; 
    }
    
    return decodedVehicle; 
  } catch (error) {
    console.error("Gemini VIN decoding error:", error);
    return null;
  }
};

export const getRecallsByVinWithGemini = async (vin: string, make?: string, model?: string): Promise<RecallInfo[] | null> => {
  // ONLY fetch real Saudi recall data - no fallback to AI simulation for critical safety information
  try {
    console.log('Fetching real Saudi recall data from recalls.sa...');
    const saudiRecalls = await SaudiRecallManager.getAllSaudiRecalls(vin, make, model);
    
    if (saudiRecalls.length > 0) {
      console.log(`Found ${saudiRecalls.length} real Saudi recalls for VIN: ${vin}`);
      // Convert SaudiRecallInfo to RecallInfo
      const convertedRecalls: RecallInfo[] = saudiRecalls.map(saudiRecall => ({
        id: saudiRecall.id,
        consequence: saudiRecall.severity ? `Severity: ${saudiRecall.severity}` : undefined,
        remedy: saudiRecall.status ? `Status: ${saudiRecall.status}` : undefined,
        reportReceivedDate: saudiRecall.reportReceivedDate || saudiRecall.recallDate,
        nhtsaCampaignNumber: saudiRecall.reference,
      }));
      return convertedRecalls;
    } else {
      console.log('No real Saudi recalls found for VIN:', vin);
      return []; // Return empty array - no recalls found
    }
  } catch (error) {
    console.error('Error fetching Saudi recall data:', error);
    return []; // Return empty array on error - no simulated data
  }
};


export const ocrReceiptWithGemini = async (file: File): Promise<ExtractedReceiptInfo | null> => {
  if (!ai) {
      console.warn("Gemini AI service not initialized. OCR feature unavailable.");
      return null;
  }
  
  const reader = new FileReader();
  const fileDataPromise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
          if (typeof reader.result === 'string') {
              resolve(reader.result.split(',')[1]); 
          } else {
              reject(new Error("Failed to read file as base64 string."));
          }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
  });

  try {
    const base64Data = await fileDataPromise;

    const imagePart = {
        inlineData: {
            mimeType: file.type,
            data: base64Data,
        },
    };
    const textPart = {
        text: `Extract information from this receipt for a vehicle maintenance task. Provide: task name (e.g., "Oil Change", "Tire Rotation"), date (YYYY-MM-DD), total cost (number), list of item names or services, and any relevant notes. Format the output as a JSON object: {"taskName": "string", "date": "YYYY-MM-DD", "cost": number, "items": ["string"], "notes": "string"}. If data is unclear, use null for that field.`,
    };

    const response : GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: { parts: [imagePart, textPart] },
        config: { responseMimeType: "application/json" }
    });

    let jsonStr = response.text?.trim() || '';
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const extractedInfo = JSON.parse(jsonStr) as ExtractedReceiptInfo;
    return extractedInfo;
  } catch (error) {
    console.error("Error in ocrReceiptWithGemini:", error);
    return null;
  }
};

export const enrichBaselineSchedule = async (make: string, model: string, year: number) => {
  const response = await fetch(buildApiUrl('/enrich-baseline'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ make, model, year }),
  });
  if (!response.ok) throw new Error('Failed to fetch baseline schedule');
  return response.json();
};

// Utility to convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.');
  }
  // Register service worker
  const reg = await navigator.serviceWorker.register('/sw.js');
  // Check for existing subscription
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }
  setPushSubscription(sub);
  // Send to backend
  await fetch(buildApiUrl('/push/register'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subscription: sub })
  });
  return sub;
}
