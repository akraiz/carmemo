// scripts/manage_vin_index.js
// Run this script to ensure the correct partial unique index on the 'vin' field in the vehicles collection.
// Usage: node scripts/manage_vin_index.js

const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/carmemo'; // Adjust as needed
const dbName = process.env.MONGODB_DB || 'carmemo'; // Adjust as needed

async function main() {
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('vehicles');

    // Drop the old unique index if it exists
    try {
      await collection.dropIndex('vin_1');
      console.log('Dropped old unique index on vin.');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('No old unique index on vin to drop.');
      } else {
        throw err;
      }
    }

    // Create the partial unique index
    await collection.createIndex(
      { vin: 1 },
      { unique: true, partialFilterExpression: { vin: { $ne: '' } } }
    );
    console.log('Created partial unique index on vin (unique only if vin != "").');
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Error managing vin index:', err);
  process.exit(1);
}); 