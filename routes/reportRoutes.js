/**
 * routes/reportRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Route: POST /api/report
 *
 * Accepts an anonymous police violence report, validates it,
 * sanitises the free-text field, and saves it to MongoDB.
 *
 * Returns 201 on success. Never returns any stored data back
 * to the client — the response is a simple acknowledgement.
 * ─────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();

const Report                     = require('../models/Report');
const { reportLimiter }          = require('../middleware/rateLimiter');
const { sanitizeDescription }    = require('../middleware/sanitize');

// ── POST /api/report ──────────────────────────────────────────
router.post('/', reportLimiter, async (req, res, next) => {
  try {
    const {
      state,
      cityRegion,
      incidentMonth,
      timeOfDay,
      violenceTypes,
      motivePresent,
      motiveTypes,
      religiousDetails,
      gender,
      ageGroup,
      context,
      officerCount,
      description,
    } = req.body;

    // ── Build the document ────────────────────────────────────
    const reportData = {
      state,
      cityRegion:    cityRegion || '',
      incidentMonth,
      timeOfDay,
      violenceTypes: Array.isArray(violenceTypes) ? violenceTypes : [],
      motivePresent,

      // Conditional fields — only stored when relevant
      motiveTypes: motivePresent === 'Yes' && Array.isArray(motiveTypes)
        ? motiveTypes
        : [],

      religiousDetails:
        Array.isArray(motiveTypes) &&
        motiveTypes.includes('Religious') &&
        Array.isArray(religiousDetails)
          ? religiousDetails
          : [],

      gender,
      ageGroup:     ageGroup     || 'Not specified',
      context,
      officerCount,

      // Free text is sanitised before storage
      description: sanitizeDescription(description),
    };

    // ── Validate & save via Mongoose ──────────────────────────
    // Mongoose schema validators run automatically on save().
    // Any ValidationError is caught and forwarded to errorHandler.
    const report = new Report(reportData);
    await report.save();

    // ── Respond: acknowledge only — return NO stored data ─────
    return res.status(201).json({
      success: true,
      message: 'Report submitted anonymously. Thank you.',
    });

  } catch (err) {
    next(err);   // forwarded to middleware/errorHandler.js
  }
});

module.exports = router;
