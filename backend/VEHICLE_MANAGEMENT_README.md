# CarMemo Vehicle Management System

## Overview

The CarMemo Vehicle Management System provides a complete solution for managing vehicles in the CarMemo application. It includes comprehensive CRUD operations, automatic VIN enrichment, maintenance schedule generation, and advanced search capabilities.

## Features

### 🚗 Core Vehicle Management
- **Create Vehicles**: Add new vehicles with automatic VIN enrichment
- **Read Vehicles**: Retrieve vehicles by ID, VIN, or get all vehicles
- **Update Vehicles**: Modify vehicle details with validation
- **Delete Vehicles**: Remove vehicles and associated data
- **Search Vehicles**: Advanced search with multiple criteria
- **Vehicle Statistics**: Fleet analytics and reporting

### 🔧 Automatic Features
- **VIN Enrichment**: Automatically populate vehicle details from VIN lookup
- **Maintenance Schedule Generation**: Create baseline maintenance schedules
- **Image Upload**: Support for vehicle photos with validation
- **Data Validation**: Comprehensive input validation and error handling

### 📊 Advanced Capabilities
- **Flexible Search**: Search by make, model, year, VIN, or nickname
- **Statistics**: Fleet analytics and reporting
- **File Management**: Secure image upload with type and size validation
- **Error Handling**: Comprehensive error responses and validation

## Quick Start

### 1. Start the Backend Server

```bash
cd backend
npm install
npm start
```

The server will start on `http://localhost:3001`

### 2. Test the API

Run the comprehensive test suite:

```bash
cd backend
node test-vehicle-api.js
```

### 3. Create Your First Vehicle

```bash
curl -X POST http://localhost:3001/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vin": "1HGBH41JXMN109186",
    "nickname": "My Daily Driver",
    "currentMileage": 50000
  }'
```

## API Endpoints

### Vehicle CRUD Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vehicles` | Create a new vehicle |
| GET | `/api/vehicles` | Get all vehicles |
| GET | `/api/vehicles/:id` | Get vehicle by ID |
| GET | `/api/vehicles/vin/:vin` | Get vehicle by VIN |
| PUT | `/api/vehicles/:id` | Update vehicle |
| DELETE | `/api/vehicles/:id` | Delete vehicle |

### Additional Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles/search` | Search vehicles |
| GET | `/api/vehicles/stats` | Get vehicle statistics |
| POST | `/api/vehicles/:id/image` | Upload vehicle image |

## Database Schema

### Vehicle Document Structure

```javascript
{
  _id: ObjectId,
  make: String (required),
  model: String (required),
  year: Number (required),
  vin: String (required, unique),
  nickname: String,
  currentMileage: Number,
  purchaseDate: String,
  imageUrl: String,
  
  // VIN-derived fields
  trim: String,
  driveType: String,
  primaryFuelType: String,
  secondaryFuelType: String,
  engineBrakeHP: Number,
  engineDisplacementL: String,
  transmissionStyle: String,
  gvwr: String,
  cylinders: Number,
  electrificationLevel: String,
  engineModel: String,
  bodyClass: String,
  doors: Number,
  engineConfiguration: String,
  manufacturerName: String,
  plantCountry: String,
  plantState: String,
  plantCity: String,
  
  // Related data
  maintenanceSchedule: [TaskSchema],
  recalls: [RecallSchema],
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

### Task Schema (Maintenance Schedule)

```javascript
{
  title: String (required),
  category: String,
  status: String (required),
  dueDate: String,
  dueMileage: Number,
  completedDate: String,
  cost: Number,
  notes: String,
  isForecast: Boolean,
  archived: Boolean,
  receipts: [ReceiptSchema],
  photos: [PhotoSchema],
  importance: String,
  creationDate: String,
  
  // Maintenance scheduling fields
  interval_km: Number,
  interval_months: Number,
  urgencyBaseline: String,
  isRecurring: Boolean,
  recurrenceInterval: String
}
```

## Frontend Integration

### 1. Vehicle Service (Frontend)

Create a vehicle service in your frontend to interact with the API:

```typescript
// services/vehicleService.ts
export class VehicleService {
  private baseUrl = 'http://localhost:3001/api';

  async createVehicle(vehicleData: CreateVehicleRequest): Promise<VehicleResponse> {
    const response = await fetch(`${this.baseUrl}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicleData)
    });
    return response.json();
  }

  async getAllVehicles(): Promise<VehicleResponse> {
    const response = await fetch(`${this.baseUrl}/vehicles`);
    return response.json();
  }

  async getVehicleById(id: string): Promise<VehicleResponse> {
    const response = await fetch(`${this.baseUrl}/vehicles/${id}`);
    return response.json();
  }

  async updateVehicle(id: string, updateData: Partial<Vehicle>): Promise<VehicleResponse> {
    const response = await fetch(`${this.baseUrl}/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    return response.json();
  }

  async deleteVehicle(id: string): Promise<VehicleResponse> {
    const response = await fetch(`${this.baseUrl}/vehicles/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  async searchVehicles(criteria: SearchCriteria): Promise<VehicleResponse> {
    const params = new URLSearchParams(criteria);
    const response = await fetch(`${this.baseUrl}/vehicles/search?${params}`);
    return response.json();
  }

  async uploadVehicleImage(id: string, file: File): Promise<VehicleResponse> {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${this.baseUrl}/vehicles/${id}/image`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }
}
```

### 2. React Hook for Vehicle Management

```typescript
// hooks/useVehicleManagement.ts
import { useState, useEffect } from 'react';
import { VehicleService } from '../services/vehicleService';

export function useVehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const vehicleService = new VehicleService();

  const loadVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await vehicleService.getAllVehicles();
      if (response.success) {
        setVehicles(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const createVehicle = async (vehicleData: CreateVehicleRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await vehicleService.createVehicle(vehicleData);
      if (response.success) {
        await loadVehicles(); // Refresh the list
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      setError('Failed to create vehicle');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateVehicle = async (id: string, updateData: Partial<Vehicle>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await vehicleService.updateVehicle(id, updateData);
      if (response.success) {
        await loadVehicles(); // Refresh the list
        return response.data;
      } else {
        setError(response.error);
        return null;
      }
    } catch (err) {
      setError('Failed to update vehicle');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await vehicleService.deleteVehicle(id);
      if (response.success) {
        await loadVehicles(); // Refresh the list
        return true;
      } else {
        setError(response.error);
        return false;
      }
    } catch (err) {
      setError('Failed to delete vehicle');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  return {
    vehicles,
    loading,
    error,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    loadVehicles
  };
}
```

### 3. Vehicle Management Component

```typescript
// components/VehicleManagement.tsx
import React, { useState } from 'react';
import { useVehicleManagement } from '../hooks/useVehicleManagement';

export function VehicleManagement() {
  const { vehicles, loading, error, createVehicle, updateVehicle, deleteVehicle } = useVehicleManagement();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const handleCreateVehicle = async (vehicleData: CreateVehicleRequest) => {
    const result = await createVehicle(vehicleData);
    if (result) {
      // Show success message
      console.log('Vehicle created successfully');
    }
  };

  const handleUpdateVehicle = async (id: string, updateData: Partial<Vehicle>) => {
    const result = await updateVehicle(id, updateData);
    if (result) {
      // Show success message
      console.log('Vehicle updated successfully');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this vehicle?');
    if (confirmed) {
      const result = await deleteVehicle(id);
      if (result) {
        // Show success message
        console.log('Vehicle deleted successfully');
      }
    }
  };

  if (loading) return <div>Loading vehicles...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Vehicle Management</h2>
      
      {/* Vehicle List */}
      <div>
        {vehicles.map(vehicle => (
          <div key={vehicle._id}>
            <h3>{vehicle.make} {vehicle.model} ({vehicle.year})</h3>
            <p>VIN: {vehicle.vin}</p>
            <p>Nickname: {vehicle.nickname}</p>
            <p>Mileage: {vehicle.currentMileage} km</p>
            
            <button onClick={() => setSelectedVehicle(vehicle)}>
              Edit
            </button>
            <button onClick={() => handleDeleteVehicle(vehicle._id)}>
              Delete
            </button>
          </div>
        ))}
      </div>

      {/* Add Vehicle Form */}
      <div>
        <h3>Add New Vehicle</h3>
        {/* Add your form component here */}
      </div>

      {/* Edit Vehicle Modal */}
      {selectedVehicle && (
        <div>
          <h3>Edit Vehicle</h3>
          {/* Add your edit form component here */}
        </div>
      )}
    </div>
  );
}
```

## Environment Variables

Make sure to set up the following environment variables:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/carmemo

# VIN Lookup API (API Ninjas)
API_NINJAS_KEY=your_api_ninjas_key_here

# AI Service (Google Gemini)
GOOGLE_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development
```

## Production Deployment

### 1. Security Considerations

- **Authentication**: Implement JWT or session-based authentication
- **Authorization**: Add role-based access control
- **Rate Limiting**: Implement API rate limiting
- **HTTPS**: Use HTTPS in production
- **CORS**: Configure CORS properly for your domain

### 2. Database Setup

- **MongoDB Atlas**: Use MongoDB Atlas for production
- **Backup Strategy**: Implement regular database backups
- **Indexing**: Add proper indexes for performance

### 3. File Storage

- **Cloud Storage**: Use AWS S3 or similar for image storage
- **CDN**: Implement CDN for faster image delivery
- **Image Optimization**: Add image compression and resizing

### 4. Monitoring

- **Health Checks**: Implement health check endpoints
- **Logging**: Add comprehensive logging
- **Error Tracking**: Use services like Sentry for error tracking
- **Performance Monitoring**: Monitor API response times

## Testing

### Run the Test Suite

```bash
cd backend
node test-vehicle-api.js
```

### Manual Testing with curl

```bash
# Create a vehicle
curl -X POST http://localhost:3001/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{"make":"Toyota","model":"Camry","year":2020,"vin":"1HGBH41JXMN109186"}'

# Get all vehicles
curl http://localhost:3001/api/vehicles

# Search vehicles
curl "http://localhost:3001/api/vehicles/search?make=toyota"

# Get vehicle statistics
curl http://localhost:3001/api/vehicles/stats
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify MONGODB_URI environment variable
   - Ensure network connectivity

2. **VIN Lookup Fails**
   - Check API_NINJAS_KEY environment variable
   - Verify API quota and rate limits
   - Check VIN format (must be 17 characters)

3. **Image Upload Fails**
   - Check file size (max 5MB)
   - Verify file type (JPEG, PNG, WebP only)
   - Ensure uploads directory exists and is writable

4. **Validation Errors**
   - Check required fields (make, model, year, vin)
   - Verify VIN uniqueness
   - Ensure year is within valid range

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=vehicle-service:*
```

## Support

For issues and questions:

1. Check the API documentation in `API_DOCUMENTATION.md`
2. Run the test suite to verify functionality
3. Check the server logs for error details
4. Review the troubleshooting section above

## Contributing

When contributing to the vehicle management system:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass before submitting

## License

This vehicle management system is part of the CarMemo project. 