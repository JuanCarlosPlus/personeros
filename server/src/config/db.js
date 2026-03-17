import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB() {
  const conn = await mongoose.connect(config.mongoUri);
  console.log(`✅ MongoDB conectado: ${conn.connection.host}/${conn.connection.name}`);
}
