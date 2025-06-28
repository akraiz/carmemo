import mongoose, { Schema } from 'mongoose';

const TaskSchema = new Schema({
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
});

const VehicleSchema = new Schema({
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  vin: { type: String, required: true, unique: true },
  nickname: { type: String },
  currentMileage: { type: Number },
  purchaseDate: { type: String },
  imageUrl: { type: String },
  maintenanceSchedule: [TaskSchema],
  recalls: [{
    id: String,
    component: String,
    summary: String,
    consequence: String,
    remedy: String,
    reportReceivedDate: String,
    nhtsaCampaignNumber: String
  }],
});

export default mongoose.model('Vehicle', VehicleSchema); 