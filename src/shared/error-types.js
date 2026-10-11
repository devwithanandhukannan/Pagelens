/**
 * Pagelens — Named failure types with human-friendly messages
 */

export class PagelensError extends Error {
  constructor(code, message, userHint = '') {
    super(message);
    this.name = 'PagelensError';
    this.code = code;
    this.userHint = userHint;
  }
}

export const ERROR_CODES = {
  PROTECTED_URL: 'PROTECTED_URL',
  TAB_NOT_FOUND: 'TAB_NOT_FOUND',
  TAB_CRASHED: 'TAB_CRASHED',
  CAPTURE_CANCELLED: 'CAPTURE_CANCELLED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  PAGE_TOO_TALL: 'PAGE_TOO_TALL',
  STITCH_FAILED: 'STITCH_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  STORAGE_FULL: 'STORAGE_FULL',
};

export const ERROR_MESSAGES = {
  [ERROR_CODES.PROTECTED_URL]: {
    title: 'Restricted Page',
    message: 'This page is protected by Chrome security policies (such as Chrome Web Store or internal chrome:// URLs) and cannot be captured.',
    action: 'Try opening any standard web page.'
  },
  [ERROR_CODES.TAB_NOT_FOUND]: {
    title: 'Tab Unavailable',
    message: 'The active tab was closed or could not be reached.',
    action: 'Select a tab and try again.'
  },
  [ERROR_CODES.CAPTURE_CANCELLED]: {
    title: 'Capture Cancelled',
    message: 'Capture was cancelled by user request.',
    action: 'Ready to capture.'
  },
  [ERROR_CODES.PAGE_TOO_TALL]: {
    title: 'Oversized Page Height',
    message: 'This page height exceeds the maximum browser canvas threshold (32,000px).',
    action: 'Consider capturing a specific scroll container or using visible capture.'
  },
  [ERROR_CODES.STITCH_FAILED]: {
    title: 'Stitching Incomplete',
    message: 'Unable to stitch slices cleanly due to volatile dynamic page resizing.',
    action: 'Try freezing page animations or waiting until the page fully settles.'
  },
  [ERROR_CODES.STORAGE_FULL]: {
    title: 'Storage Full',
    message: 'Browser storage quota reached. Please free storage space.',
    action: 'Clear older captures or export immediately.'
  }
};
