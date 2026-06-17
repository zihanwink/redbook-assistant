import jsonDb from './json.js';
import mongoDb, { connectMongo } from './mongo.js';

let currentDb = null;

export async function initDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (mongoUri) {
    try {
      await connectMongo(mongoUri);
      currentDb = mongoDb;
      console.log('Using MongoDB database');
    } catch (err) {
      console.error('MongoDB connection failed, falling back to JSON:', err.message);
      currentDb = jsonDb;
    }
  } else {
    currentDb = jsonDb;
    console.log('Using JSON file database');
  }
  
  return currentDb;
}

export function getDb() {
  if (!currentDb) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return currentDb;
}

export default { initDatabase, getDb };
