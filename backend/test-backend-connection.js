#!/usr/bin/env node

// Simple test script to verify backend connectivity
const fetch = (await import('node-fetch')).default;

const BASE_URL = 'http://localhost:3001';

async function testBackendConnection() {
  console.log('🔍 Testing backend connection...');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check successful:', healthData);
    
    // Test vehicles endpoint
    console.log('2. Testing vehicles endpoint...');
    const vehiclesResponse = await fetch(`${BASE_URL}/api/vehicles`);
    const vehiclesData = await vehiclesResponse.json();
    console.log('✅ Vehicles endpoint working:', vehiclesData);
    
    // Test creating a vehicle
    console.log('3. Testing vehicle creation...');
    const testVehicle = {
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      vin: '1HGBH41JXMN109186',
      nickname: 'Test Vehicle',
      currentMileage: 50000
    };
    
    const createResponse = await fetch(`${BASE_URL}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testVehicle),
    });
    
    const createData = await createResponse.json();
    console.log('✅ Vehicle creation test:', createData);
    
    if (createData.success) {
      console.log('🎉 Backend is working correctly!');
    } else {
      console.log('⚠️ Vehicle creation failed:', createData.error);
    }
    
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    console.log('💡 Make sure the backend is running on port 3001');
    console.log('💡 Run: npm start in the backend directory');
  }
}

testBackendConnection(); 