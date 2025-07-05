import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMaintenanceScheduleWithGemini } from './aiService.js';
import { addMonths, isAfter, parseISO } from 'date-fns';
import crypto from 'crypto';
import { TaskCategory } from '../types.js';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.join(__dirname, '../baselineMaintenance.json');

// Add a simple Levenshtein distance function
function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function normalizeCategory(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const canonicalCategories = Object.values(TaskCategory);

// Smart category consolidation system
interface CategoryHierarchy {
  parent: string;
  children: string[];
  synonyms: string[];
  keywords: string[];
}

const CATEGORY_HIERARCHY: Record<string, CategoryHierarchy> = {
  'Engine': {
    parent: 'Engine',
    children: ['Engine/Air Intake', 'Engine/Ignition', 'Engine/Inspection', 'Engine Tune-Up'],
    synonyms: ['engine', 'motor', 'powerplant'],
    keywords: ['engine', 'tune', 'ignition', 'air intake', 'inspection']
  },
  'Brakes': {
    parent: 'Brakes',
    children: ['Brake Service', 'Brakes/Fluids'],
    synonyms: ['brake', 'braking', 'stopping'],
    keywords: ['brake', 'brakes', 'fluid']
  },
  'Tires': {
    parent: 'Tires',
    children: ['Tire Rotation', 'Tires/Suspension', 'Tires/Wheels', 'Wheels/Tires', 'Wheels & Tires'],
    synonyms: ['tire', 'tyre', 'wheel', 'wheels'],
    keywords: ['tire', 'wheel', 'suspension']
  },
  'Transmission': {
    parent: 'Transmission',
    children: ['Transmission/Fluids', 'Transmission/Inspection'],
    synonyms: ['transmission', 'gearbox', 'transaxle'],
    keywords: ['transmission', 'fluid', 'inspection']
  },
  'Drivetrain': {
    parent: 'Drivetrain',
    children: ['Drivetrain/Inspection'],
    synonyms: ['drivetrain', 'drive train', 'powertrain'],
    keywords: ['drivetrain', 'inspection']
  },
  'Suspension': {
    parent: 'Suspension/Steering',
    children: ['Suspension/Steering/Inspection'],
    synonyms: ['suspension', 'steering', 'chassis'],
    keywords: ['suspension', 'steering', 'inspection']
  },
  'Cooling': {
    parent: 'Cooling System',
    children: ['Cooling'],
    synonyms: ['cooling', 'radiator', 'thermostat'],
    keywords: ['cooling', 'radiator', 'thermostat']
  },
  'Electrical': {
    parent: 'Electrical',
    children: ['Electrical/Inspection'],
    synonyms: ['electrical', 'electric', 'battery'],
    keywords: ['electrical', 'battery', 'inspection']
  },
  'Fluids': {
    parent: 'Fluid Check',
    children: ['Fluids', 'Fluids/Inspection'],
    synonyms: ['fluid', 'lubricant', 'oil'],
    keywords: ['fluid', 'oil', 'lubricant']
  },
  'Filters': {
    parent: 'Air Filter',
    children: ['Filters'],
    synonyms: ['filter', 'air filter', 'cabin filter'],
    keywords: ['filter', 'air']
  },
  'Inspection': {
    parent: 'Inspection',
    children: ['General Inspection'],
    synonyms: ['inspection', 'check', 'examination'],
    keywords: ['inspection', 'check', 'examine']
  }
};

// Smart category consolidation function
function consolidateCategory(category: string): string {
  const normalized = normalizeCategory(category);
  
  // First, try exact matches with hierarchy
  for (const [parent, hierarchy] of Object.entries(CATEGORY_HIERARCHY)) {
    // Check if the category is a child of this parent
    if (hierarchy.children.some(child => normalizeCategory(child) === normalized)) {
      return parent;
    }
    
    // Check if the category matches the parent
    if (normalizeCategory(parent) === normalized) {
      return parent;
    }
    
    // Check synonyms
    if (hierarchy.synonyms.some(synonym => normalizeCategory(synonym) === normalized)) {
      return parent;
    }
    
    // Check keywords
    if (hierarchy.keywords.some(keyword => normalized.includes(normalizeCategory(keyword)))) {
      return parent;
    }
  }
  
  // If no consolidation found, return the original category
  return category;
}

// Enhanced category mapping with consolidation
export function mapCategoryToTaskCategory(baselineCategory: string): TaskCategory {
  if (!baselineCategory) return TaskCategory.Other;
  
  // First, try to consolidate the category
  const consolidatedCategory = consolidateCategory(baselineCategory);
  const normalized = normalizeCategory(consolidatedCategory);
  
  // 1. Exact match with consolidated categories
  for (const cat of canonicalCategories) {
    if (normalizeCategory(cat) === normalized) return cat as TaskCategory;
  }
  
  // 2. Check if consolidated category maps to a parent category
  for (const [parent, hierarchy] of Object.entries(CATEGORY_HIERARCHY)) {
    if (normalizeCategory(parent) === normalized) {
      // Map to the most appropriate TaskCategory
      const parentCategory = getParentTaskCategory(parent);
      if (parentCategory) return parentCategory;
    }
  }
  
  // 3. Fuzzy match (Levenshtein distance <= 2)
  let minDist = Infinity;
  let closest: string | null = null;
  for (const cat of canonicalCategories) {
    const dist = levenshtein(normalized, normalizeCategory(cat));
    if (dist < minDist) {
      minDist = dist;
      closest = cat;
    }
  }
  if (minDist <= 2 && closest) return closest as TaskCategory;
  
  // 4. Enhanced synonym mapping with consolidation
  const enhancedSynonymMap: Record<string, TaskCategory> = {
    oil: TaskCategory.OilChange,
    tire: TaskCategory.TireRotation,
    tires: TaskCategory.Tires,
    brake: TaskCategory.BrakeService,
    filter: TaskCategory.AirFilter,
    battery: TaskCategory.BatteryService,
    fluid: TaskCategory.FluidCheck,
    inspect: TaskCategory.Inspection,
    wiper: TaskCategory.WiperBlades,
    tune: TaskCategory.EngineTuneUp,
    engine: TaskCategory.EngineTuneUp, // Map engine-related to Engine Tune-Up
    transmission: TaskCategory.Other, // Will be handled by consolidation
    drivetrain: TaskCategory.Other, // Will be handled by consolidation
    suspension: TaskCategory.Other, // Will be handled by consolidation
    cooling: TaskCategory.Other, // Will be handled by consolidation
    electrical: TaskCategory.BatteryService, // Map to Battery Service as closest
    other: TaskCategory.Other,
  };
  
  for (const key in enhancedSynonymMap) {
    if (normalized.includes(key)) return enhancedSynonymMap[key];
  }
  
  // 5. Log unmapped category for admin review
  if (process.env.NODE_ENV !== 'production') {
    try {
      const scriptPath = path.join(__dirname, '../../../scripts/auto_add_category.js');
      const result = spawnSync('node', [scriptPath, baselineCategory], { stdio: 'inherit' });
      if (result.error) {
        console.warn(`[Category Mapping] Failed to auto-add category '${baselineCategory}':`, result.error);
      }
    } catch (err) {
      console.warn(`[Category Mapping] Exception while auto-adding category '${baselineCategory}':`, err);
    }
  } else {
    console.warn(`[Category Mapping] Unmapped category: '${baselineCategory}'. Consider adding to TaskCategory enum and translations.`);
  }
  
  return TaskCategory.Other;
}

// Helper function to get the appropriate TaskCategory for a parent category
function getParentTaskCategory(parent: string): TaskCategory | null {
  const parentMap: Record<string, TaskCategory> = {
    'Engine': TaskCategory.EngineTuneUp,
    'Brakes': TaskCategory.BrakeService,
    'Tires': TaskCategory.TireRotation,
    'Transmission': TaskCategory.Other, // Keep as Other for now
    'Drivetrain': TaskCategory.Other, // Keep as Other for now
    'Suspension': TaskCategory.Other, // Keep as Other for now
    'Cooling': TaskCategory.Other, // Keep as Other for now
    'Electrical': TaskCategory.BatteryService, // Map to Battery Service as closest
    'Fluids': TaskCategory.FluidCheck,
    'Filters': TaskCategory.AirFilter,
    'Inspection': TaskCategory.Inspection,
  };
  
  return parentMap[parent] || null;
}

export function normalizeKey(make: string, model: string, year: number): string {
  return `${make}_${model}_${year}`.toLowerCase().replace(/\s+/g, '_');
}

export function loadBaseline(): Record<string, any> {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
}

export function saveBaseline(data: Record<string, any>): void {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Add type for schedule item
interface GenericScheduleItem {
  id: string;
  item: string;
  interval_km: number;
  interval_months: number;
  category: string;
  urgency: string;
  due_km: number;
}

export function getGenericSchedule(make: string, model: string, year: number, currentMileage?: number): { make: string, model: string, year: number, schedule: GenericScheduleItem[] } {
  // Generic schedule: oil change every 10,000km, tire rotation every 10,000km, air filter every 20,000km, up to 300,000km or currentMileage+50k (all in kilometers)
  const maxKm = Math.max(currentMileage || 0, 300000);
  const schedule: GenericScheduleItem[] = [];
  for (let km = 10000; km <= maxKm; km += 10000) {
    schedule.push({
      id: crypto.randomUUID(),
      item: "Engine Oil & Filter",
      interval_km: 10000,
      interval_months: 6,
      category: "Oil Change", // Use proper TaskCategory value
      urgency: "High",
      due_km: km
    });
    schedule.push({
      id: crypto.randomUUID(),
      item: "Tire Rotation",
      interval_km: 10000,
      interval_months: 6,
      category: "Tire Rotation", // Use proper TaskCategory value
      urgency: "Medium",
      due_km: km
    });
    if (km % 20000 === 0) {
      schedule.push({
        id: crypto.randomUUID(),
        item: "Air Filter Replacement",
        interval_km: 20000,
        interval_months: 12,
        category: "Air Filter", // Use proper TaskCategory value
        urgency: "Medium",
        due_km: km
      });
    }
  }
  return { make, model, year, schedule };
}

export async function getOrCreateMaintenanceSchedule({ make, model, year, currentMileage }: { make: string, model: string, year: number, currentMileage?: number }): Promise<any> {
  const key = normalizeKey(make, model, year);
  let baseline = loadBaseline();
  if (baseline[key]) {
    const schedule = (baseline[key].schedule || []) as { interval_km?: number }[];
    const maxInterval = Math.max(...schedule.map((item: { interval_km?: number }) => item.interval_km || 0));
    if (currentMileage && maxInterval && currentMileage > maxInterval) {
      // Baseline is insufficient, fallback to AI or generic
      console.log(`[MAINTENANCE] Baseline insufficient for ${key}, generating extended schedule...`);
      // Only pass maxMileage if getMaintenanceScheduleWithGemini supports it
      const aiSchedule = await getMaintenanceScheduleWithGemini({ make, model, year });
      if (aiSchedule && aiSchedule.schedule && aiSchedule.schedule.length > 0) {
        baseline[key] = aiSchedule;
        saveBaseline(baseline);
        return aiSchedule;
      }
      // fallback to hardcoded generic schedule if AI fails
      return getGenericSchedule(make, model, year, currentMileage);
    }
    // Return existing baseline without logging
    return baseline[key];
  }
  // Not found: use Gemini to generate
  console.log(`[MAINTENANCE] No baseline for ${key}, calling Gemini AI...`);
  const aiSchedule = await getMaintenanceScheduleWithGemini({ make, model, year });
  if (aiSchedule && aiSchedule.schedule && aiSchedule.schedule.length > 0) {
    baseline[key] = aiSchedule;
    saveBaseline(baseline);
    console.log(`[MAINTENANCE] Saved new AI schedule for ${key}`);
    return aiSchedule;
  }
  console.log(`[MAINTENANCE] Gemini AI did not return a valid schedule for ${key}, using generic fallback.`);
  return getGenericSchedule(make, model, year, currentMileage);
}

export function generateForecastSchedule(vehicle: any, completedTasks: any[], baselineSchedule: any[]): any[] {
  // Helper: find last completion for a given item
  function findLastCompletion(itemName: string) {
    return completedTasks
      .filter(t => t.title === itemName && t.completedMileage != null && t.completedDate)
      .sort((a, b) => b.completedMileage - a.completedMileage || new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime())[0];
  }

  const currentMileage = vehicle.currentMileage || 0;
  const currentDate = vehicle.updatedAt || vehicle.createdAt || new Date().toISOString();
  const forecasted: any[] = [];
  const MAX_FORECAST_KM = 20000; // Maximum forecast distance in kilometers

  for (const base of baselineSchedule) {
    const last = findLastCompletion(base.item);
    let startMileage = last?.completedMileage ?? (vehicle.initialMileage || 0);
    let startDate = last?.completedDate ?? (vehicle.createdAt || new Date().toISOString());
    
    // Calculate next due mileage based on interval
    let nextMileage = startMileage + (base.interval_km || 0);
    
    // If the next due mileage is before current mileage, adjust it forward
    while (nextMileage <= currentMileage) {
      nextMileage += (base.interval_km || 0);
    }
    
    // Only generate forecasts up to MAX_FORECAST_KM from current mileage
    while (nextMileage <= currentMileage + MAX_FORECAST_KM) {
      const nextDate = base.interval_months ? addMonths(parseISO(startDate), Math.ceil((nextMileage - startMileage) / (base.interval_km || 1)) * base.interval_months) : null;
      const dueSoon = nextMileage - currentMileage <= 2000 || (nextDate && isAfter(nextDate, new Date(currentDate)) && (new Date(nextDate).getTime() - new Date(currentDate).getTime())/(1000*60*60*24) <= 60);
      
      // Create a unique ID for each task
      const taskId = crypto.randomUUID();
      
      forecasted.push({
        id: taskId,
        title: base.item,
        category: mapCategoryToTaskCategory(base.category || 'Other'),
        importance: base.urgency === 'High' ? 'Required' : base.urgency === 'Medium' ? 'Recommended' : 'Optional',
        status: 'Upcoming',
        dueDate: nextDate ? nextDate.toISOString().split('T')[0] : undefined,
        dueMileage: nextMileage,
        creationDate: new Date().toISOString(),
        isRecurring: true,
        isForecast: true,
        recurrenceInterval: `${base.interval_km ? base.interval_km + ' km' : ''}${base.interval_km && base.interval_months ? ' / ' : ''}${base.interval_months ? base.interval_months + ' months' : ''}`,
        urgencyBaseline: base.urgency,
        interval_km: base.interval_km,
        interval_months: base.interval_months,
      });
      
      nextMileage += (base.interval_km || 0);
    }
  }

  // Merge: avoid duplicates (by title and dueMileage/dueDate)
  const completedKeys = new Set(completedTasks.map(t => `${t.title}|${t.dueMileage}|${t.dueDate}`));
  const merged = [
    ...completedTasks.map(t => ({ 
      ...t, 
      isForecast: false,
      category: mapCategoryToTaskCategory(t.category || 'Other'),
      importance: t.importance || 'Recommended'
    })),
    ...forecasted.filter(f => !completedKeys.has(`${f.title}|${f.dueMileage}|${f.dueDate}`)),
  ];
  return merged;
}

// Utility: Estimate due date based on mileage
export function estimateDueDate(vehicle: any, task: any): string | undefined {
  if (!task.dueMileage || task.dueDate) return task.dueDate;
  const currentMileage = vehicle.currentMileage;
  const dueMileage = task.dueMileage;
  const updatedAt = vehicle.updatedAt || vehicle.createdAt || new Date();
  // Estimate average daily mileage (default 40km/day)
  const avgDailyMileage = 40;
  const kmToGo = dueMileage - currentMileage;
  if (kmToGo <= 0) return new Date().toISOString().split('T')[0];
  const daysToGo = Math.ceil(kmToGo / avgDailyMileage);
  const dueDate = new Date(new Date(updatedAt).getTime() + daysToGo * 24 * 60 * 60 * 1000);
  return dueDate.toISOString().split('T')[0];
}

// Universal enrichment utility for tasks
export function enrichTask(task: any, vehicle: any): any {
  const now = new Date().toISOString();
  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || '',
    category: mapCategoryToTaskCategory(task.category || task.title || 'Other'),
    status: task.status || 'Upcoming',
    dueMileage: task.dueMileage,
    dueDate: estimateDueDate(vehicle, task),
    creationDate: task.creationDate || now,
    importance: task.importance || 'Recommended',
    isRecurring: task.isRecurring ?? false,
    recurrenceInterval: task.recurrenceInterval,
    urgencyBaseline: task.urgencyBaseline,
    interval_km: task.interval_km,
    interval_months: task.interval_months,
    completedDate: (task.status === 'Completed' && !task.completedDate) ? now.split('T')[0] : task.completedDate,
    cost: task.cost,
    notes: task.notes,
    parts: task.parts,
    photos: task.photos,
    receipts: task.receipts,
    isForecast: task.isForecast,
    urgency: task.urgency,
    archived: task.archived,
    // ...any other fields
  };
} 