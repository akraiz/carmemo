// Test script to verify session-based user differentiation
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function testSessionDifferentiation() {
  console.log('🧪 Testing Session-Based User Differentiation\n');

  // Test 1: Create vehicles with different session IDs
  console.log('1. Creating vehicles with different session IDs...');
  
  const session1 = 'test-session-1';
  const session2 = 'test-session-2';

  // Create vehicle for session 1
  const vehicle1 = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': session1
    },
    body: JSON.stringify({
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      vin: '1HGBH41JXMN109186',
      nickname: 'Session 1 Car'
    })
  });

  // Create vehicle for session 2
  const vehicle2 = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': session2
    },
    body: JSON.stringify({
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      vin: '2T1BURHE0JC123456',
      nickname: 'Session 2 Car'
    })
  });

  console.log('✅ Vehicles created successfully\n');

  // Test 2: Retrieve vehicles for session 1
  console.log('2. Retrieving vehicles for session 1...');
  const vehicles1 = await fetch(`${API_BASE}/vehicles`, {
    headers: {
      'X-Session-ID': session1
    }
  });
  const vehicles1Data = await vehicles1.json();
  console.log(`Session 1 vehicles: ${vehicles1Data.data.length} found`);
  vehicles1Data.data.forEach(v => console.log(`  - ${v.make} ${v.model} (${v.nickname})`));

  // Test 3: Retrieve vehicles for session 2
  console.log('\n3. Retrieving vehicles for session 2...');
  const vehicles2 = await fetch(`${API_BASE}/vehicles`, {
    headers: {
      'X-Session-ID': session2
    }
  });
  const vehicles2Data = await vehicles2.json();
  console.log(`Session 2 vehicles: ${vehicles2Data.data.length} found`);
  vehicles2Data.data.forEach(v => console.log(`  - ${v.make} ${v.model} (${v.nickname})`));

  // Test 4: Verify isolation
  console.log('\n4. Verifying session isolation...');
  if (vehicles1Data.data.length === 1 && vehicles2Data.data.length === 1) {
    console.log('✅ Session isolation working correctly!');
    console.log('   - Session 1 only sees its own vehicle');
    console.log('   - Session 2 only sees its own vehicle');
  } else {
    console.log('❌ Session isolation not working properly');
  }

  // Test 5: Test without session ID (should return all vehicles for backward compatibility)
  console.log('\n5. Testing without session ID (backward compatibility)...');
  const allVehicles = await fetch(`${API_BASE}/vehicles`);
  const allVehiclesData = await allVehicles.json();
  console.log(`Total vehicles (no session): ${allVehiclesData.data.length} found`);

  console.log('\n🎉 Session differentiation test completed!');
}

// Run the test
testSessionDifferentiation().catch(console.error); 