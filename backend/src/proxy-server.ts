import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import type { Request } from 'express';
import { Vehicle } from './models/Vehicle.js';
import Tesseract from 'tesseract.js';
import Fuse from 'fuse.js';
import { ocrImageFieldsWithGemini, ocrTextFieldsWithGemini } from './services/aiService.js';
import { getOrCreateMaintenanceSchedule, generateForecastSchedule } from './services/maintenanceScheduleService.js';
import { decodeVinWithApiNinjas } from './services/vinLookupService.js';
import { initializeAIService } from './services/aiService.js';
import { decodeVinWithGemini } from './services/aiService.js';
import { VehicleService } from './services/vehicleService.js';
import multer from 'multer';
import webpush from 'web-push';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Temporary hardcoded URI for testing
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://akraiz:aScmA3OvOUnQ2jtA@testnumoor.2zlsf0h.mongodb.net/?retryWrites=true&w=majority&appName=TestNumoor';

// Debug logging for MongoDB connection
console.log('🔍 MongoDB Connection Debug:');
console.log('  - MONGODB_URI from env:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('  - Using URI:', MONGODB_URI.substring(0, 20) + '...');
console.log('  - Environment variables available:', Object.keys(process.env).filter(key => key.includes('MONGODB')).join(', '));
console.log('  - All env vars:', Object.keys(process.env).join(', '));

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

import express, { RequestHandler } from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import https from 'https';
import fetch from 'node-fetch';

// Initialize AI service after dotenv is loaded
console.log('🚀 Initializing AI service...');
initializeAIService();

const agent = new https.Agent({ rejectUnauthorized: false });

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS configuration for production
app.use(cors({
  origin: [
    'https://carmemo.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../../frontend/public')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CarMemo Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint for frontend integration
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CarMemo Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// VIN Lookup endpoint using API Ninjas
const vinLookupHandler: RequestHandler = async (req, res) => {
  const { vin } = req.body;
  
  // Validate VIN
  if (!vin || typeof vin !== 'string') {
    res.status(400).json({ 
      error: 'VIN is required and must be a string',
      message: 'Please provide a valid VIN number'
    });
    return;
  }
  
  if (vin.length !== 17) {
    res.status(400).json({ 
      error: 'Invalid VIN length',
      message: 'VIN must be exactly 17 characters long'
    });
    return;
  }
  
  // Get API key from environment
  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    console.error('API_NINJAS_KEY environment variable is not set');
    res.status(500).json({ 
      error: 'Server configuration error',
      message: 'VIN lookup service is not properly configured'
    });
    return;
  }
  
  try {
    const url = `https://api.api-ninjas.com/v1/vinlookup?vin=${encodeURIComponent(vin)}`;
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        res.status(500).json({ 
          error: 'Invalid API key',
          message: 'VIN lookup service authentication failed'
        });
        return;
      } else if (response.status === 429) {
        res.status(429).json({ 
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        });
        return;
      } else {
        res.status(response.status).json({ 
          error: 'API request failed',
          message: `VIN lookup service returned status ${response.status}`
        });
        return;
      }
    }
    
    const data = await response.json() as any;
    
    // Check if the API returned an error message
    if (data.error) {
      res.status(400).json({ 
        error: 'VIN lookup failed',
        message: data.error
      });
      return;
    }
    
    // Return the vehicle data
    res.json(data);
    
  } catch (error) {
    console.error('Error in VIN lookup:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to lookup VIN. Please try again later.'
    });
  }
};

app.post('/api/vin-lookup', vinLookupHandler);

// New endpoint: /api/recall/:vin
const recallHandler: RequestHandler = async (req, res) => {
  const vin = req.params.vin;
  if (!vin) {
    console.error('VIN is required');
    res.status(400).json({ error: 'VIN is required' });
    return;
  }
  const url = `https://recalls.sa/Recall/FindRecallsBySerial/?serial=${encodeURIComponent(vin)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8 seconds
  try {
    const response = await fetch(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CarMemoProxy/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar-SA,en-US;q=0.9,en;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      console.error(`Failed to fetch from recalls.sa: ${response.status} ${response.statusText}`);
      res.status(response.status).json({ error: `recalls.sa returned status ${response.status}` });
      return;
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const recalls: Array<{
      reference: string;
      date: string;
      brand: string;
      model: string;
      status: string;
      detailUrl: string;
    }> = [];
    $('table tr').each((index, row) => {
      const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
      const dataId = $(row).attr('data-id');
      if (cells.length === 5 && dataId) {
        recalls.push({
          reference: cells[0],
          date: cells[1],
          brand: cells[2],
          model: cells[3],
          status: cells[4],
          detailUrl: `https://recalls.sa/Recall/RecallDetails/${dataId}`
        });
      }
    });
    if (recalls.length === 0) {
      console.warn('No recall data found in the HTML table for VIN:', vin);
    }
    res.json(recalls);
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('Timeout fetching from recalls.sa');
      res.status(504).json({ error: 'Timeout fetching from recalls.sa' });
    } else {
      console.error('Error fetching or parsing from recalls.sa:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Error fetching or parsing from recalls.sa', details: errorMessage });
    }
  }
};

app.get('/api/recall/:vin', recallHandler);

const maintenanceScheduleHandler: RequestHandler = async (req, res) => {
  const { vin } = req.body;
  console.log(`[MAINTENANCE] /api/maintenance-schedule called with VIN: ${vin}`);
  if (!vin || typeof vin !== 'string' || vin.length !== 17) {
    res.status(400).json({ error: 'VIN is required and must be 17 characters.' });
    return;
  }
  try {
    let decoded;
    try {
      console.log(`[MAINTENANCE] Trying API Ninjas for VIN: ${vin}`);
      decoded = await decodeVinWithApiNinjas(vin);
      console.log(`[MAINTENANCE] API Ninjas result:`, decoded);
    } catch (err) {
      console.error(`[MAINTENANCE] API Ninjas error:`, err);
    }
    if (!decoded || !decoded.make || !decoded.model || !decoded.year) {
      console.warn(`[MAINTENANCE] API Ninjas failed, falling back to Gemini AI for VIN: ${vin}`);
      try {
        decoded = await decodeVinWithGemini(vin);
        console.log(`[MAINTENANCE] Gemini AI result:`, decoded);
      } catch (err) {
        console.error(`[MAINTENANCE] Gemini AI error:`, err);
      }
    }
    if (!decoded || !decoded.make || !decoded.model || !decoded.year) {
      res.status(404).json({ error: 'Could not decode VIN or missing make/model/year.' });
      return;
    }
    const schedule = await getOrCreateMaintenanceSchedule({
      make: decoded.make,
      model: decoded.model,
      year: decoded.year
    });
    if (!schedule) {
      res.status(500).json({ error: 'Could not generate or fetch maintenance schedule.' });
      return;
    }
    res.json(schedule);
  } catch (err) {
    console.error('[MAINTENANCE] Unhandled error in /api/maintenance-schedule:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
};

app.post('/api/maintenance-schedule', maintenanceScheduleHandler);

const enrichBaselineHandler: RequestHandler = async (req, res) => {
  const { make, model, year } = req.body;
  if (!make || !model || !year) {
    res.status(400).json({ error: 'make, model, and year are required' });
    return;
  }
  try {
    const schedule = await getOrCreateMaintenanceSchedule({ make, model, year });
    if (!schedule) {
      res.status(500).json({ error: 'Could not generate or fetch maintenance schedule.' });
      return;
    }
    res.json(schedule);
  } catch (err) {
    console.error('[ENRICH] Error in /api/enrich-baseline:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
};

app.post('/api/enrich-baseline', enrichBaselineHandler);

// Add forecast schedule endpoint
app.post('/api/generateForecastSchedule', async (req: any, res: any) => {
  try {
    const { vehicle, completedTasks, baselineSchedule } = req.body;
    if (!vehicle || !baselineSchedule) {
      return res.status(400).json({ error: 'vehicle and baselineSchedule are required' });
    }
    console.log('[FORECAST] Generating forecast for vehicle:', vehicle.make, vehicle.model, vehicle.year);
    console.log('[FORECAST] Current mileage:', vehicle.currentMileage);
    console.log('[FORECAST] Baseline schedule items:', baselineSchedule.length);
    
    const forecasted = generateForecastSchedule(vehicle, completedTasks || [], baselineSchedule);
    console.log('[FORECAST] Generated forecasted tasks:', forecasted.length);
    console.log('[FORECAST] First few tasks:', forecasted.slice(0, 3).map(t => ({ title: t.title, dueMileage: t.dueMileage })));
    
    res.json({ schedule: forecasted });
  } catch (err) {
    console.error('[FORECAST] Error in /api/generateForecastSchedule:', err);
    res.status(500).json({ error: 'Internal server error', details: err instanceof Error ? err.message : String(err) });
  }
});

// --- New: Fetch tasks by status/category/mileage/date ---
app.get('/api/tasks/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  const { status, category, minMileage, maxMileage, startDate, endDate } = req.query as Record<string, string | undefined>;
  try {
    const vehicle = await Vehicle.findById(vehicleId).lean();
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    let tasks: any[] = vehicle.maintenanceSchedule || [];
    // Filtering
    if (status) tasks = tasks.filter((t: any) => t.status === status);
    if (category) tasks = tasks.filter((t: any) => t.category === category);
    if (minMileage) tasks = tasks.filter((t: any) => t.dueMileage >= Number(minMileage));
    if (maxMileage) tasks = tasks.filter((t: any) => t.dueMileage <= Number(maxMileage));
    if (startDate) tasks = tasks.filter((t: any) => t.dueDate && t.dueDate >= startDate);
    if (endDate) tasks = tasks.filter((t: any) => t.dueDate && t.dueDate <= endDate);
    // Grouping
    const completed = tasks.filter((t: any) => t.status === 'Completed');
    const upcoming = tasks.filter((t: any) => t.status === 'Upcoming');
    const forecasted = tasks.filter((t: any) => t.isForecast);
    res.json({ completed, upcoming, forecasted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks', details: String(err) });
  }
});

// --- Notification generation logic (demo) ---
// Note: For full TypeScript support, install types: npm install --save-dev @types/multer
function generateNotificationsForUser(userId: string) {
  const vehicles: any[] = (globalThis as any).mockVehicles || [];
  // For demo, assume all vehicles belong to the user
  const notifications: any[] = [];
  vehicles.forEach(vehicle => {
    const tasks = vehicle.maintenanceSchedule || [];
    // Upcoming reminders (due within 1000km)
    tasks.filter((t: any) => t.status === 'Upcoming' && t.dueMileage && vehicle.currentMileage && Number(t.dueMileage) - Number(vehicle.currentMileage) <= 1000 && Number(t.dueMileage) - Number(vehicle.currentMileage) > 0)
      .forEach((t: any) => {
        notifications.push({
          id: `upcoming-${vehicle.id}-${t.id}`,
          title: 'Upcoming Maintenance',
          message: `You are ${Number(t.dueMileage) - Number(vehicle.currentMileage)}km away from your next ${t.title}.`,
          read: false,
          date: new Date().toISOString()
        });
      });
    // Overdue reminders
    tasks.filter((t: any) => t.status === 'Overdue')
      .forEach((t: any) => {
        notifications.push({
          id: `overdue-${vehicle.id}-${t.id}`,
          title: 'Overdue Task',
          message: `${t.title} is overdue by ${Number(vehicle.currentMileage) - Number(t.dueMileage)}km.`,
          read: false,
          date: new Date().toISOString()
        });
      });
    // Streaks: 3+ on-time completions in a row for a category
    const completed = tasks.filter((t: any) => t.status === 'Completed').sort((a: any, b: any) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime());
    let streak = 0;
    let lastCategory: string | null = null;
    completed.forEach((t: any) => {
      const category = t.category as string;
      if (category === lastCategory) {
        streak++;
      } else {
        streak = 1;
        lastCategory = category;
      }
      if (streak === 3) {
        notifications.push({
          id: `streak-${vehicle.id}-${category}`,
          title: 'Streak!',
          message: `Great job maintaining your ${category}! Consistency saves cost.`,
          read: false,
          date: new Date().toISOString()
        });
      }
    });
  });
  return notifications;
}

// --- Fetch push/in-app notifications for a user ---
app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  const notifications = generateNotificationsForUser(userId);
  res.json({ userId, notifications });
});

// --- Add a new task to a vehicle ---
app.post('/api/tasks/:vehicleId', async (req, res) => {
  const { vehicleId } = req.params;
  const task = req.body;
  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    
    // Ensure task has an id field for frontend compatibility
    const taskWithId = {
      ...task,
      id: task.id || crypto.randomUUID(),
      creationDate: task.creationDate || new Date().toISOString()
    };
    
    vehicle.maintenanceSchedule.push(taskWithId);
    await vehicle.save();
    
    // Return the saved task with both id and _id
    const savedTask = vehicle.maintenanceSchedule[vehicle.maintenanceSchedule.length - 1];
    res.status(201).json({ 
      success: true,
      task: savedTask,
      message: 'Task added successfully'
    });
  } catch (err) {
    console.error('Error adding task:', err);
    res.status(500).json({ error: 'Failed to add task', details: String(err) });
  }
});

// --- Update a task for a vehicle ---
app.put('/api/tasks/:vehicleId/:taskId', async (req, res) => {
  const { vehicleId, taskId } = req.params;
  const updatedTask = req.body;
  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    
    // Find task by either id or _id
    const idx = vehicle.maintenanceSchedule.findIndex((t: any) => 
      t.id === taskId || t._id?.toString() === taskId
    );
    
    if (idx === -1) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    // Preserve existing _id and ensure id field exists
    const existingTask = vehicle.maintenanceSchedule[idx];
    const mergedTask = {
      ...existingTask.toObject(),
      ...updatedTask,
      id: updatedTask.id || existingTask.id || crypto.randomUUID(),
      _id: existingTask._id // Preserve MongoDB _id
    };
    
    vehicle.maintenanceSchedule[idx] = mergedTask;
    await vehicle.save();
    
    // Push notification: if task is now overdue or due soon
    const task = vehicle.maintenanceSchedule[idx];
    if (task.status === 'Overdue') {
      await sendPushToAll({
        title: 'Maintenance Overdue',
        body: `${task.title} is now overdue!`,
        url: '/'
      });
    } else if (task.status === 'Upcoming' && task.dueMileage && vehicle.currentMileage && Number(task.dueMileage) - Number(vehicle.currentMileage) <= 1000 && Number(task.dueMileage) - Number(vehicle.currentMileage) > 0) {
      await sendPushToAll({
        title: 'Maintenance Reminder',
        body: `You are ${Number(task.dueMileage) - Number(vehicle.currentMileage)}km away from your next ${task.title}.`,
        url: '/'
      });
    }
    
    res.json({ 
      success: true,
      task: vehicle.maintenanceSchedule[idx],
      message: 'Task updated successfully'
    });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task', details: String(err) });
  }
});

// --- Delete a task from a vehicle ---
app.delete('/api/tasks/:vehicleId/:taskId', async (req, res) => {
  const { vehicleId, taskId } = req.params;
  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    
    // Find task by either id or _id
    const idx = vehicle.maintenanceSchedule.findIndex((t: any) => 
      t.id === taskId || t._id?.toString() === taskId
    );
    
    if (idx === -1) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    
    const deletedTask = vehicle.maintenanceSchedule[idx];
    vehicle.maintenanceSchedule.splice(idx, 1);
    await vehicle.save();
    
    res.json({ 
      success: true,
      message: 'Task deleted successfully',
      deletedTask
    });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task', details: String(err) });
  }
});

// --- Migration: Add IDs to existing tasks ---
app.post('/api/migrate/task-ids', async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    let updatedCount = 0;
    
    for (const vehicle of vehicles) {
      let needsUpdate = false;
      
      for (const task of vehicle.maintenanceSchedule) {
        console.log('Checking task:', task.title, 'id:', task.id, 'hasId:', !!task.id);
        if (!task.id || task.id === '' || task.id === undefined) {
          console.log('Adding ID to task:', task.title);
          task.id = crypto.randomUUID();
          needsUpdate = true;
          updatedCount++;
        }
      }
      
      if (needsUpdate) {
        await vehicle.save();
      }
    }
    
    res.json({ 
      success: true, 
      message: `Updated ${updatedCount} tasks with new IDs`,
      updatedCount 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to migrate task IDs', details: String(err) });
  }
});

// --- Web Push Setup ---
const VAPID_PUBLIC_KEY = 'BEJpWb7JM4VYsLi1x7f2czyB4m0OGisDWjFekZWqYhhAeieY_FroZsGzIE_gzkdK_2Mx0k129DlSeyLnAPxjA_s';
const VAPID_PRIVATE_KEY = 'oVIcJ_5jqmoh4sy-0xDAi_HfB4qCxA3AAd32Pi4100M';
webpush.setVapidDetails(
  'mailto:admin@carmemo.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// In-memory store for push subscriptions (replace with DB in production)
const pushSubscriptions: any[] = [];

// Endpoint to register a push subscription
app.post('/api/push/register', express.json(), (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: 'Invalid subscription' });
    return;
  }
  // Avoid duplicates
  if (!pushSubscriptions.find(sub => sub.endpoint === subscription.endpoint)) {
    pushSubscriptions.push(subscription);
  }
  res.json({ success: true });
});

// Endpoint to send a test push notification to all registered subscriptions
app.post('/api/push/send-test', express.json(), async (req, res) => {
  const payload = JSON.stringify({
    title: 'CarMemo Test Notification',
    body: 'This is a test push notification from CarMemo backend!',
    url: '/'
  });
  let sent = 0;
  for (const sub of pushSubscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      sent++;
    } catch (err) {
      // Remove invalid subscriptions
      const statusCode = (err as any)?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        const idx = pushSubscriptions.findIndex(s => s.endpoint === sub.endpoint);
        if (idx !== -1) pushSubscriptions.splice(idx, 1);
      }
    }
  }
  res.json({ sent, total: pushSubscriptions.length });
});

// Utility to send a push notification to all registered subscriptions
async function sendPushToAll(payload: any) {
  const data = JSON.stringify(payload);
  for (const sub of pushSubscriptions) {
    try {
      await webpush.sendNotification(sub, data);
    } catch (err) {
      const statusCode = (err as any)?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        const idx = pushSubscriptions.findIndex(s => s.endpoint === sub.endpoint);
        if (idx !== -1) pushSubscriptions.splice(idx, 1);
      }
    }
  }
}

// ============================================================================
// VEHICLE MANAGEMENT API ENDPOINTS
// ============================================================================

/**
 * Create a new vehicle
 * POST /api/vehicles
 */
app.post('/api/vehicles', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  console.log('POST /api/vehicles hit. sessionId from query:', sessionId);
  const vehicleData = {
    ...req.body,
    sessionId: sessionId || 'anonymous'
  };
  console.log('POST /api/vehicles vehicleData.sessionId:', vehicleData.sessionId);
  try {
    const result = await VehicleService.createVehicle(vehicleData);
    console.log('POST /api/vehicles result:', result);
    if (result.success) {
      res.status(201).json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in vehicle creation endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get all vehicles
 * GET /api/vehicles
 */
app.get('/api/vehicles', async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    const result = await VehicleService.getAllVehicles(sessionId);
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in get all vehicles endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get vehicle by ID
 * GET /api/vehicles/:id
 */
app.get('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await VehicleService.getVehicleById(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in get vehicle by ID endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get vehicle by VIN
 * GET /api/vehicles/vin/:vin
 */
app.get('/api/vehicles/vin/:vin', async (req, res) => {
  try {
    const { vin } = req.params;
    const sessionId = req.query.sessionId as string;
    const result = await VehicleService.getVehicleByVin(vin, sessionId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in get vehicle by VIN endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Update vehicle
 * PUT /api/vehicles/:id
 */
app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await VehicleService.updateVehicle({
      id,
      ...req.body
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in update vehicle endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Delete vehicle
 * DELETE /api/vehicles/:id
 */
app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await VehicleService.deleteVehicle(id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in delete vehicle endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Search vehicles
 * GET /api/vehicles/search
 */
app.get('/api/vehicles/search', async (req, res) => {
  try {
    const { make, model, year, vin, nickname } = req.query;
    const result = await VehicleService.searchVehicles({
      make: make as string,
      model: model as string,
      year: year ? parseInt(year as string, 10) : undefined,
      vin: vin as string,
      nickname: nickname as string
    });
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in search vehicles endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Get vehicle statistics
 * GET /api/vehicles/stats
 */
app.get('/api/vehicles/stats', async (req, res) => {
  try {
    const result = await VehicleService.getVehicleStats();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in vehicle stats endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/vin-lookup-gemini', async (req, res) => {
  const { vin } = req.body;
  if (!vin || typeof vin !== 'string' || vin.length !== 17) {
    res.status(400).json({ error: 'VIN is required and must be 17 characters.' });
    return;
  }
  try {
    const result = await decodeVinWithGemini(vin);
    if (!result) {
      res.status(404).json({ error: 'Could not decode VIN with Gemini.' });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error('Error in Gemini VIN lookup endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
}); 