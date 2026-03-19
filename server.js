/**
 * server.js
 * ─────────────────────────────────────────────────────────────
 * Entry point for the Express API server.
 *
 * Responsibilities:
 *  1. Load environment variables
 *  2. Connect to MongoDB
 *  3. Configure middleware (security, CORS, parsing)
 *  4. Mount route handlers
 *  5. Mount error handler
 *  6. Start listening
 * ─────────────────────────────────────────────────────────────
 */
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);
require('dotenv').config();

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');

const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const reportRoutes = require('./routes/reportRoutes');
const statsRoutes  = require('./routes/statsRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Connect MongoDB
connectDB();

const app = express();

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim());

// Log CORS configuration on startup
console.log('─────────────────────────────────────────────');
console.log(`🔒  CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('─────────────────────────────────────────────');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // In production, check against allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.error(`❌ CORS blocked origin: ${origin}`);
    callback(new Error(`CORS: origin '${origin}' not allowed.`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

// Trust proxy in production (nginx / Cloudflare)
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// Routes
app.use('/api/report', reportRoutes);
app.use('/api/stats',  statsRoutes);
app.use('/api/health', healthRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralised error handler — must be last
app.use(errorHandler);

// Start
const PORT = parseInt(process.env.PORT, 10) || 4000;
app.listen(PORT, () => {
  console.log('─────────────────────────────────────────────');
  console.log(`🚀  API Server    → http://localhost:${PORT}`);
  console.log(`🩺  Health check  → http://localhost:${PORT}/api/health`);
  console.log(`🌍  Environment   → ${process.env.NODE_ENV || 'development'}`);
  console.log('─────────────────────────────────────────────');
});

module.exports = app;
