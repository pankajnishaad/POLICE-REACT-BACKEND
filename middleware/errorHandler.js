/**
 * middleware/errorHandler.js
 * ─────────────────────────────────────────────────────────────
 * Centralised Express error-handling middleware.
 * Must be registered LAST in the middleware chain (after routes).
 *
 * Handles:
 *  - Mongoose ValidationError  → 400
 *  - Mongoose CastError        → 400
 *  - Mongoose duplicate key    → 409
 *  - Generic server errors     → 500
 *
 * Never leaks stack traces to the client in production.
 * ─────────────────────────────────────────────────────────────
 */

const { Error: MongooseError } = require('mongoose');

/**
 * Format a Mongoose ValidationError into a human-readable string.
 * @param {import('mongoose').Error.ValidationError} err
 * @returns {string}
 */
const formatValidationError = (err) =>
  Object.values(err.errors)
    .map((e) => e.message)
    .join(' | ');

/**
 * Central error handler.
 * Express identifies it as an error handler because it has 4 parameters.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';

  // Log every error server-side (never to client)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err.message);

  // ── Mongoose: field-level validation failure ──────────────
  if (err instanceof MongooseError.ValidationError) {
    return res.status(400).json({
      success: false,
      error: formatValidationError(err),
    });
  }

  // ── Mongoose: invalid ObjectId cast ──────────────────────
  if (err instanceof MongooseError.CastError) {
    return res.status(400).json({
      success: false,
      error: `Invalid value for field '${err.path}'.`,
    });
  }

  // ── MongoDB: duplicate key (code 11000) ───────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `Duplicate value for '${field}'.`,
    });
  }

  // ── Custom application errors (thrown with .statusCode) ──
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // ── Fallback: generic 500 ─────────────────────────────────
  return res.status(500).json({
    success: false,
    error: 'An unexpected server error occurred. Please try again.',
    ...(isDev && { detail: err.message }),
  });
};

module.exports = errorHandler;
