/**
 * Pagelens — Capture Scheduler
 * Handles rate limits on chrome.tabs.captureVisibleTab with adaptive delays.
 */

import { CAPTURE_LIMITS } from '../shared/constants.js';

export class CaptureScheduler {
  constructor() {
    this.currentDelay = CAPTURE_LIMITS.MIN_SLICE_DELAY_MS;
    this.lastCaptureTimestamp = 0;
  }

  async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastCaptureTimestamp;
    const waitTime = Math.max(0, this.currentDelay - elapsed);

    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }
    this.lastCaptureTimestamp = Date.now();
  }

  recordSuccess() {
    // Gradually recover to minimum delay on consecutive successes
    this.currentDelay = Math.max(
      CAPTURE_LIMITS.MIN_SLICE_DELAY_MS,
      Math.floor(this.currentDelay * 0.9)
    );
  }

  recordRateLimitError() {
    // Backoff adaptively if browser signals screenshot API rate limit
    this.currentDelay = Math.min(
      CAPTURE_LIMITS.MAX_SLICE_DELAY_MS,
      Math.floor(this.currentDelay * 1.5) + 100
    );
  }
}
