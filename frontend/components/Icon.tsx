import React from 'react';
import {
  Car as CarIcon,
  PlusCircle as PlusCircleIcon,
  Trash2 as TrashIcon, 
  Pencil as PencilIcon,
  CheckCircle2 as CheckCircleIcon, 
  XCircle as XCircleIcon,
  Download as DownloadIcon, 
  Share2 as Share2Icon, 
  Edit3 as Edit3Icon, 
  Camera as CameraIcon,
  FileText as ReceiptIcon, 
  Droplet as OilCanIcon, 
  Disc3 as TireIcon, 
  Disc3 as BrakeIcon, 
  BatteryFull as BatteryIcon, 
  AirVent as AirFilterIcon, 
  Search as SearchIcon,
  Droplet as DropletIcon,
  Plus as PlusIcon,
  Info as InformationCircleIcon,
  UserCircle2 as UserCircleIcon, 
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  X as XMarkIcon,
  FileText as DocumentTextIcon,
  Wrench as WrenchIcon,
  Settings2 as Settings2Icon, 
  CarFront as WindshieldIcon, 
  Fuel as FuelIcon, 
  Menu as MenuIcon, // Added
  Languages as LanguagesIcon, // Added
  AlertTriangle as AlertTriangleIcon, // Added for recall notifications
  CalendarDays as CalendarIcon, // General calendar icon
  CalendarX2 as CalendarX2Icon, // For empty timeline or errors
  BarChart3 as BarChart3Icon, // Added for analytics
  ListTodo as ListTodoIcon, // Added for analytics
  DollarSign as DollarSignIcon, // Added for analytics
  Bell as BellIcon,
  Wind as AirVentIcon,
  Shield as ShieldIcon,
  HardHat as HardHatIcon,
  ClipboardList as ClipboardListIcon,
  Snowflake as SnowflakeIcon,
  Thermometer as ThermometerIcon,
  GitCommitHorizontal as GitCommitHorizontalIcon,
  type LucideProps 
} from 'lucide-react';

// --- Icon Components Re-exported from Lucide ---
export const Icons = {
  Car: CarIcon,
  PlusCircle: PlusCircleIcon,
  Trash: TrashIcon,
  Pencil: PencilIcon,
  Edit3: Edit3Icon, 
  CheckCircle: CheckCircleIcon,
  XCircle: XCircleIcon,
  Download: DownloadIcon, 
  Share2: Share2Icon, 
  ArrowUpTray: DownloadIcon, 
  Camera: CameraIcon,
  Receipt: ReceiptIcon,
  OilCan: OilCanIcon, 
  Tire: TireIcon, 
  Brake: BrakeIcon, 
  Battery: BatteryIcon,
  AirFilter: AirFilterIcon,
  Wiper: WindshieldIcon, 
  Search: SearchIcon,
  Droplet: DropletIcon,
  Plus: PlusIcon,
  InformationCircle: InformationCircleIcon,
  UserCircle: UserCircleIcon,
  ChevronDown: ChevronDownIcon,
  ChevronLeft: ChevronLeftIcon,
  ChevronRight: ChevronRightIcon,
  XMark: XMarkIcon,
  DocumentText: DocumentTextIcon,
  FileText: DocumentTextIcon, // Added this line
  Wrench: WrenchIcon,
  Settings2: Settings2Icon, 
  Fuel: FuelIcon, 
  Menu: MenuIcon, // Added
  Languages: LanguagesIcon, // Added
  AlertTriangle: AlertTriangleIcon, // Added
  Calendar: CalendarIcon,
  CalendarX2: CalendarX2Icon,
  BarChart3: BarChart3Icon, // Added for analytics
  ListTodo: ListTodoIcon, // Added for analytics
  DollarSign: DollarSignIcon, // Added for analytics
  Bell: BellIcon,
  AirVent: AirVentIcon,
  Shield: ShieldIcon,
  HardHat: HardHatIcon,
  ClipboardList: ClipboardListIcon,
  Snowflake: SnowflakeIcon,
  Thermometer: ThermometerIcon,
  GitCommitHorizontal: GitCommitHorizontalIcon,
};

// IconMap for dynamic icon rendering based on strings (e.g., from constants)
export const IconMap: Record<string, React.FC<LucideProps>> = {
  // Core Maintenance
  "Oil Change": Icons.OilCan,
  "Tire Rotation": Icons.Tire,
  "Brake Service": Icons.Brake,
  "Fluid Check": Icons.Droplet,
  "Battery Service": Icons.Battery,
  "Engine Tune-Up": Icons.Wrench,
  "Air Filter": Icons.AirVent,
  "Wiper Blades": Icons.Wiper,
  "Inspection": Icons.Search,
  
  // Engine
  "Engine": Icons.Wrench,
  "Engine/Air Intake": Icons.AirVent,
  "Engine/Ignition": Icons.Pencil, // Using Pencil as a proxy for spark plug
  "Engine/Inspection": Icons.Search,
  
  // Brakes
  "Brakes": Icons.Brake,
  "Brakes/Fluids": Icons.Droplet,
  
  // Tires & Wheels
  "Tires": Icons.Tire,
  "Tires/Suspension": Icons.GitCommitHorizontal, // Represents axle/suspension
  "Tires/Wheels": Icons.Tire,
  "Wheels/Tires": Icons.Tire,
  "Wheels & Tires": Icons.Tire,
  
  // Transmission & Drivetrain
  "Transmission": Icons.Settings2,
  "Transmission/Fluids": Icons.Droplet,
  "Transmission/Inspection": Icons.Search,
  "Drivetrain": Icons.GitCommitHorizontal,
  "Drivetrain/Inspection": Icons.Search,
  
  // Suspension & Steering
  "Suspension/Steering": Icons.GitCommitHorizontal,
  "Suspension/Steering/Inspection": Icons.Search,
  
  // Cooling System
  "Cooling System": Icons.Thermometer,
  "Cooling": Icons.Snowflake,
  
  // HVAC
  "HVAC": Icons.AirVent,
  
  // Electrical
  "Electrical": Icons.Battery,
  "Electrical/Inspection": Icons.Search,
  
  // Fuel System
  "Fuel System": Icons.Fuel,
  
  // Exhaust
  "Exhaust": Icons.Car, // Using car as proxy for exhaust pipe
  
  // Chassis & Body
  "Chassis": Icons.Car,
  "Chassis/Suspension": Icons.GitCommitHorizontal,
  "Chassis/Tires": Icons.Tire,
  "Exterior": Icons.Car,
  
  // Filters
  "Filters": Icons.AirFilter,
  
  // Fluids
  "Fluids": Icons.Droplet,
  "Fluids/Inspection": Icons.Search,
  
  // Safety & General
  "Safety": Icons.Shield,
  "General Inspection": Icons.Search,
  "General": Icons.ClipboardList,
  
  // Other
  "Other": Icons.HardHat, // General work/other icon
};

export const DefaultTaskIcon = Icons.Wrench;