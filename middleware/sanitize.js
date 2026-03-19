/**
 * middleware/sanitize.js
 * ─────────────────────────────────────────────────────────────
 * Free-text sanitisation for the description field.
 *
 * Purpose: reduce the risk of a reporter accidentally including
 * personally identifying information (names, badge numbers, etc.)
 * in their free-text description.
 *
 * IMPORTANT: This is a best-effort heuristic filter, NOT a
 * cryptographic privacy guarantee. A full deployment should
 * add server-side NLP (e.g. spaCy NER) for named-entity removal.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * Patterns to detect and redact.
 * Each entry has a `regex` and a `replacement` string.
 */
const REDACT_RULES = [
  // German & English capitalised names (heuristic: Title-case word ≥ 3 chars)
  {
    regex: /\b[A-ZÄÖÜ][a-zäöüß]{2,}\b/g,
    replacement: '[name]',
  },

  // Badge / personnel numbers (e.g. PHK12345, B-1234, 45678)
  {
    regex: /\b[A-Z]{0,4}-?\d{4,}\b/gi,
    replacement: '[id]',
  },

  // German phone numbers (+49 xxx, 0xxx xxxx)
  {
    regex: /(\+49|0)[0-9\s\-/]{7,}/g,
    replacement: '[phone]',
  },

  // Email addresses
  {
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: '[email]',
  },
];

/**
 * Apply all redaction rules to the given text.
 * @param {string} text - Raw free-text input from the reporter.
 * @returns {string}    - Redacted text, max 800 chars.
 */
const sanitizeDescription = (text = '') => {
  if (typeof text !== 'string') return '';

  let result = text.trim();

  for (const { regex, replacement } of REDACT_RULES) {
    result = result.replace(regex, replacement);
  }

  // Hard cap at 800 characters (matches schema maxlength)
  return result.slice(0, 800);
};

module.exports = { sanitizeDescription };
