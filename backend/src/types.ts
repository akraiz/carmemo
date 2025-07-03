export interface RecallInfo {
  id: string;
  reference: string;
  date: string;
  brand: string;
  model: string;
  status: string;
  detailUrl: string;
  reportReceivedDate?: string;
  nhtsaCampaignNumber?: string;
}

export interface SaudiRecallInfo {
  id: string;
  vin: string;
  manufacturer: string;
  model: string;
  year: string;
  recallDate: string;
  reportReceivedDate?: string;
  description: string;
  severity: string;
  status: string;
  source: string;
  // For direct table scraping:
  reference?: string;
  date?: string;
  brand?: string;
  detailUrl?: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  nickname?: string;
  currentMileage?: number;
  purchaseDate?: string;
  maintenanceSchedule: MaintenanceTask[];
  imageUrl?: string; // Optional: e.g., https://picsum.photos/300/200
  imageId?: string; // Optional: GridFS ObjectId for vehicle image
  recalls?: RecallInfo[]; // Added for recall information

  // Detailed specifications from VIN decoding
  trim?: string;
  driveType?: string;
  primaryFuelType?: string;
  secondaryFuelType?: string;
  engineBrakeHP?: number;
  engineDisplacementL?: string; // e.g., "3.5L"
  transmissionStyle?: string;
  gvwr?: string; // Gross Vehicle Weight Rating
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
  // Add any other relevant fields you might want
}

export interface MaintenanceTask {
  id: string;
  _id?: string; // MongoDB-style ID from database
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  dueDate?: string; // ISO Date string
  dueMileage?: number;
  completedDate?: string; // ISO Date string
  cost?: number;
  notes?: string;
  parts?: Part[];
  photos?: FileAttachment[]; // Store metadata, actual files handled separately
  receipts?: FileAttachment[];
  isRecurring?: boolean;
  recurrenceInterval?: string; // e.g., "3 months", "5000 miles"
  creationDate: string; // ISO Date string
  importance?: TaskImportance;
}

export interface Part {
  name: string;
  partNumber?: string;
  quantity: number;
  cost?: number;
}

export interface FileAttachment {
  id?: string;
  name: string;
  url: string; // Could be a data URL for previews or a backend URL
  type: string; // Mime type
  uploadedDate: string; // ISO Date string
}

export enum TaskCategory {
  OilChange = "Oil Change",
  TireRotation = "Tire Rotation",
  BrakeService = "Brake Service",
  FluidCheck = "Fluid Check",
  BatteryService = "Battery Service",
  EngineTuneUp = "Engine Tune-Up",
  AirFilter = "Air Filter",
  WiperBlades = "Wiper Blades",
  Inspection = "Inspection",
  Tires = "Tires",
  Other = "Other",
}

export enum TaskStatus {
  Upcoming = "Upcoming",
  Overdue = "Overdue",
  Completed = "Completed",
  Skipped = "Skipped",
  InProgress = "In Progress",
}

export enum TaskImportance {
  Required = "Required",
  Recommended = "Recommended",
  Optional = "Optional",
}

export interface ExtractedReceiptInfo {
  taskName?: string;
  date?: string; // YYYY-MM-DD
  cost?: number;
  items?: string[];
  notes?: string;
}

export type NotificationPermission = 'granted' | 'denied' | 'default';

export interface AppSettings {
  notificationOptIn: boolean;
  notificationPermissionStatus: NotificationPermission;
} 