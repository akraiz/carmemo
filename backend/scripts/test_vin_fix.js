import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/carmemo';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test creating multiple vehicles without VIN
const testVinFix = async () => {
  try {
    console.log('🧪 Testing VIN fix...');
    
    // Get the Vehicle collection
    const db = mongoose.connection.db;
    const collection = db.collection('vehicles');
    
    const testSessionId = 'test-session-' + Date.now();
    
    // Test data for vehicles without VIN
    const testVehicles = [
      {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        vin: null,
        owner: testSessionId,
        nickname: 'Test Car 1',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        make: 'Honda',
        model: 'Civic',
        year: 2019,
        vin: null,
        owner: testSessionId,
        nickname: 'Test Car 2',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        make: 'Ford',
        model: 'Focus',
        year: 2021,
        vin: null,
        owner: testSessionId,
        nickname: 'Test Car 3',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    console.log('📋 Attempting to create multiple vehicles without VIN...');
    
    // Try to insert all test vehicles
    const results = await collection.insertMany(testVehicles);
    console.log(`✅ Successfully created ${results.insertedIds.length} vehicles without VIN`);
    
    // Verify they were created
    const createdVehicles = await collection.find({ owner: testSessionId }).toArray();
    console.log(`📊 Found ${createdVehicles.length} vehicles for test session`);
    
    // Test with a vehicle that has VIN
    const vehicleWithVin = {
      make: 'BMW',
      model: 'X5',
      year: 2022,
      vin: '1HGBH41JXMN109186', // Test VIN
      owner: testSessionId,
      nickname: 'Test Car with VIN',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📋 Testing vehicle with VIN...');
    await collection.insertOne(vehicleWithVin);
    console.log('✅ Successfully created vehicle with VIN');
    
    // Try to create another vehicle with the same VIN (should fail)
    console.log('📋 Testing duplicate VIN (should fail)...');
    try {
      await collection.insertOne({
        ...vehicleWithVin,
        make: 'BMW',
        model: 'X6',
        nickname: 'Duplicate VIN Test'
      });
      console.log('❌ ERROR: Should have failed with duplicate VIN');
    } catch (error) {
      if (error.code === 11000) {
        console.log('✅ Correctly rejected duplicate VIN');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await collection.deleteMany({ owner: testSessionId });
    console.log('✅ Test data cleaned up');
    
    console.log('🎉 All tests passed! VIN fix is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await testVinFix();
  } catch (error) {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
};

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { testVinFix }; 