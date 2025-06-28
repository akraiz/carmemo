#!/usr/bin/env node

/**
 * Comprehensive Task Operations Test
 * Tests all CRUD operations for tasks with proper backend integration
 */

const API_BASE = 'http://localhost:3001/api';

// Test data
const testVehicle = {
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  vin: `TEST${Date.now()}`,
  nickname: 'Test Vehicle',
  currentMileage: 50000
};

const testTask = {
  title: 'Oil Change',
  category: 'Engine',
  status: 'Upcoming',
  dueDate: '2024-01-15',
  dueMileage: 55000,
  importance: 'Required',
  notes: 'Test task for API testing'
};

let vehicleId = null;
let taskId = null;

// Utility functions
const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const makeRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error || response.statusText}`);
  }
  
  return data;
};

// Test functions
const testCreateVehicle = async () => {
  log('🧪 Testing vehicle creation...');
  
  const response = await makeRequest('/vehicles', {
    method: 'POST',
    body: JSON.stringify(testVehicle),
  });
  
  if (response.success && response.data) {
    vehicleId = response.data._id;
    log('✅ Vehicle created successfully', { vehicleId });
    return true;
  } else {
    throw new Error('Failed to create vehicle');
  }
};

const testCreateTask = async () => {
  log('🧪 Testing task creation...');
  
  const response = await makeRequest(`/tasks/${vehicleId}`, {
    method: 'POST',
    body: JSON.stringify(testTask),
  });
  
  if (response.success && response.task) {
    taskId = response.task.id;
    log('✅ Task created successfully', { taskId, task: response.task });
    return true;
  } else {
    throw new Error('Failed to create task');
  }
};

const testGetVehicle = async () => {
  log('🧪 Testing vehicle retrieval...');
  
  const response = await makeRequest(`/vehicles/${vehicleId}`);
  
  if (response.success && response.data) {
    const tasks = response.data.maintenanceSchedule || [];
    log('✅ Vehicle retrieved successfully', { 
      vehicleId: response.data.id,
      taskCount: tasks.length,
      tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
    });
    return true;
  } else {
    throw new Error('Failed to retrieve vehicle');
  }
};

const testUpdateTask = async () => {
  log('🧪 Testing task update...');
  
  const updatedTask = {
    ...testTask,
    title: 'Oil Change - Updated',
    notes: 'Updated test task',
    status: 'Completed',
    completedDate: new Date().toISOString().slice(0, 10)
  };
  
  const response = await makeRequest(`/tasks/${vehicleId}/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(updatedTask),
  });
  
  if (response.success && response.task) {
    log('✅ Task updated successfully', { 
      taskId: response.task.id,
      title: response.task.title,
      status: response.task.status,
      completedDate: response.task.completedDate
    });
    return true;
  } else {
    throw new Error('Failed to update task');
  }
};

const testToggleTaskStatus = async () => {
  log('🧪 Testing task status toggle...');
  
  const toggleData = {
    status: 'Upcoming',
    completedDate: undefined
  };
  
  const response = await makeRequest(`/tasks/${vehicleId}/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(toggleData),
  });
  
  if (response.success && response.task) {
    log('✅ Task status toggled successfully', { 
      taskId: response.task.id,
      status: response.task.status,
      completedDate: response.task.completedDate
    });
    return true;
  } else {
    throw new Error('Failed to toggle task status');
  }
};

const testDeleteTask = async () => {
  log('🧪 Testing task deletion...');
  
  const response = await makeRequest(`/tasks/${vehicleId}/${taskId}`, {
    method: 'DELETE',
  });
  
  if (response.success) {
    log('✅ Task deleted successfully', { taskId });
    return true;
  } else {
    throw new Error('Failed to delete task');
  }
};

const testVerifyTaskDeleted = async () => {
  log('🧪 Verifying task deletion...');
  
  const response = await makeRequest(`/vehicles/${vehicleId}`);
  
  if (response.success && response.data) {
    const tasks = response.data.maintenanceSchedule || [];
    const deletedTask = tasks.find(t => t.id === taskId);
    
    if (!deletedTask) {
      log('✅ Task deletion verified - task no longer exists');
      return true;
    } else {
      throw new Error('Task still exists after deletion');
    }
  } else {
    throw new Error('Failed to verify task deletion');
  }
};

const testCleanup = async () => {
  log('🧪 Cleaning up test data...');
  
  try {
    await makeRequest(`/vehicles/${vehicleId}`, { method: 'DELETE' });
    log('✅ Test vehicle deleted successfully');
  } catch (error) {
    log('⚠️ Failed to delete test vehicle:', error.message);
  }
};

// Main test runner
const runTests = async () => {
  log('🚀 Starting comprehensive task operations test...');
  
  try {
    await testCreateVehicle();
    await testCreateTask();
    await testGetVehicle();
    await testUpdateTask();
    await testToggleTaskStatus();
    await testDeleteTask();
    await testVerifyTaskDeleted();
    
    log('🎉 All tests passed successfully!');
  } catch (error) {
    log('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await testCleanup();
    log('🏁 Test suite completed');
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testCreateVehicle,
  testCreateTask,
  testUpdateTask,
  testDeleteTask,
  testToggleTaskStatus
}; 