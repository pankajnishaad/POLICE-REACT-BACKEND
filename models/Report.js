/**
 * models/Report.js
 * ─────────────────────────────────────────────────────────────
 * Mongoose schema & model for anonymous police violence reports.
 *
 * Privacy guarantees enforced at the schema level:
 *  - No IP address field exists
 *  - toJSON transform strips _id and description from any
 *    object passed to res.json() — free text is write-only
 *  - All enum fields are validated server-side
 * ─────────────────────────────────────────────────────────────
 */

const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────

/**
 * Allowed German federal states (16 Bundesländer).
 */
const GERMAN_STATES = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hesse',
  'Mecklenburg-Vorpommern',
  'Lower Saxony',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Saxony',
  'Saxony-Anhalt',
  'Schleswig-Holstein',
  'Thuringia',
];

const VIOLENCE_TYPES = [
  'Physical force',
  'Disproportionate control',
  'Discrimination',
  'Verbal abuse',
  'Detention / arrest',
  'Search / raid',
  'Other',
];

const MOTIVE_TYPES = [
  'Religious',
  'Racist',
  'Political',
  'Appearance / clothing',
  'Other',
];

const RELIGIOUS_DETAILS = [
  'Clothing / symbols',
  'Police statements',
  'Targeted behavior',
  'Near religious site',
  'Other',
];

const GENDERS     = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const AGE_GROUPS  = ['Under 18', '18–25', '26–40', '41–60', '60+', 'Not specified'];
const TIME_OF_DAY = ['Morning', 'Daytime', 'Evening', 'Night'];
const CONTEXTS    = ['Stop / control', 'Demonstration', 'Traffic', 'Public space', 'Other'];
const OFFICER_COUNTS = ['1', '2–3', '4+', 'Unknown'];

// ── Main schema ───────────────────────────────────────────────

const reportSchema = new mongoose.Schema(
  {
    // ── Location & Time ──────────────────────────────────────
    state: {
      type: String,
      required: [true, 'State is required.'],
      enum: {
        values: GERMAN_STATES,
        message: '"{VALUE}" is not a valid German state.',
      },
      trim: true,
    },

    /**
     * City / region is intentionally coarse (e.g. "Munich north").
     * We store it but never use it in fine-grained aggregation.
     */
    cityRegion: {
      type: String,
      default: '',
      trim: true,
      maxlength: [100, 'City/region must be 100 characters or fewer.'],
    },

    /**
     * Stored as "YYYY-MM" string — precise enough for monthly
     * trend analysis, not precise enough to identify an individual.
     */
    incidentMonth: {
      type: String,
      required: [true, 'Incident month is required.'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'incidentMonth must be YYYY-MM format.'],
    },

    timeOfDay: {
      type: String,
      required: [true, 'Time of day is required.'],
      enum: {
        values: TIME_OF_DAY,
        message: '"{VALUE}" is not a valid time of day.',
      },
    },

    // ── Type of Violence ─────────────────────────────────────
    violenceTypes: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one violence type must be selected.',
      },
    },

    // ── Motive ───────────────────────────────────────────────
    motivePresent: {
      type: String,
      required: [true, 'Motive field is required.'],
      enum: {
        values: ['No', 'Unsure', 'Yes'],
        message: '"{VALUE}" is not a valid motive value.',
      },
    },

    motiveTypes: {
      type: [String],
      default: [],
    },

    religiousDetails: {
      type: [String],
      default: [],
    },

    // ── Victim (Anonymous) ───────────────────────────────────
    gender: {
      type: String,
      required: [true, 'Gender is required.'],
      enum: {
        values: GENDERS,
        message: '"{VALUE}" is not a valid gender option.',
      },
    },

    ageGroup: {
      type: String,
      default: 'Not specified',
      enum: {
        values: AGE_GROUPS,
        message: '"{VALUE}" is not a valid age group.',
      },
    },

    // ── Situation ────────────────────────────────────────────
    context: {
      type: String,
      required: [true, 'Context is required.'],
      enum: {
        values: CONTEXTS,
        message: '"{VALUE}" is not a valid context.',
      },
    },

    officerCount: {
      type: String,
      required: [true, 'Officer count is required.'],
      enum: {
        values: OFFICER_COUNTS,
        message: '"{VALUE}" is not a valid officer count.',
      },
    },

    // ── Free Text ────────────────────────────────────────────
    /**
     * Stored write-only. Stripped from all GET responses via
     * toJSON transform. An NLP/regex filter is applied before
     * storage to remove names and badge numbers.
     */
    description: {
      type: String,
      default: '',
      maxlength: [800, 'Description must be 800 characters or fewer.'],
    },

    // ── Metadata ─────────────────────────────────────────────
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,   // enables efficient time-range queries
    },
  },
  {
    versionKey: false,
    timestamps: false,

    /**
     * toJSON transform: strip sensitive / internal fields
     * from every object returned via res.json().
     * This is a defence-in-depth measure in addition to
     * never selecting description in aggregate queries.
     */
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        delete ret.description;
        return ret;
      },
    },
  }
);

// ── Indexes ───────────────────────────────────────────────────
// Compound index to speed up aggregation queries
reportSchema.index({ state: 1, submittedAt: -1 });
reportSchema.index({ motivePresent: 1 });
reportSchema.index({ violenceTypes: 1 });

// ── Static helpers ─────────────────────────────────────────────
reportSchema.statics.VALID_STATES    = GERMAN_STATES;
reportSchema.statics.VIOLENCE_TYPES  = VIOLENCE_TYPES;
reportSchema.statics.MOTIVE_TYPES    = MOTIVE_TYPES;
reportSchema.statics.RELIGIOUS_DETAILS = RELIGIOUS_DETAILS;
reportSchema.statics.GENDERS         = GENDERS;
reportSchema.statics.AGE_GROUPS      = AGE_GROUPS;
reportSchema.statics.TIME_OF_DAY     = TIME_OF_DAY;
reportSchema.statics.CONTEXTS        = CONTEXTS;
reportSchema.statics.OFFICER_COUNTS  = OFFICER_COUNTS;

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
