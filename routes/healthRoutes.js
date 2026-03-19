/**
 * routes/healthRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Route: GET /api/health
 *
 * Used by deployment platforms (Railway, Render, Docker, etc.)
 * to verify the service is alive and the DB is connected.
 * Returns HTTP 200 when healthy, 503 when degraded.
 * ─────────────────────────────────────────────────────────────
 */

const express  = require('express');
const mongoose = require('mongoose');
const router   = express.Router();

const MONGO_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

router.get('/', (req, res) => {
  const mongoState    = mongoose.connection.readyState;
  const mongoStatus   = MONGO_STATES[mongoState] || 'unknown';
  const isHealthy     = mongoState === 1;

  const payload = {
    status:    isHealthy ? 'ok' : 'degraded',
    service:   'police-report-api',
    version:   process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
    database: {
      status: mongoStatus,
    },
  };

  return res.status(isHealthy ? 200 : 503).json(payload);
});

module.exports = router;
