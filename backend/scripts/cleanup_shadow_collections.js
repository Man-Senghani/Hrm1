const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const isProd = process.argv.includes('production') || process.argv.includes('--prod');
const envPath = isProd 
  ? path.join(__dirname, '../../.env.production') 
  : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

let rawUri = (process.env.MONGODB_URI || process.env.MONGO_URI || '').trim().replace(/^['"]|['"]$/g, '');

if (!rawUri) {
  console.error('❌ MONGODB_URI is not defined in', envPath);
  process.exit(1);
}

async function runCleanup() {
  console.log('Connecting to database:', rawUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  await mongoose.connect(rawUri);
  console.log('✅ Connected to MongoDB successfully. Target Database:', mongoose.connection.name);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  console.log('Existing collections:', collectionNames);

  // 1. Drop hrs collection if present
  if (collectionNames.includes('hrs')) {
    console.log('🗑️ Dropping collection: hrs ...');
    await db.dropCollection('hrs');
    console.log('✅ Successfully dropped collection: hrs (and removed hrId_1 index).');
  } else {
    console.log('ℹ️ Collection "hrs" does not exist.');
  }

  // 2. Drop managers collection if present
  if (collectionNames.includes('managers')) {
    console.log('🗑️ Dropping collection: managers ...');
    await db.dropCollection('managers');
    console.log('✅ Successfully dropped collection: managers.');
  } else {
    console.log('ℹ️ Collection "managers" does not exist.');
  }

  console.log('\n🎉 Shadow collections cleanup complete! All users are now cleanly unified under "users" and "employees".');
  await mongoose.disconnect();
  process.exit(0);
}

runCleanup().catch(err => {
  console.error('❌ Error during cleanup:', err.message);
  process.exit(1);
});
