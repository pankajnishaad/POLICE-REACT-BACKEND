/**
 * routes/statsRoutes.js
 * ─────────────────────────────────────────────────────────────
 * Route: GET /api/stats
 *
 * Returns ONLY aggregated counts from MongoDB.
 * Individual report documents are NEVER exposed.
 * The description (free-text) field is never selected.
 *
 * All aggregation pipelines run in parallel via Promise.all()
 * for optimal response time.
 * ─────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();

const Report          = require('../models/Report');
const { statsLimiter } = require('../middleware/rateLimiter');

// ── GET /api/stats ────────────────────────────────────────────
router.get('/', statsLimiter, async (req, res, next) => {
  try {

    /**
     * Run all aggregation pipelines in parallel.
     * MongoDB executes each as an independent pipeline — no shared
     * cursor state, so parallel execution is safe and efficient.
     */
    const [
      total,
      byState,
      byViolence,
      byMotive,
      byMotiveType,
      byReligious,
      byTime,
      byGender,
      byAge,
      byContext,
      byOfficerCount,
      byIncidentMonth,
    ] = await Promise.all([

      // ── Total report count ──────────────────────────────────
      Report.countDocuments(),

      // ── Reports per state (ranked) ──────────────────────────
      Report.aggregate([
        { $group: { _id: '$state', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
        { $project: { _id: 1, count: 1 } },
      ]),

      // ── Violence types (array field, unwound) ───────────────
      Report.aggregate([
        { $unwind: '$violenceTypes' },
        { $group:  { _id: '$violenceTypes', count: { $sum: 1 } } },
        { $sort:   { count: -1 } },
      ]),

      // ── Motive present distribution ─────────────────────────
      Report.aggregate([
        { $group: { _id: '$motivePresent', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      // ── Motive types (only among "Yes" reports) ─────────────
      Report.aggregate([
        { $match:  { motivePresent: 'Yes' } },
        { $unwind: '$motiveTypes' },
        { $group:  { _id: '$motiveTypes', count: { $sum: 1 } } },
        { $sort:   { count: -1 } },
      ]),

      // ── Religious motive details ────────────────────────────
      Report.aggregate([
        {
          $unwind: {
            path: '$religiousDetails',
            preserveNullAndEmptyArrays: false,
          },
        },
        { $group: { _id: '$religiousDetails', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      // ── Time of day distribution ────────────────────────────
      Report.aggregate([
        { $group: { _id: '$timeOfDay', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      // ── Gender distribution ─────────────────────────────────
      Report.aggregate([
        { $group: { _id: '$gender', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      // ── Age group distribution ──────────────────────────────
      Report.aggregate([
        { $group: { _id: '$ageGroup', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      // ── Context / occasion ──────────────────────────────────
      Report.aggregate([
        { $group: { _id: '$context', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      // ── Number of officers involved ─────────────────────────
      Report.aggregate([
        { $group: { _id: '$officerCount', count: { $sum: 1 } } },
        { $sort:  { count: -1 } },
      ]),

      // ── Monthly trend (last 12 months) ──────────────────────
      Report.aggregate([
        { $group:   { _id: '$incidentMonth', count: { $sum: 1 } } },
        { $sort:    { _id: -1 } },
        { $limit:   12 },
        { $project: { _id: 1, count: 1 } },
      ]),

    ]);

    // ── Compute summary KPIs ─────────────────────────────────
    const religiousCount =
      byMotiveType.find((x) => x._id === 'Religious')?.count || 0;

    const religiousPct = total > 0
      ? Math.round((religiousCount / total) * 100)
      : 0;

    const topViolenceType = byViolence[0]?._id || null;
    const topState        = byState[0]?._id    || null;

    // ── Respond ───────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        // KPI summary
        summary: {
          total,
          religiousPct,
          topViolenceType,
          topState,
        },
        // Detailed breakdowns
        byState,
        byViolence,
        byMotive,
        byMotiveType,
        byReligious,
        byTime,
        byGender,
        byAge,
        byContext,
        byOfficerCount,
        byIncidentMonth,
      },
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
