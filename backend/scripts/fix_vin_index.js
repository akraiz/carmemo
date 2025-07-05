const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/carmemo';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix the VIN index
const fixVinIndex = async () => {
  try {
    console.log('🔧 Fixing VIN index...');
    
    // Get the Vehicle collection
    const db = mongoose.connection.db;
    const collection = db.collection('vehicles');
    
    // Drop the existing unique index
    console.log('📋 Dropping existing VIN index...');
    try {
      await collection.dropIndex('vin_1_owner_1');
      console.log('✅ Dropped existing VIN index');
    } catch (error) {
      console.log('ℹ️  No existing VIN index to drop');
    }
    
    // Create new partial unique index
    console.log('📋 Creating new partial VIN index...');
    await collection.createIndex(
      { vin: 1, owner: 1 }, 
      { 
        unique: true, 
        partialFilterExpression: { vin: { $ne: null } },
        name: 'vin_1_owner_1_partial'
      }
    );
    console.log('✅ Created new partial VIN index');
    
    // Verify the index
    console.log('📋 Verifying index...');
    const indexes = await collection.indexes();
    const vinIndex = indexes.find(index => index.name === 'vin_1_owner_1_partial');
    
    if (vinIndex) {
      console.log('✅ Index verification successful');
      console.log('📊 Index details:', {
        name: vinIndex.name,
        unique: vinIndex.unique,
        partialFilterExpression: vinIndex.partialFilterExpression
      });
    } else {
      console.log('❌ Index verification failed');
    }
    
  } catch (error) {
    console.error('❌ Error fixing VIN index:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await fixVinIndex();
    console.log('🎉 VIN index fix completed successfully!');
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixVinIndex }; 