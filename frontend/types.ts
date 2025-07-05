export interface RecallInfo {
  id: string; // NHTSACampaignNumber or other unique identifier
  consequence?: string;
  remedy?: string;
  reportReceivedDate?: string;
  nhtsaCampaignNumber?: string; // This specific ID from NHTSA
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
  _id?: string; // MongoDB _id for backend compatibility
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
  _id?: string; // MongoDB-style ID from backend API
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
  // Forecasting/recurrence fields
  isForecast?: boolean;
  urgency?: string;
}

export interface Part {
  name: string;
  partNumber?: string;
  quantity: number;
  cost?: number;
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string; // Could be a data URL for previews or a backend URL
  type: string; // Mime type
  uploadedDate: string; // ISO Date string
}

export enum TaskCategory {
  // Core maintenance categories (existing)
  OilChange = "Oil Change",
  TireRotation = "Tire Rotation",
  BrakeService = "Brake Service",
  FluidCheck = "Fluid Check",
  BatteryService = "Battery Service",
  EngineTuneUp = "Engine",
  AirFilter = "Air Filter",
  WiperBlades = "Wiper Blades",
  Inspection = "Inspection",
  
  // Engine-related categories
  Engine = "Engine",
  EngineAirIntake = "Engine/Air Intake",
  EngineIgnition = "Engine/Ignition",
  EngineInspection = "Engine/Inspection",
  
  // Brake system
  Brakes = "Brakes",
  BrakesFluids = "Brakes/Fluids",
  
  // Tire and wheel categories
  Tires = "Tires",
  TiresSuspension = "Tires/Suspension",
  TiresWheels = "Tires/Wheels",
  WheelsTires = "Wheels/Tires",
  WheelsAndTires = "Wheels & Tires",
  
  // Transmission and drivetrain
  Transmission = "Transmission",
  TransmissionFluids = "Transmission/Fluids",
  TransmissionInspection = "Transmission/Inspection",
  Drivetrain = "Drivetrain",
  DrivetrainInspection = "Drivetrain/Inspection",
  
  // Suspension and steering
  SuspensionSteering = "Suspension/Steering",
  SuspensionSteeringInspection = "Suspension/Steering/Inspection",
  
  // Cooling system
  CoolingSystem = "Cooling System",
  Cooling = "Cooling",
  
  // HVAC and climate control
  HVAC = "HVAC",
  
  // Electrical system
  Electrical = "Electrical",
  ElectricalInspection = "Electrical/Inspection",
  
  // Fuel system
  FuelSystem = "Fuel System",
  
  // Exhaust system
  Exhaust = "Exhaust",
  
  // Chassis and body
  Chassis = "Chassis",
  ChassisSuspension = "Chassis/Suspension",
  ChassisTires = "Chassis/Tires",
  Exterior = "Exterior",
  
  // Filters
  Filters = "Filters",
  
  // Fluids
  Fluids = "Fluids",
  FluidsInspection = "Fluids/Inspection",
  
  // Safety and general
  Safety = "Safety",
  GeneralInspection = "General Inspection",
  General = "General",
  
  // Catch-all
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

// Interface for baseline maintenance tasks from backend
export interface BaselineTask {
  item: string;
  interval_km?: number;
  interval_months?: number;
  category: string;
  urgency?: string;
  notes?: string;
  // Convert to miles for frontend use
  intervalMileage?: number;
  intervalMonths?: number;
}

// Interface for baseline schedule response
export interface BaselineScheduleResponse {
  schedule: BaselineTask[];
}
