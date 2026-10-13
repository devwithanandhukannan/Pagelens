/**
 * Pagelens — Typed Message Contracts between Background, Content, Workers, and Studio
 */

export const MESSAGE_TYPES = {
  // Probe lifecycle
  PING_PROBE: 'PAGELENS_PING_PROBE',
  PONG_PROBE: 'PAGELENS_PONG_PROBE',

  // Orchestrator to Content Probe
  MEASURE_PAGE: 'PAGELENS_MEASURE_PAGE',
  PRIME_LAZY_LOAD: 'PAGELENS_PRIME_LAZY_LOAD',
  FREEZE_MOTION: 'PAGELENS_FREEZE_MOTION',
  HIDE_STICKY: 'PAGELENS_HIDE_STICKY',
  SCROLL_TO: 'PAGELENS_SCROLL_TO',
  RESTORE_PAGE: 'PAGELENS_RESTORE_PAGE',
  CANCEL_CAPTURE: 'PAGELENS_CANCEL_CAPTURE',
  CAPTURE_CANCELLED: 'PAGELENS_CAPTURE_CANCELLED',

  // Progress notification
  PROGRESS_UPDATE: 'PAGELENS_PROGRESS_UPDATE',

  // Worker communication
  START_STITCH: 'PAGELENS_START_STITCH',
  STITCH_PROGRESS: 'PAGELENS_STITCH_PROGRESS',
  STITCH_COMPLETE: 'PAGELENS_STITCH_COMPLETE',
  STITCH_ERROR: 'PAGELENS_STITCH_ERROR',

  // Studio communication
  LOAD_SESSION: 'PAGELENS_LOAD_SESSION',
  CLEANUP_SESSION: 'PAGELENS_CLEANUP_SESSION',
};

export function createMessage(type, payload = {}, meta = {}) {
  return {
    type,
    payload,
    meta: {
      timestamp: Date.now(),
      id: Math.random().toString(36).substring(2, 9),
      ...meta,
    }
  };
}
