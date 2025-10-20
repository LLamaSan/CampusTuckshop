import mongoose from 'mongoose';

// This caching logic is crucial for serverless environments.
// It prevents creating a new database connection on every API call.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log("Using cached MongoDB connection.");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Recommended for serverless environments
    };

    console.log("Creating new MongoDB connection promise.");
    // Make sure MONGODB_URI is set in your Vercel environment variables
    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      console.log("New MongoDB connection established.");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Clear the promise on error so we can try again
    console.error("MongoDB connection error:", e);
    throw e; // Re-throw the error to fail the function
  }

  return cached.conn;
}

export default connectDB;
