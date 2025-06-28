import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Vehicle, ExtractedReceiptInfo, RecallInfo } from '../types.js';
import { SaudiRecallManager } from './saudiRecallService.js';
import fs from 'fs';
import util from 'util';
import { CONFIG } from '../config.js';

let ai: GoogleGenAI | null = null;
const readFileAsync = util.promisify(fs.readFile);

export const initializeAIService = () => {
  // Enhanced debugging for API key validation
  console.log('[DEBUG] process.env Keys:');
  Object.entries(process.env).forEach(([k, v]) => {
    if (k.toLowerCase().includes('api')) {
      console.log(`🔑 ${k} = ${v?.slice(0, 6)}...`);
    }
  });
  console.log('🔍 AI Service Initialization Debug:');
  console.log('  - CONFIG.GOOGLE_AI_API_KEY:', CONFIG.GOOGLE_AI_API_KEY ? `[${CONFIG.GOOGLE_AI_API_KEY.substring(0, 10)}...]` : 'undefined');
  console.log('  - CONFIG.GOOGLE_AI_API_KEY length:', CONFIG.GOOGLE_AI_API_KEY.length);

  const apiKey = CONFIG.GOOGLE_AI_API_KEY.trim();
  console.log('  - Trimmed GOOGLE_AI_API_KEY length:', apiKey.length);
  console.log('  - GOOGLE_AI_API_KEY is truthy:', !!apiKey);

  if (apiKey && apiKey.length > 0) {
    try {
      ai = new GoogleGenAI({ apiKey });
      console.log('✅ Gemini AI service initialized successfully');
    } catch (e) {
      console.error('❌ Error initializing GoogleGenAI:', e);
      ai = null;
    }
  } else {
    if (!CONFIG.GOOGLE_AI_API_KEY) {
      console.warn('⚠️ GOOGLE_AI_API_KEY is not set. Gemini AI features will be disabled.');
    } else if (CONFIG.GOOGLE_AI_API_KEY.trim() === '') {
      console.warn('⚠️ GOOGLE_AI_API_KEY is empty or contains only whitespace. Gemini AI features will be disabled.');
    } else {
      console.warn('⚠️ GOOGLE_AI_API_KEY is not a string or is empty. Gemini AI features will be disabled.');
    }
    ai = null;
  }
};

export const decodeVinWithGemini = async (vinToDecode: string): Promise<Partial<Vehicle> | null> => {
  console.log(`[GEMINI] decodeVinWithGemini called for VIN: ${vinToDecode}`);
  if (!ai) {
    console.warn("Gemini AI service not initialized. VIN decoding with AI unavailable.");
    return null;
  }
  try {
    const prompt = `Decode this VIN: ${vinToDecode}. Provide Make, Model, Year, Trim, Engine Displacement (L), Cylinders, Drive Type, Primary Fuel Type, Secondary Fuel Type, Horsepower (HP), Transmission Style, Body Class, Doors, Manufacturer Name. Respond in JSON format. If a field is not available, use null or omit it. Example JSON: {\"make\": \"Toyota\", \"model\": \"Camry\", \"year\": 2020, ...}`;
    const response : GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    let jsonStr = response.text?.trim() || '';
    console.log(`[GEMINI] Raw AI response:`, jsonStr);
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[GEMINI] Failed to parse AI response as JSON:', parseErr, 'Raw:', jsonStr);
      return null;
    }
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
        console.warn("[GEMINI] VIN decoding: Missing essential fields (make, model, or year) after mapping.", decodedVehicle);
        return null; 
    }
    console.log('[GEMINI] Decoded vehicle:', decodedVehicle);
    return decodedVehicle; 
  } catch (error) {
    console.error("[GEMINI] Gemini VIN decoding error:", error);
    return null;
  }
};

export const getRecallsByVinWithGemini = async (vin: string, make?: string, model?: string): Promise<RecallInfo[] | null> => {
  // Only try to get real Saudi recall data
  try {
    console.log('Attempting to fetch real Saudi recall data...');
    const saudiRecalls = await SaudiRecallManager.getAllSaudiRecalls(vin, make, model);
    if (saudiRecalls.length > 0) {
      console.log(`Found ${saudiRecalls.length} real Saudi recalls for VIN: ${vin}`);
      // Convert SaudiRecallInfo to RecallInfo format
      const convertedRecalls: RecallInfo[] = saudiRecalls.map(recall => ({
        id: recall.id,
        component: recall.description || 'Unknown Component',
        summary: recall.description || 'No summary available',
        reportReceivedDate: recall.reportReceivedDate,
        nhtsaCampaignNumber: recall.reference
      }));
      return convertedRecalls;
    } else {
      console.log('No real Saudi recalls found for VIN:', vin);
      return [];
    }
  } catch (error) {
    console.warn('Saudi recall service unavailable:', error);
    return [];
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

export const getMaintenanceScheduleWithGemini = async ({ make, model, year }: { make: string, model: string, year: number }) => {
  if (!ai) {
    console.warn("Gemini AI service not initialized. Maintenance schedule generation unavailable.");
    return null;
  }
  try {
    const prompt = `Act as a vehicle maintenance expert. Generate a baseline maintenance schedule for:
Make: ${make}
Model: ${model}
Year: ${year}

Use manufacturer best practices and typical North American service intervals. Use these specific category values:
- "Oil Change" for engine oil and filter changes
- "Tire Rotation" for tire rotation and balancing
- "Brake Service" for brake inspections and maintenance
- "Air Filter" for engine and cabin air filter replacements
- "Engine Tune-Up" for spark plugs, ignition system
- "Transmission" for transmission fluid and filter services
- "Drivetrain" for differential, transfer case services
- "Suspension/Steering" for suspension and steering components
- "Cooling System" for coolant and cooling system services
- "HVAC" for heating, ventilation, air conditioning
- "Electrical" for electrical system components
- "Fuel System" for fuel filter and fuel system services
- "Exhaust" for exhaust system components
- "Chassis" for chassis and frame components
- "Exterior" for exterior body components
- "Filters" for various filter replacements
- "Fluids" for fluid checks and replacements
- "Safety" for safety-related inspections
- "General Inspection" for general vehicle inspections
- "Other" for miscellaneous services

Include JSON output like:

[{
  "item": "Engine Oil & Filter Change",
  "interval_km": 10000,
  "interval_months": 6,
  "category": "Oil Change",
  "urgency": "High"
}, {
  "item": "Tire Rotation",
  "interval_km": 10000,
  "interval_months": 6,
  "category": "Tire Rotation",
  "urgency": "Medium"
}, {
  "item": "Engine Air Filter Replacement",
  "interval_km": 20000,
  "interval_months": 12,
  "category": "Air Filter",
  "urgency": "Medium"
}]`;

    const response: GenerateContentResponse = await ai.models.generateContent({
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
    const schedule = JSON.parse(jsonStr);
    return {
      make,
      model,
      year,
      schedule
    };
  } catch (error) {
    console.error("Gemini maintenance schedule generation error:", error);
    return null;
  }
};

/**
 * Use Gemini to extract structured fields from OCR text (not image).
 * Returns: { title, date, cost, mileage, category, notes }
 */
export const ocrTextFieldsWithGemini = async (ocrText: string): Promise<any | null> => {
  if (!ai) {
    console.warn("Gemini AI service not initialized. OCR field extraction unavailable.");
    return null;
  }
  try {
    const prompt = `Extract the following fields from this vehicle maintenance receipt text.\n\n- Task title (e.g., Oil Change, Tire Rotation, Brake Service, Fluid Check, Battery Service, Engine Tune-Up, Air Filter, Wiper Blades, Inspection, Transmission, Drivetrain, Other)\n- Date (YYYY-MM-DD)\n- Cost (number)\n- Mileage (number)\n- Category (from: Oil Change, Tire Rotation, Brake Service, Fluid Check, Battery Service, Engine Tune-Up, Air Filter, Wiper Blades, Inspection, Transmission, Drivetrain, Other)\n- Notes (any extra info)\n\nOutput as JSON: { \"title\": \"...\", \"date\": \"...\", \"cost\": ..., \"mileage\": ..., \"category\": \"...\", \"notes\": \"...\" }\n\nReceipt text:\n${ocrText}`;
    const response: GenerateContentResponse = await ai.models.generateContent({
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
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error in ocrTextFieldsWithGemini:", error);
    return null;
  }
};

/**
 * Use Gemini Vision to extract structured fields directly from an uploaded image file.
 * Returns: { title, date, cost, mileage, category, notes }
 */
export const ocrImageFieldsWithGemini = async (file: Express.Multer.File): Promise<any | null> => {
  if (!ai) {
    console.warn("Gemini AI service not initialized. OCR field extraction unavailable.");
    return null;
  }
  try {
    const buffer = await readFileAsync(file.path);
    const base64Image = buffer.toString('base64');
    const imagePart = {
      inlineData: {
        mimeType: file.mimetype,
        data: base64Image,
      },
    };
    const textPart = {
      text: `Extract the following fields from this vehicle maintenance receipt image.\nIf any field is missing, unclear, or misread, try to infer or correct it based on context. If you are unsure, use null.\n- Task title (e.g., Oil Change, Tire Rotation, Brake Service, etc.)\n- Date (YYYY-MM-DD)\n- Cost (number)\n- Mileage (number)\n- Category (from: Oil Change, Tire Rotation, Brake Service, Fluid Check, Battery Service, Engine Tune-Up, Air Filter, Wiper Blades, Inspection, Transmission, Drivetrain, Other)\n- Notes (any extra info)\nOutput as JSON: { \"title\": \"...\", \"date\": \"...\", \"cost\": ..., \"mileage\": ..., \"category\": \"...\", \"notes\": \"...\" }`,
    };
    const response: GenerateContentResponse = await ai.models.generateContent({
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
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error in ocrImageFieldsWithGemini:", error);
    return null;
  }
};