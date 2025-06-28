# Frontend-Backend Integration Guide

This document explains how the frontend integrates with the new backend vehicle management system.

## Overview

The frontend has been updated to integrate with the comprehensive backend vehicle management APIs while maintaining backward compatibility with the existing localStorage-based approach. The system automatically detects backend availability and falls back to local storage when needed.

## Key Components

### 1. Vehicle Service (`services/vehicleService.ts`)

A comprehensive service class that handles all vehicle-related API calls:

```typescript
import { vehicleService } from '../services/vehicleService';

// Create a new vehicle
const response = await vehicleService.createVehicle(vehicleData);

// Get all vehicles
const vehicles = await vehicleService.getAllVehicles();

// Update a vehicle
await vehicleService.updateVehicle(id, updateData);

// Delete a vehicle
await vehicleService.deleteVehicle(id);
```

**Features:**
- Automatic error handling and logging
- Request timeout management
- Debug logging support
- FormData handling for file uploads
- Comprehensive API coverage

### 2. Vehicle Management Hook (`hooks/useVehicleManagement.ts`)

A React hook that provides a unified interface for vehicle management:

```typescript
import useVehicleManagement from '../hooks/useVehicleManagement';

const {
  vehicles,
  selectedVehicle,
  isLoading,
  error,
  handleAddVehicle,
  handleUpdateVehicle,
  handleDeleteVehicle,
  useBackend,
  backendConnected,
  toggleBackendMode,
  refreshVehicles
} = useVehicleManagement();
```

**Features:**
- Automatic backend connectivity detection
- Fallback to localStorage when backend is unavailable
- Unified API for both backend and local storage
- Real-time state management
- Error handling and loading states

### 3. API Configuration (`config/api.ts`)

Centralized configuration for API endpoints and settings:

```typescript
import { API_CONFIG, VEHICLE_ENDPOINTS } from '../config/api';

// Configuration
console.log(API_CONFIG.BASE_URL); // http://localhost:3001/api
console.log(API_CONFIG.USE_BACKEND); // true

// Endpoints
console.log(VEHICLE_ENDPOINTS.CREATE); // /vehicles
console.log(VEHICLE_ENDPOINTS.GET_BY_ID('123')); // /vehicles/123
```

## Environment Configuration

Create a `.env` file in the frontend directory:

```env
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:3001/api

# Optional: Override default API URL for production
# VITE_API_BASE_URL=https://your-backend-domain.com/api

# Optional: Enable/disable backend integration (default: true)
# VITE_USE_BACKEND=true

# Optional: Enable debug logging for API calls
# VITE_DEBUG_API=false
```

## Integration Features

### 1. Automatic Backend Detection

The system automatically detects backend availability on startup:

```typescript
// In useVehicleManagement hook
useEffect(() => {
  checkBackendConnection();
}, []);

const checkBackendConnection = async () => {
  try {
    const response = await vehicleService.healthCheck();
    setState(prev => ({ ...prev, backendConnected: true }));
  } catch (error) {
    console.warn('Backend not available, falling back to localStorage');
    setState(prev => ({ ...prev, backendConnected: false, useBackend: false }));
  }
};
```

### 2. Seamless Fallback

When the backend is unavailable, the system automatically falls back to localStorage:

```typescript
const loadVehicles = async () => {
  if (state.useBackend && state.backendConnected) {
    // Load from backend
    const response = await vehicleService.getAllVehicles();
    // Process backend response
  } else {
    // Fallback to localStorage
    const loadedVehicles = loadVehiclesFromStorage();
    // Process local data
  }
};
```

### 3. Unified API Interface

The same functions work with both backend and local storage:

```typescript
// This works with both backend and localStorage
const handleAddVehicle = async (vehicleData) => {
  if (state.useBackend && state.backendConnected) {
    // Use backend API
    await vehicleService.createVehicle(vehicleData);
  } else {
    // Use localStorage
    const newVehicle = { id: crypto.randomUUID(), ...vehicleData };
    setState(prev => ({ ...prev, vehicles: [...prev.vehicles, newVehicle] }));
  }
};
```

## API Endpoints

### Vehicle Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/vehicles` | Create a new vehicle |
| `GET` | `/vehicles` | Get all vehicles |
| `GET` | `/vehicles/:id` | Get vehicle by ID |
| `GET` | `/vehicles/vin/:vin` | Get vehicle by VIN |
| `PUT` | `/vehicles/:id` | Update vehicle |
| `DELETE` | `/vehicles/:id` | Delete vehicle |
| `GET` | `/vehicles/search` | Search vehicles |
| `GET` | `/vehicles/stats` | Get vehicle statistics |
| `POST` | `/vehicles/:id/image` | Upload vehicle image |

### Task Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tasks/:vehicleId` | Add task to vehicle |
| `PUT` | `/tasks/:vehicleId/:taskId` | Update task |
| `DELETE` | `/tasks/:vehicleId/:taskId` | Delete task |
| `GET` | `/tasks/:vehicleId` | Get tasks for vehicle |
| `POST` | `/tasks/:vehicleId/upload-receipt` | Upload task receipt |
| `POST` | `/tasks/:vehicleId/ocr-complete` | Complete task via OCR |

### Maintenance Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/maintenance-schedule` | Get maintenance schedule |
| `POST` | `/enrich-baseline` | Enrich baseline schedule |
| `POST` | `/generateForecastSchedule` | Generate forecast schedule |

### VIN and Recalls

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/vin-lookup` | Lookup VIN information |
| `GET` | `/recall/:vin` | Get recalls for VIN |

## Error Handling

The system provides comprehensive error handling:

```typescript
// In vehicleService.ts
try {
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  
  return data;
} catch (error) {
  logApiError(method, endpoint, error);
  throw error;
}
```

## Debug Logging

Enable debug logging by setting `VITE_DEBUG_API=true`:

```typescript
// API calls are logged
[API] POST /vehicles { make: "Toyota", model: "Camry", year: 2020 }

// Responses are logged
[API] POST /vehicles response: { success: true, data: { id: "123", ... } }

// Errors are logged
[API] POST /vehicles error: Error: Vehicle with this VIN already exists
```

## Migration from localStorage

The system automatically migrates from localStorage to backend:

1. **On startup**: Checks backend connectivity
2. **If backend available**: Loads data from backend, syncs with localStorage
3. **If backend unavailable**: Uses localStorage exclusively
4. **When backend becomes available**: Automatically switches to backend mode

## Testing the Integration

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Test Backend Connectivity

The frontend will automatically detect the backend and show connection status in the console.

### 4. Test Vehicle Operations

- Add a new vehicle
- Edit vehicle details
- Upload vehicle image
- Add maintenance tasks
- Complete tasks
- Delete vehicles

## Troubleshooting

### Backend Not Connecting

1. Check if backend is running on `http://localhost:3001`
2. Verify CORS settings in backend
3. Check network connectivity
4. Review browser console for errors

### API Errors

1. Enable debug logging: `VITE_DEBUG_API=true`
2. Check backend logs for detailed error information
3. Verify API endpoint URLs
4. Check request/response formats

### File Upload Issues

1. Verify file size limits
2. Check file type restrictions
3. Ensure proper FormData formatting
4. Review backend upload directory permissions

## Production Deployment

### Environment Variables

```env
# Production backend URL
VITE_API_BASE_URL=https://your-production-backend.com/api

# Disable debug logging
VITE_DEBUG_API=false

# Ensure backend integration is enabled
VITE_USE_BACKEND=true
```

### CORS Configuration

Ensure your backend allows requests from your frontend domain:

```typescript
// In backend proxy-server.ts
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-frontend-domain.com'],
  credentials: true
}));
```

### SSL/HTTPS

For production, ensure both frontend and backend use HTTPS:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

## Performance Considerations

1. **Request Timeouts**: Default 10 seconds, configurable
2. **Retry Logic**: 3 attempts with 1-second delay
3. **Caching**: Consider implementing response caching
4. **Pagination**: For large datasets, implement pagination
5. **Optimistic Updates**: UI updates immediately, syncs with backend

## Security Considerations

1. **Input Validation**: All inputs are validated on both frontend and backend
2. **File Upload Security**: File type and size restrictions
3. **CORS**: Proper CORS configuration
4. **HTTPS**: Use HTTPS in production
5. **Authentication**: Consider adding authentication for production use

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live updates
2. **Offline Support**: Service worker for offline functionality
3. **Data Synchronization**: Conflict resolution for offline changes
4. **Push Notifications**: Maintenance reminders
5. **Analytics**: Usage analytics and performance monitoring 