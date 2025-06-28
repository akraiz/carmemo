#!/usr/bin/env node

/**
 * Frontend-Backend Integration Test Script
 * 
 * This script tests the integration between the frontend and backend
 * by making API calls to verify all endpoints are working correctly.
 */

const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001/api';
const TEST_VEHICLE = {
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  vin: '1HGBH41JXMN109186',
  nickname: 'Test Vehicle',
  currentMileage: 50000,
  purchaseDate: '2020-01-15'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const test = async (name, testFn) => {
  try {
    log(`Running test: ${name}`);
    await testFn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
    log(`Test passed: ${name}`, 'success');
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
    log(`Test failed: ${name} - ${error.message}`, 'error');
  }
};

const makeRequest = async (endpoint, options = {}) => {
  const url = `${BACKEND_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const finalOptions = { ...defaultOptions, ...options };
  const response = await fetch(url, finalOptions);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return data;
};

// Test functions
const testHealthCheck = async () => {
  const response = await makeRequest('/health');
  if (!response.status || response.status !== 'ok') {
    throw new Error('Health check failed');
  }
};

const testCreateVehicle = async () => {
  const response = await makeRequest('/vehicles', {
    method: 'POST',
    body: JSON.stringify(TEST_VEHICLE),
  });

  if (!response.success || !response.data) {
    throw new Error('Failed to create vehicle');
  }

  return response.data._id || response.data.id;
};

const testGetAllVehicles = async () => {
  const response = await makeRequest('/vehicles');
  
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Failed to get vehicles');
  }

  return response.data;
};

const testGetVehicleById = async (vehicleId) => {
  const response = await makeRequest(`/vehicles/${vehicleId}`);
  
  if (!response.success || !response.data) {
    throw new Error('Failed to get vehicle by ID');
  }

  return response.data;
};

const testGetVehicleByVin = async () => {
  const response = await makeRequest(`/vehicles/vin/${TEST_VEHICLE.vin}`);
  
  if (!response.success || !response.data) {
    throw new Error('Failed to get vehicle by VIN');
  }

  return response.data;
};

const testUpdateVehicle = async (vehicleId) => {
  const updateData = {
    nickname: 'Updated Test Vehicle',
    currentMileage: 55000
  };

  const response = await makeRequest(`/vehicles/${vehicleId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });

  if (!response.success || !response.data) {
    throw new Error('Failed to update vehicle');
  }

  return response.data;
};

const testSearchVehicles = async () => {
  const response = await makeRequest('/vehicles/search?make=Toyota');
  
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Failed to search vehicles');
  }

  return response.data;
};

const testGetVehicleStats = async () => {
  const response = await makeRequest('/vehicles/stats');
  
  if (!response.success || !response.data) {
    throw new Error('Failed to get vehicle stats');
  }

  return response.data;
};

const testAddTask = async (vehicleId) => {
  const task = {
    title: 'Oil Change',
    category: 'Oil Change',
    status: 'Upcoming',
    dueDate: '2024-02-15',
    dueMileage: 60000,
    importance: 'Required',
    creationDate: new Date().toISOString()
  };

  const response = await makeRequest(`/tasks/${vehicleId}`, {
    method: 'POST',
    body: JSON.stringify(task),
  });

  if (!response.success || !response.data) {
    throw new Error('Failed to add task');
  }

  return response.data._id || response.data.id;
};

const testUpdateTask = async (vehicleId, taskId) => {
  const updateData = {
    status: 'Completed',
    completedDate: new Date().toISOString()
  };

  const response = await makeRequest(`/tasks/${vehicleId}/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });

  if (!response.success || !response.data) {
    throw new Error('Failed to update task');
  }

  return response.data;
};

const testGetTasks = async (vehicleId) => {
  const response = await makeRequest(`/tasks/${vehicleId}`);
  
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error('Failed to get tasks');
  }

  return response.data;
};

const testDeleteTask = async (vehicleId, taskId) => {
  const response = await makeRequest(`/tasks/${vehicleId}/${taskId}`, {
    method: 'DELETE',
  });

  if (!response.success) {
    throw new Error('Failed to delete task');
  }

  return response.data;
};

const testDeleteVehicle = async (vehicleId) => {
  const response = await makeRequest(`/vehicles/${vehicleId}`, {
    method: 'DELETE',
  });

  if (!response.success) {
    throw new Error('Failed to delete vehicle');
  }

  return response.data;
};

const testVinLookup = async () => {
  const response = await makeRequest('/vin-lookup', {
    method: 'POST',
    body: JSON.stringify({ vin: TEST_VEHICLE.vin }),
  });

  if (!response.success) {
    throw new Error('Failed to lookup VIN');
  }

  return response.data;
};

const testGetRecalls = async () => {
  const response = await makeRequest(`/recall/${TEST_VEHICLE.vin}`);
  
  if (!response.success) {
    throw new Error('Failed to get recalls');
  }

  return response.data;
};

const testMaintenanceSchedule = async () => {
  const response = await makeRequest('/maintenance-schedule', {
    method: 'POST',
    body: JSON.stringify({
      make: TEST_VEHICLE.make,
      model: TEST_VEHICLE.model,
      year: TEST_VEHICLE.year
    }),
  });

  if (!response.success) {
    throw new Error('Failed to get maintenance schedule');
  }

  return response.data;
};

// Main test runner
const runTests = async () => {
  log('🚀 Starting Frontend-Backend Integration Tests');
  log(`Backend URL: ${BACKEND_URL}`);
  log('');

  let createdVehicleId = null;
  let createdTaskId = null;

  // Health check
  await test('Health Check', testHealthCheck);

  // Vehicle management tests
  await test('Create Vehicle', async () => {
    createdVehicleId = await testCreateVehicle();
  });

  await test('Get All Vehicles', testGetAllVehicles);

  await test('Get Vehicle by ID', async () => {
    if (!createdVehicleId) throw new Error('No vehicle ID available');
    await testGetVehicleById(createdVehicleId);
  });

  await test('Get Vehicle by VIN', testGetVehicleByVin);

  await test('Update Vehicle', async () => {
    if (!createdVehicleId) throw new Error('No vehicle ID available');
    await testUpdateVehicle(createdVehicleId);
  });

  await test('Search Vehicles', testSearchVehicles);

  await test('Get Vehicle Stats', testGetVehicleStats);

  // Task management tests
  await test('Add Task', async () => {
    if (!createdVehicleId) throw new Error('No vehicle ID available');
    createdTaskId = await testAddTask(createdVehicleId);
  });

  await test('Get Tasks', async () => {
    if (!createdVehicleId) throw new Error('No vehicle ID available');
    await testGetTasks(createdVehicleId);
  });

  await test('Update Task', async () => {
    if (!createdVehicleId || !createdTaskId) throw new Error('No vehicle or task ID available');
    await testUpdateTask(createdVehicleId, createdTaskId);
  });

  await test('Delete Task', async () => {
    if (!createdVehicleId || !createdTaskId) throw new Error('No vehicle or task ID available');
    await testDeleteTask(createdVehicleId, createdTaskId);
  });

  // Additional service tests
  await test('VIN Lookup', testVinLookup);

  await test('Get Recalls', testGetRecalls);

  await test('Get Maintenance Schedule', testMaintenanceSchedule);

  // Cleanup
  await test('Delete Vehicle', async () => {
    if (!createdVehicleId) throw new Error('No vehicle ID available');
    await testDeleteVehicle(createdVehicleId);
  });

  // Summary
  log('');
  log('📊 Test Results Summary');
  log(`Total Tests: ${results.passed + results.failed}`);
  log(`Passed: ${results.passed}`, 'success');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');

  if (results.failed > 0) {
    log('');
    log('❌ Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => log(`  - ${t.name}: ${t.error}`, 'error'));
  }

  log('');
  if (results.failed === 0) {
    log('🎉 All tests passed! Frontend-Backend integration is working correctly.', 'success');
  } else {
    log('⚠️  Some tests failed. Please check the backend configuration and try again.', 'error');
    process.exit(1);
  }
};

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runTests, test, makeRequest }; 