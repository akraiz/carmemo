import mongoose, { Schema } from 'mongoose';

const MaintenanceTaskSchema = new Schema({
  title: String,
  dueMileage: Number,
  isForecast: Boolean,
  status: String,
  completedDate: String,
  cost: Number,
  notes: String,
  receipts: [String]
}, { _id: false });

const VehicleSchema = new Schema({
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  vin: { type: String, required: true, unique: true },
  owner: { type: String },
  currentMileage: { type: Number },
  maintenanceSchedule: [MaintenanceTaskSchema],
  recalls: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Vehicle = mongoose.model('Vehicle', VehicleSchema); 