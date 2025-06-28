# CarMemo Vehicle Management API Documentation

## Overview

The CarMemo Vehicle Management API provides comprehensive CRUD operations for managing vehicles in the system. All endpoints return JSON responses with a consistent structure.

## Base URL
```
http://localhost:3001/api
```

## Response Format

All API responses follow this structure:
```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error": string (only present when success: false)
}
```

## Authentication

Currently, the API does not require authentication. In production, you should implement proper authentication and authorization.

## Vehicle Management Endpoints

### 1. Create Vehicle

**POST** `/api/vehicles`

Creates a new vehicle with automatic VIN enrichment and maintenance schedule generation.

#### Request Body
```json
{
  "make": "Toyota",
  "model": "Camry",
  "year": 2020,
  "vin": "1HGBH41JXMN109186",
  "nickname": "My Daily Driver",
  "currentMileage": 50000,
  "purchaseDate": "2020-01-15",
  "imageUrl": "https://example.com/car-image.jpg"
}
```

#### Required Fields
- `make`: Vehicle manufacturer (string)
- `model`: Vehicle model (string)
- `year`: Manufacturing year (number, 1900-current year+1)
- `vin`: Vehicle Identification Number (string, exactly 17 characters)

#### Optional Fields
- `nickname`: Custom name for the vehicle
- `currentMileage`: Current odometer reading (number, non-negative)
- `purchaseDate`: Date of purchase (ISO date string)
- `imageUrl`: URL to vehicle image
- All VIN-derived fields (trim, driveType, primaryFuelType, etc.)

#### Response (Success - 201)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vin": "1HGBH41JXMN109186",
    "nickname": "My Daily Driver",
    "currentMileage": 50000,
    "purchaseDate": "2020-01-15",
    "imageUrl": "https://example.com/car-image.jpg",
    "maintenanceSchedule": [...],
    "recalls": [],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Vehicle created successfully"
}
```

#### Response (Error - 400)
```json
{
  "success": false,
  "error": "Vehicle with this VIN already exists"
}
```

### 2. Get All Vehicles

**GET** `/api/vehicles`

Retrieves all vehicles in the system, sorted by creation date (newest first).

#### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "make": "Toyota",
      "model": "Camry",
      "year": 2020,
      "vin": "1HGBH41JXMN109186",
      "nickname": "My Daily Driver",
      "currentMileage": 50000,
      "maintenanceSchedule": [...],
      "recalls": [],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "message": "Found 1 vehicles"
}
```

### 3. Get Vehicle by ID

**GET** `/api/vehicles/:id`

Retrieves a specific vehicle by its MongoDB ObjectId.

#### Parameters
- `id`: Vehicle ID (MongoDB ObjectId)

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vin": "1HGBH41JXMN109186",
    "nickname": "My Daily Driver",
    "currentMileage": 50000,
    "maintenanceSchedule": [...],
    "recalls": [],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Vehicle found successfully"
}
```

#### Response (Error - 404)
```json
{
  "success": false,
  "error": "Vehicle not found"
}
```

### 4. Get Vehicle by VIN

**GET** `/api/vehicles/vin/:vin`

Retrieves a specific vehicle by its VIN.

#### Parameters
- `vin`: Vehicle Identification Number (17 characters)

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vin": "1HGBH41JXMN109186",
    "nickname": "My Daily Driver",
    "currentMileage": 50000,
    "maintenanceSchedule": [...],
    "recalls": [],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Vehicle found successfully"
}
```

### 5. Update Vehicle

**PUT** `/api/vehicles/:id`

Updates an existing vehicle. Only provided fields will be updated.

#### Parameters
- `id`: Vehicle ID (MongoDB ObjectId)

#### Request Body
```json
{
  "nickname": "Updated Nickname",
  "currentMileage": 55000,
  "imageUrl": "https://example.com/new-image.jpg"
}
```

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "vin": "1HGBH41JXMN109186",
    "nickname": "Updated Nickname",
    "currentMileage": 55000,
    "imageUrl": "https://example.com/new-image.jpg",
    "maintenanceSchedule": [...],
    "recalls": [],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "message": "Vehicle updated successfully"
}
```

### 6. Delete Vehicle

**DELETE** `/api/vehicles/:id`

Deletes a vehicle and all its associated data (maintenance schedule, recalls, etc.).

#### Parameters
- `id`: Vehicle ID (MongoDB ObjectId)

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011"
  },
  "message": "Vehicle deleted successfully"
}
```

### 7. Search Vehicles

**GET** `/api/vehicles/search`

Searches vehicles by various criteria. All parameters are optional and case-insensitive.

#### Query Parameters
- `make`: Vehicle manufacturer (partial match)
- `model`: Vehicle model (partial match)
- `year`: Manufacturing year (exact match)
- `vin`: VIN (partial match)
- `nickname`: Vehicle nickname (partial match)

#### Example Request
```
GET /api/vehicles/search?make=toyota&year=2020
```

#### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "make": "Toyota",
      "model": "Camry",
      "year": 2020,
      "vin": "1HGBH41JXMN109186",
      "nickname": "My Daily Driver"
    }
  ],
  "message": "Found 1 vehicles matching criteria"
}
```

### 8. Get Vehicle Statistics

**GET** `/api/vehicles/stats`

Retrieves aggregated statistics about vehicles in the system.

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "totalVehicles": 5,
    "vehiclesByMake": [
      {
        "_id": "Toyota",
        "count": 2
      },
      {
        "_id": "Honda",
        "count": 2
      },
      {
        "_id": "Ford",
        "count": 1
      }
    ],
    "vehiclesByYear": [
      {
        "_id": 2020,
        "count": 3
      },
      {
        "_id": 2019,
        "count": 2
      }
    ]
  },
  "message": "Vehicle statistics retrieved successfully"
}
```

### 9. Upload Vehicle Image

**POST** `/api/vehicles/:id/image`

Uploads an image for a specific vehicle.

#### Parameters
- `id`: Vehicle ID (MongoDB ObjectId)

#### Request
- Content-Type: `multipart/form-data`
- Body: Form data with `image` field containing the file

#### File Requirements
- Allowed types: JPEG, JPG, PNG, WebP
- Maximum size: 5MB

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "imageUrl": "/uploads/abc123.jpg",
    "filename": "abc123.jpg",
    "originalName": "my-car.jpg",
    "size": 1024000,
    "mimetype": "image/jpeg"
  },
  "message": "Vehicle image uploaded successfully"
}
```

#### Response (Error - 400)
```json
{
  "success": false,
  "error": "File size too large. Maximum size is 5MB."
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields: make, model, year, and vin are required"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Vehicle not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

### Validation Errors

The API performs comprehensive validation:

- **VIN**: Must be exactly 17 characters, unique across all vehicles
- **Year**: Must be between 1900 and current year + 1
- **Mileage**: Must be non-negative
- **Required fields**: make, model, year, vin are mandatory for creation

## Features

### Automatic VIN Enrichment
When creating a vehicle, if VIN-derived fields (trim, driveType, etc.) are not provided, the API automatically enriches the vehicle data using VIN lookup services.

### Maintenance Schedule Generation
Upon vehicle creation, the system automatically generates a maintenance schedule based on the vehicle's make, model, and year.

### Image Upload
Vehicles can have images uploaded and stored locally in the `/uploads` directory.

### Search Capabilities
Flexible search functionality with partial matching and multiple criteria.

### Statistics
Aggregated statistics for fleet management and analytics.

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider implementing rate limiting to prevent abuse.

## Security Considerations

1. **Input Validation**: All inputs are validated and sanitized
2. **File Upload Security**: File type and size validation for image uploads
3. **Database Security**: MongoDB injection protection through Mongoose
4. **Error Handling**: Sensitive information is not exposed in error messages

## Production Deployment

For production deployment, consider:

1. **Authentication**: Implement JWT or session-based authentication
2. **Authorization**: Role-based access control
3. **Rate Limiting**: Implement API rate limiting
4. **Logging**: Comprehensive request/response logging
5. **Monitoring**: Health checks and performance monitoring
6. **Backup**: Regular database backups
7. **HTTPS**: Use HTTPS in production
8. **CORS**: Configure CORS properly for your frontend domain 