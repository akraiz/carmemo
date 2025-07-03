const { MongoClient } = require('mongodb');

// Use the provided MongoDB Atlas connection string and update the database name to 'test'
const uri = 'mongodb+srv://akraiz:aScmA3OvOUnQ2jtA@testnumoor.2zlsf0h.mongodb.net/?retryWrites=true&w=majority&appName=TestNumoor';
const dbName = 'test';

async function fixVinIndex() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('vehicles');

    // Drop the old unique index on vin, if it exists
    try {
      await collection.dropIndex('vin_1');
      console.log('Dropped old unique index on vin');
    } catch (err) {
      if (err.codeName === 'IndexNotFound' || err.codeName === 'NamespaceNotFound') {
        console.log('No existing vin_1 index to drop or collection does not exist');
      } else {
        throw err;
      }
    }

    // Create the new partial unique index (only for vin that exists)
    await collection.createIndex(
      { vin: 1 },
      {
        unique: true,
        partialFilterExpression: { vin: { $exists: true } }
      }
    );
    console.log('Created new partial unique index on vin (only for existing vin, allows null/missing)');
  } finally {
    await client.close();
  }
}

fixVinIndex().catch(err => {
  console.error('Error updating vin index:', err);
  process.exit(1);
}); 