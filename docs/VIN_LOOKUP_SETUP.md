# VIN Lookup Integration Setup Guide

This guide explains how to set up and use the new VIN lookup functionality that replaces the Gemini AI-based VIN decoding with the API Ninjas VIN Lookup service.

## 🔧 Backend Setup

### 1. Environment Variables

Create a `.env` file in your project root (if it doesn't exist) and add your API Ninjas key:

```bash
# .env
API_NINJAS_KEY=J0ILtcCNU4NKK6G1iziXsg==BQc00V9vrocJ6Le4
```

### 2. Proxy Server Configuration

The proxy server (`proxy-server.cjs`) has been updated with a new endpoint:

- **Endpoint**: `POST /api/vin-lookup`
- **Request Body**: `{ "vin": "1FM5K8D84KGB31890" }`
- **Response**: Vehicle data from API Ninjas

### 3. Starting the Proxy Server

```bash
# Start the proxy server
npm run start:proxy

# Or directly with node
node proxy-server.cjs
```

The proxy server will run on `http://localhost:3001` and handle:
- VIN validation
- API Ninjas requests
- Error handling
- Rate limiting protection

## 🎯 Frontend Integration

### 1. New Service File

The `services/vinLookupService.ts` file provides:

- `decodeVinWithApiNinjas()` - Main VIN decoding function
- `validateVin()` - VIN format validation
- `formatVin()` - VIN formatting for display

### 2. Updated Components

The following components have been updated to use the new VIN lookup service:

- `AddVehicleModal.tsx` - VIN decoding during vehicle addition
- `EditVehicleModal.tsx` - VIN decoding during vehicle editing
- `VinLookupDemo.tsx` - Standalone VIN lookup component

### 3. Usage Example

```typescript
import { decodeVinWithApiNinjas, validateVin } from '../services/vinLookupService';

// Validate VIN before lookup
if (!validateVin(vin)) {
  console.error('Invalid VIN format');
  return;
}

// Decode VIN
const vehicleData = await decodeVinWithApiNinjas(vin);
if (vehicleData) {
  console.log('Vehicle found:', vehicleData);
}
```

## 🔒 Security Features

### 1. API Key Protection

- API key is stored only on the backend
- Never exposed to the frontend
- Environment variable based configuration

### 2. Input Validation

- VIN length validation (17 characters)
- Character validation (no I, O, Q)
- Server-side validation before API calls

### 3. Error Handling

- Comprehensive error messages
- Rate limiting protection
- Network error handling
- Invalid API key detection

## 📊 API Response Mapping

The API Ninjas response is mapped to the Vehicle interface:

| API Ninjas Field | Vehicle Field | Type |
|------------------|---------------|------|
| `make` | `make` | string |
| `model` | `model` | string |
| `year` | `year` | number |
| `trim` | `trim` | string |
| `engine_displacement` | `engineDisplacementL` | string |
| `cylinders` | `cylinders` | number |
| `drive_type` | `driveType` | string |
| `fuel_type` | `primaryFuelType` | string |
| `transmission` | `transmissionStyle` | string |
| `body_class` | `bodyClass` | string |
| `doors` | `doors` | number |
| `manufacturer` | `manufacturerName` | string |
| `plant_country` | `plantCountry` | string |
| `plant_state` | `plantState` | string |
| `plant_city` | `plantCity` | string |
| `engine_model` | `engineModel` | string |
| `engine_configuration` | `engineConfiguration` | string |
| `electrification_level` | `electrificationLevel` | string |
| `gvwr` | `gvwr` | string |

## 🚀 Testing

### 1. Test VINs

Use these sample VINs for testing:

```
1FM5K8D84KGB31890  # Ford F-150
1HGBH41JXMN109186   # Honda Accord
1G1ZT51806F123456   # Chevrolet Cobalt
```

### 2. Standalone Demo

The `VinLookupDemo` component can be used for testing:

```tsx
import VinLookupDemo from './components/VinLookupDemo';

function App() {
  return (
    <div>
      <VinLookupDemo 
        onVehicleFound={(vehicle) => console.log('Vehicle found:', vehicle)} 
      />
    </div>
  );
}
```

## 🔄 Migration from Gemini

### What Changed

1. **Service Replacement**: `decodeVinWithGemini()` → `decodeVinWithApiNinjas()`
2. **Validation**: Added `validateVin()` function
3. **Error Handling**: More specific error messages
4. **Response Mapping**: Direct API response mapping instead of AI parsing

### Benefits

1. **Reliability**: Direct API calls instead of AI interpretation
2. **Speed**: Faster response times
3. **Accuracy**: Structured data from official VIN database
4. **Cost**: No AI API costs
5. **Consistency**: Predictable response format

## 🛠️ Troubleshooting

### Common Issues

1. **"API_NINJAS_KEY environment variable is not set"**
   - Ensure `.env` file exists with the correct API key
   - Restart the proxy server after adding the key

2. **"Invalid VIN format"**
   - VIN must be exactly 17 characters
   - Cannot contain I, O, or Q
   - Use only letters and numbers

3. **"Could not decode VIN"**
   - Check if the VIN exists in the database
   - Verify the VIN format
   - Try a different VIN for testing

4. **Rate limiting errors**
   - API Ninjas has rate limits
   - Wait before making additional requests
   - Consider implementing request caching

### Debug Mode

Enable debug logging by adding to your environment:

```bash
DEBUG=vin-lookup
```

## 📝 API Documentation

For more information about the API Ninjas VIN Lookup service:

- **API Documentation**: https://api-ninjas.com/api/vinlookup
- **Rate Limits**: Check your API plan limits
- **Response Format**: JSON with vehicle details

## 🔮 Future Enhancements

Potential improvements for the VIN lookup system:

1. **Caching**: Cache VIN lookups to reduce API calls
2. **Batch Processing**: Support for multiple VIN lookups
3. **Offline Support**: Store common VIN patterns locally
4. **Enhanced Validation**: VIN checksum validation
5. **Multiple Providers**: Fallback to other VIN lookup services 