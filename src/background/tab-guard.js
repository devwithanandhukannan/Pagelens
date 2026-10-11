/**
 * Pagelens — Tab Guard
 * Verifies tab eligibility and delivers specific, friendly guidance for restricted pages.
 */

import { ERROR_CODES } from '../shared/error-types.js';

const RESTRICTED_SCHEMES = [
  'chrome:',
  'chrome-extension:',
  'edge:',
  'about:',
  'view-source:',
  'devtools:',
  'data:',
];

const RESTRICTED_HOSTS = [
  'chromewebstore.google.com',
  'chrome.google.com/webstore',
];

export function validateTab(tab) {
  if (!tab || !tab.id) {
    return {
      eligible: false,
      code: ERROR_CODES.TAB_NOT_FOUND,
      reason: 'No active browser tab found.'
    };
  }

  const url = tab.url || '';

  for (const scheme of RESTRICTED_SCHEMES) {
    if (url.startsWith(scheme)) {
      return {
        eligible: false,
        code: ERROR_CODES.PROTECTED_URL,
        reason: `Pages starting with "${scheme}" are protected by Chrome security policies and cannot be captured.`
      };
    }
  }

  for (const host of RESTRICTED_HOSTS) {
    if (url.includes(host)) {
      return {
        eligible: false,
        code: ERROR_CODES.PROTECTED_URL,
        reason: 'The Chrome Web Store is protected by Google security policies and blocks extension script injection.'
      };
    }
  }

  return { eligible: true };
}
