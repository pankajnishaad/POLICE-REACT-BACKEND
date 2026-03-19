/**
 * middleware/rateLimiter.js
 * ─────────────────────────────────────────────────────────────
 * Express rate-limiting middleware using express-rate-limit.
 *
 * Two limiters are exported:
 *  - reportLimiter  → applied to POST /api/report
 *  - statsLimiter   → applied to GET  /api/stats
 *
 * In production, set trust proxy so the real client IP
 * is read from X-Forwarded-For (needed behind nginx/Cloudflare).
 * ─────────────────────────────────────────────────────────────
 */

const rateLimit = require('express-rate-limit');

/**
 * Shared handler for when a limit is exceeded.
 * Returns JSON (not HTML) so the React client can parse it.
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    success: false,
    error: 'Too many requests from this IP address. Please try again later.',
  });
};

/**
 * POST /api/report
 * Max 20 submissions per IP per hour.
 * Prevents spam while allowing legitimate repeated use.
 */
const reportLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,   // 1 hour
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => req.ip,
  skip:            () => process.env.NODE_ENV === 'test',
});

/**
 * GET /api/stats
 * Max 120 requests per IP per minute (dashboard polling guard).
 */
const statsLimiter = rateLimit({
  windowMs:        60 * 1000,        // 1 minute
  max:             120,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  skip:            () => process.env.NODE_ENV === 'test',
});

module.exports = { reportLimiter, statsLimiter };
