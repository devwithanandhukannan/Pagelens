/**
 * Pagelens — Privacy-first, local-only debug logger.
 * Never transmits any data.
 */

let isDebugEnabled = false;

export const logger = {
  enable(enable = true) {
    isDebugEnabled = enable;
  },
  debug(...args) {
    if (isDebugEnabled) {
      console.debug('[Pagelens:DEBUG]', ...args);
    }
  },
  info(...args) {
    console.info('[Pagelens]', ...args);
  },
  warn(...args) {
    console.warn('[Pagelens:WARN]', ...args);
  },
  error(...args) {
    console.error('[Pagelens:ERROR]', ...args);
  }
};
