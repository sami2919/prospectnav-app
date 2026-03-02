/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} company_name
 * @property {string} user_role
 * @property {string} value_proposition
 * @property {string} industry
 * @property {string} created_at
 */

/**
 * @typedef {Object} Account
 * @property {string} id
 * @property {string} user_id
 * @property {string} company_name
 * @property {string} contact_name
 * @property {string} contact_role
 * @property {string} industry
 * @property {string} created_at
 * @property {Object} [content] - keyed by section_type, value is content string
 */

/**
 * @typedef {Object} AccountSection
 * @property {string} id
 * @property {string} account_id
 * @property {string} section_type
 * @property {string} content
 * @property {string} generated_at
 */

/**
 * @typedef {'overview'|'objectives'|'competitive'|'emails'|'coldCall'|'qualification'|'linkedin'|'insights'} SectionType
 */

export const SECTION_TYPES = [
  'overview',
  'objectives',
  'competitive',
  'emails',
  'coldCall',
  'qualification',
  'linkedin',
  'insights',
];
