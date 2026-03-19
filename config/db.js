/**
 * config/db.js
 * ─────────────────────────────────────────────────────────────
 * MongoDB connection using Mongoose.
 * Handles reconnection, logging, and graceful shutdown.
 * ─────────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,   // fail fast if DB unreachable
  socketTimeoutMS: 45000,
  maxPoolSize: 10,                  // max concurrent connections
};

/**
 * Masks credentials from the URI for safe logging.
 * mongodb+srv://user:pass@host → mongodb+srv://***@host
 */
const maskURI = (uri) => uri.replace(/\/\/[^@]+@/, '//***@');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('❌  MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, MONGO_OPTIONS);
    console.log(`✅  MongoDB connected → ${maskURI(uri)}`);
  } catch (err) {
    console.error(`❌  MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  // Connection event listeners
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️   MongoDB disconnected. Attempting reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄  MongoDB reconnected.');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`❌  MongoDB runtime error: ${err.message}`);
  });
};

/**
 * Gracefully close the DB connection on process exit.
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑  ${signal} received. Closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log('✅  MongoDB connection closed. Exiting.');
  process.exit(0);
};

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = connectDB;
