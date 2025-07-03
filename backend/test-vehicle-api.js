#!/usr/bin/env node

/**
 * Vehicle Management API Test Script
 * 
 * This script tests all vehicle management endpoints to ensure they work correctly.
 * Run with: node test-vehicle-api.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';
const TEST_VIN = '1HGBH41JXMN109186'; // Test VIN

// Test data
const testVehicle = {
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  vin: TEST_VIN,
  nickname: 'Test Vehicle',
  currentMileage: 50000,
  purchaseDate: '2020-01-15'
};

let createdVehicleId = null;

// Utility function to make API calls
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    console.log(`\n🔍 Testing: ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { response: null, data: null, error };
  }
}

// Test functions
async function testCreateVehicle() {
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Create Vehicle');
  console.log('🚗 ========================================');
  
  const { data } = await makeRequest('/vehicles', {
    method: 'POST',
    body: JSON.stringify(testVehicle)
  });
  
  if (data && data.success) {
    createdVehicleId = data.data._id;
    console.log(`✅ Vehicle created with ID: ${createdVehicleId}`);
    return true;
  } else {
    console.log('❌ Failed to create vehicle');
    return false;
  }
}

async function testGetAllVehicles() {
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Get All Vehicles');
  console.log('🚗 ========================================');
  
  const { data } = await makeRequest('/vehicles');
  
  if (data && data.success) {
    console.log(`✅ Found ${data.data.length} vehicles`);
    return true;
  } else {
    console.log('❌ Failed to get vehicles');
    return false;
  }
}

async function testGetVehicleById() {
  if (!createdVehicleId) {
    console.log('❌ No vehicle ID available for testing');
    return false;
  }
  
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Get Vehicle by ID');
  console.log('🚗 ========================================');
  
  const { data } = await makeRequest(`/vehicles/${createdVehicleId}`);
  
  if (data && data.success) {
    console.log(`✅ Vehicle found: ${data.data.make} ${data.data.model}`);
    return true;
  } else {
    console.log('❌ Failed to get vehicle by ID');
    return false;
  }
}

async function testGetVehicleByVin() {
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Get Vehicle by VIN');
  console.log('🚗 ========================================');
  
  const { data } = await makeRequest(`/vehicles/vin/${TEST_VIN}`);
  
  if (data && data.success) {
    console.log(`✅ Vehicle found by VIN: ${data.data.make} ${data.data.model}`);
    return true;
  } else {
    console.log('❌ Failed to get vehicle by VIN');
    return false;
  }
}

async function testUpdateVehicle() {
  if (!createdVehicleId) {
    console.log('❌ No vehicle ID available for testing');
    return false;
  }
  
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Update Vehicle');
  console.log('🚗 ========================================');
  
  const updateData = {
    nickname: 'Updated Test Vehicle',
    currentMileage: 55000
  };
  
  const { data } = await makeRequest(`/vehicles/${createdVehicleId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
  
  if (data && data.success) {
    console.log(`✅ Vehicle updated: ${data.data.nickname}`);
    return true;
  } else {
    console.log('❌ Failed to update vehicle');
    return false;
  }
}

async function testSearchVehicles() {
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Search Vehicles');
  console.log('🚗 ========================================');
  
  const { data } = await makeRequest('/vehicles/search?make=toyota&year=2020');
  
  if (data && data.success) {
    console.log(`✅ Search completed: Found ${data.data.length} vehicles`);
    return true;
  } else {
    console.log('❌ Failed to search vehicles');
    return false;
  }
}

async function testGetVehicleStats() {
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Get Vehicle Statistics');
  console.log('🚗 ========================================');
  
  const { data } = await makeRequest('/vehicles/stats');
  
  if (data && data.success) {
    console.log(`✅ Stats retrieved: ${data.data.totalVehicles} total vehicles`);
    return true;
  } else {
    console.log('❌ Failed to get vehicle stats');
    return false;
  }
}

async function testDeleteVehicle() {
  if (!createdVehicleId) {
    console.log('❌ No vehicle ID available for testing');
    return false;
  }
  
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Delete Vehicle');
  console.log('🚗 ========================================');
  
  const { data } = await makeRequest(`/vehicles/${createdVehicleId}`, {
    method: 'DELETE'
  });
  
  if (data && data.success) {
    console.log(`✅ Vehicle deleted successfully`);
    return true;
  } else {
    console.log('❌ Failed to delete vehicle');
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🚗 ========================================');
  console.log('🚗 Testing: Error Handling');
  console.log('🚗 ========================================');
  
  // Test invalid VIN
  console.log('\n🔍 Testing invalid VIN...');
  const invalidVehicle = { ...testVehicle, vin: 'INVALID' };
  await makeRequest('/vehicles', {
    method: 'POST',
    body: JSON.stringify(invalidVehicle)
  });
  
  // Test missing required fields
  console.log('\n🔍 Testing missing required fields...');
  const incompleteVehicle = { make: 'Toyota' };
  await makeRequest('/vehicles', {
    method: 'POST',
    body: JSON.stringify(incompleteVehicle)
  });
  
  // Test non-existent vehicle
  console.log('\n🔍 Testing non-existent vehicle...');
  await makeRequest('/vehicles/507f1f77bcf86cd799439011');
  
  console.log('✅ Error handling tests completed');
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Vehicle Management API Tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  
  const tests = [
    { name: 'Create Vehicle', fn: testCreateVehicle },
    { name: 'Get All Vehicles', fn: testGetAllVehicles },
    { name: 'Get Vehicle by ID', fn: testGetVehicleById },
    { name: 'Get Vehicle by VIN', fn: testGetVehicleByVin },
    { name: 'Update Vehicle', fn: testUpdateVehicle },
    { name: 'Search Vehicles', fn: testSearchVehicles },
    { name: 'Get Vehicle Stats', fn: testGetVehicleStats },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'Delete Vehicle', fn: testDeleteVehicle }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      results.push({ name: test.name, success });
    } catch (error) {
      console.error(`❌ Test "${test.name}" failed with error:`, error.message);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n📊 ========================================');
  console.log('📊 Test Results Summary');
  console.log('📊 ========================================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n📈 Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Vehicle Management API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
}

// Check if server is running
async function checkServerHealth() {
  try {
    const response = await fetch(`${BASE_URL.replace('/api', '')}/health`);
    if (response.ok) {
      console.log('✅ Server is running and healthy');
      return true;
    } else {
      console.log('❌ Server is not responding correctly');
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('   Run: npm start (in the backend directory)');
    return false;
  }
}

// Run the tests
async function main() {
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    process.exit(1);
  }
  
  await runTests();
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
} 