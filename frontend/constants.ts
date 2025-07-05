import { TaskCategory, TaskStatus, TaskImportance, MaintenanceTask } from './types';
import { Icons } from './components/Icon';

// APP_NAME is now a translation key: "app.name"

// New Dark Theme Optimized Status Colors (using Tailwind JIT for arbitrary values where needed)
// Backgrounds are subtly tinted versions of the main component background (#1c1c1c)
// Text colors are brighter for contrast on the dark backgrounds.
export const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string; pillBg: string; pillText: string }> = {
  [TaskStatus.Upcoming]:   { bg: "bg-[#1c1c1c] hover:bg-[#222222]", text: "text-[#FFD02F]",   border: "border-[#FFD02F]",   pillBg: "bg-[#FFD02F]/80",   pillText: "text-[#0f0f0f]" },
  [TaskStatus.Overdue]:     { bg: "bg-[#1c1c1c] hover:bg-[#222222]", text: "text-red-400",    border: "border-red-500",    pillBg: "bg-red-500/80",    pillText: "text-red-100" },
  [TaskStatus.Completed]:   { bg: "bg-[#1c1c1c] hover:bg-[#222222]", text: "text-green-400", border: "border-green-500", pillBg: "bg-green-500/80", pillText: "text-green-100" },
  [TaskStatus.Skipped]:     { bg: "bg-[#1c1c1c] hover:bg-[#222222]", text: "text-yellow-400", border: "border-yellow-500", pillBg: "bg-yellow-500/80", pillText: "text-yellow-100" },
  [TaskStatus.InProgress]:  { bg: "bg-[#1c1c1c] hover:bg-[#222222]", text: "text-indigo-400", border: "border-indigo-500", pillBg: "bg-indigo-500/80", pillText: "text-indigo-100" },
};

// New Dark Theme Optimized Importance Colors (using brighter borders, new accent)
export const TASK_IMPORTANCE_COLORS: Record<TaskImportance, string> = {
  [TaskImportance.Required]:    "border-s-4 border-red-500", 
  [TaskImportance.Recommended]: "border-s-4 border-[#F7C843]", // Primary Accent
  [TaskImportance.Optional]:    "border-s-4 border-sky-500", // Or a neutral like border-gray-500
};

// Canonical categories that match the backend TaskCategory enum
export const CANONICAL_TASK_CATEGORIES: TaskCategory[] = [
  TaskCategory.OilChange,
  TaskCategory.TireRotation,
  TaskCategory.BrakeService,
  TaskCategory.FluidCheck,
  TaskCategory.BatteryService,
  TaskCategory.EngineTuneUp,
  TaskCategory.AirFilter,
  TaskCategory.WiperBlades,
  TaskCategory.Inspection,
  TaskCategory.Tires,
  TaskCategory.Other,
];

// Use canonical categories for dropdowns and UI elements
export const TASK_CATEGORIES: TaskCategory[] = CANONICAL_TASK_CATEGORIES;
export const TASK_IMPORTANCES: TaskImportance[] = Object.values(TaskImportance);

export const MOCK_MANUFACTURER_SCHEDULES: Record<string, { intervalMileage: number; intervalMonths: number; task: Partial<MaintenanceTask> }[]> = {
  "DEFAULT": [
    { intervalMileage: 5000, intervalMonths: 6, task: { title: "taskPresets.oilChange.title", category: TaskCategory.OilChange, importance: TaskImportance.Required } },
    { intervalMileage: 7500, intervalMonths: 6, task: { title: "taskPresets.tireRotation.title", category: TaskCategory.TireRotation, importance: TaskImportance.Recommended } },
    { intervalMileage: 15000, intervalMonths: 12, task: { title: "taskPresets.airFilter.title", category: TaskCategory.AirFilter, importance: TaskImportance.Recommended } },
  ],
  "TOYOTA_CAMRY_2020": [ 
    { intervalMileage: 10000, intervalMonths: 12, task: { title: "taskPresets.oilChangeSynthetic.title", category: TaskCategory.OilChange, importance: TaskImportance.Required } },
    { intervalMileage: 5000, intervalMonths: 6, task: { title: "taskPresets.tireRotationInspection.title", category: TaskCategory.TireRotation, importance: TaskImportance.Recommended } },
  ]
};

// Static SVG placeholder for a generic car (new dark theme friendly)
export const DEFAULT_VEHICLE_IMAGE_URL = `data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%2060%22%3E%3Crect%20x%3D%2210%22%20y%3D%2220%22%20width%3D%2280%22%20height%3D%2230%22%20rx%3D%225%22%20fill%3D%22%23333333%22%2F%3E%3Crect%20x%3D%2220%22%20y%3D%2210%22%20width%3D%2260%22%20height%3D%2220%22%20rx%3D%223%22%20fill%3D%22%23505050%22%2F%3E%3Ccircle%20cx%3D%2228%22%20cy%3D%2250%22%20r%3D%227%22%20fill%3D%22%23606060%22%2F%3E%3Ccircle%20cx%3D%2272%22%20cy%3D%2250%22%20r%3D%227%22%20fill%3D%22%23606060%22%2F%3E%3C%2Fsvg%3E`;

export interface MaintenanceTaskPreset {
  key: string;
  title: string; 
  category: TaskCategory;
  iconName: string; 
}

export const COMMON_MAINTENANCE_PRESETS: MaintenanceTaskPreset[] = [
  { key: "OIL_CHANGE", title: "taskPresets.oilChange.title", category: TaskCategory.OilChange, iconName: "OilCan" },
  { key: "TIRE_ROTATION", title: "taskPresets.tireRotation.title", category: TaskCategory.TireRotation, iconName: "Tire" },
  { key: "BRAKE_SERVICE", title: "taskPresets.brakeService.title", category: TaskCategory.BrakeService, iconName: "Brake" },
  { key: "BATTERY_SERVICE", title: "taskPresets.batteryService.title", category: TaskCategory.BatteryService, iconName: "Battery" },
  { key: "AIR_FILTER", title: "taskPresets.airFilter.title", category: TaskCategory.AirFilter, iconName: "AirFilter" },
  { key: "WIPER_BLADES", title: "taskPresets.wiperBlades.title", category: TaskCategory.WiperBlades, iconName: "Wiper" },
  { key: "INSPECTION", title: "taskPresets.inspection.title", category: TaskCategory.Inspection, iconName: "Search" },
  { key: "FLUID_CHECK", title: "taskPresets.fluidCheck.title", category: TaskCategory.FluidCheck, iconName: "Droplet" },
  { key: "OTHER", title: "taskPresets.other.title", category: TaskCategory.Other, iconName: "PlusCircle" },
];

export const COMMON_MAINTENANCE_TASKS: string[] = COMMON_MAINTENANCE_PRESETS.map(p => p.title).filter(t => t !== "taskPresets.other.title");

export const VAPID_PUBLIC_KEY = 'BEJpWb7JM4VYsLi1x7f2czyB4m0OGisDWjFekZWqYhhAeieY_FroZsGzIE_gzkdK_2Mx0k129DlSeyLnAPxjA_s';