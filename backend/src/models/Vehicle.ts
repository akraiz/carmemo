import mongoose, { Schema } from 'mongoose';

const MaintenanceTaskSchema = new Schema({
  id: { type: String }, // Frontend-compatible ID
  title: { type: String, required: true },
  category: { type: String },
  status: { type: String, required: true },
  dueDate: { type: String },
  dueMileage: { type: Number },
  completedDate: { type: String },
  cost: { type: Number },
  notes: { type: String },
  isForecast: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
  receipts: [{
    url: String,
    uploadedDate: String,
    name: String,
    type: String
  }],
  photos: [{
    url: String,
    uploadedDate: String,
    name: String,
    type: String
  }],
  importance: { type: String },
  creationDate: { type: String },
  interval_km: { type: Number },
  interval_months: { type: Number },
  urgencyBaseline: { type: String },
  isRecurring: { type: Boolean, default: false },
  recurrenceInterval: { type: String },
}, { _id: false });

const RecallSchema = new Schema({
  id: String,
  reference: String,
  date: String,
  brand: String,
  model: String,
  status: String,
  detailUrl: String,
  reportReceivedDate: String,
  nhtsaCampaignNumber: String
}, { _id: false });

const VehicleSchema = new Schema({
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  vin: { type: String },
  owner: { type: String },
  nickname: { type: String },
  currentMileage: { type: Number },
  purchaseDate: { type: String },
  imageUrl: { type: String },
  // DETAILED VEHICLE FIELDS
  trim: { type: String },
  driveType: { type: String },
  engineDisplacementL: { type: String },
  cylinders: { type: Number },
  engineBrakeHP: { type: Number },
  transmissionStyle: { type: String },
  primaryFuelType: { type: String },
  bodyClass: { type: String },
  doors: { type: Number },
  manufacturerName: { type: String },
  maintenanceSchedule: [MaintenanceTaskSchema],
  recalls: [RecallSchema],
  imageId: { type: Schema.Types.ObjectId, ref: 'fs.files' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Removed unique index to allow multiple vehicles without VIN
// VehicleSchema.index({ vin: 1, owner: 1 }, { unique: true });

export const Vehicle = mongoose.model('Vehicle', VehicleSchema); 