import mongoose from 'mongoose';
import { env } from './env.js';

// Serverless-friendly: one cached connection promise per warm function instance.
let connecting = null;

export async function connectDB() {
  mongoose.set('strictQuery', true);
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    connecting = mongoose
      .connect(env.mongoUri, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: env.isVercel ? 5 : 10,
      })
      .then(() => mongoose.connection)
      .catch((err) => {
        connecting = null; // let the next request retry
        throw err;
      });
  }
  return connecting;
}

export async function disconnectDB() {
  connecting = null;
  await mongoose.disconnect();
}
