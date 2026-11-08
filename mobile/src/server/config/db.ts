import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded regardless of current working directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * MongoDB Atlas Connection Singleton
 * Caches the active mongoose connection across Expo Router API route invocations
 * to prevent opening redundant sockets in Node.js server runtimes.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not defined in environment variables. Please check your mobile/.env file.'
    );
  }

  // If already connected and socket is open, return active connection
  if (mongoose.connection.readyState === 1) {
    cached!.conn = mongoose;
    return mongoose;
  }

  // If disconnected or never connected, initiate connection
  if (!cached!.promise || mongoose.connection.readyState === 0) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    cached!.conn = null;
    throw e;
  }

  return cached!.conn;
}
