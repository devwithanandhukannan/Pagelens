/**
 * Pagelens — Capture Controller
 * Executes the state machine for visible and full-page captures.
 * Implements strict rate-limit protection and exponential backoff retry for captureVisibleTab.
 */

import { validateTab } from './tab-guard.js';
import { globalCaptureScheduler } from './capture-scheduler.js';
import { SessionRegistry } from './session-registry.js';
import { stitchSlices } from '../workers/stitch-worker.js';
import { BlobStore } from '../shared/blob-store.js';
import { PagelensError, ERROR_CODES } from '../shared/error-types.js';

export class CaptureController {
  constructor() {
    this.scheduler = globalCaptureScheduler;
  }

  /**
   * Resilient wrapper around chrome.tabs.captureVisibleTab
   * Automatically handles Chrome's MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota (max 2 calls/sec)
   * with throttling and adaptive exponential backoff.
   */
  async captureTabWithRetry(windowId, options = { format: 'png' }, maxRetries = 5) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Throttle to ensure safe interval since last screenshot call
      await this.scheduler.throttle();

      const result = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(windowId, options, (data) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve({ data });
          }
        });
      });

      if (!result.error) {
        this.scheduler.recordSuccess();
        return result.data;
      }

      const isRateLimit = result.error.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') ||
                          result.error.toLowerCase().includes('quota');

      if (isRateLimit && attempt < maxRetries) {
        this.scheduler.recordRateLimitError();
        // Exponential backoff: 650ms, 1050ms, 1450ms...
        const backoffMs = 650 + attempt * 400;
        console.warn(`[Pagelens] Quota rate limit detected on captureVisibleTab. Backing off for ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }

      if (isRateLimit) {
        throw new Error('Screenshot rate limit reached. Please wait a moment and try again.');
      }
      throw new Error(result.error);
    }
  }

  async captureVisibleArea(tab) {
    const validation = validateTab(tab);
    if (!validation.eligible) {
      throw new PagelensError(validation.code, validation.reason);
    }

    const sessionId = `session_${Date.now()}`;
    const lock = await SessionRegistry.startSession(sessionId, tab.id);
    if (!lock.acquired) {
      throw new Error(lock.reason);
    }

    try {
      const dataUrl = await this.captureTabWithRetry(tab.windowId, { format: 'png' });

      // Save binary image in BlobStore (IndexedDB)
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await BlobStore.saveCapture(sessionId, blob, {
          title: tab.title || 'Visible Capture',
          url: tab.url,
          type: 'visible',
        });
      } catch (blobErr) {
        console.warn('[CaptureController] Failed to persist in BlobStore:', blobErr);
      }

      // Save lightweight session metadata in chrome.storage.local without large dataUrl
      await chrome.storage.local.set({
        [sessionId]: {
          id: sessionId,
          title: tab.title || 'Visible Capture',
          url: tab.url,
          timestamp: Date.now(),
          type: 'visible',
        },
        pagelens_last_capture_id: sessionId,
      });

      // Open Studio
      await chrome.tabs.create({
        url: chrome.runtime.getURL(`src/studio/index.html?sessionId=${sessionId}`)
      });

      return { sessionId };
    } finally {
      await SessionRegistry.finishSession();
    }
  }

  async captureFullPage(tab) {
    const validation = validateTab(tab);
    if (!validation.eligible) {
      throw new PagelensError(validation.code, validation.reason);
    }

    const sessionId = `session_${Date.now()}`;
    const lock = await SessionRegistry.startSession(sessionId, tab.id);
    if (!lock.acquired) {
      throw new Error(lock.reason);
    }

    let probeInjected = false;

    try {
      // 1. Inject probe script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/probe-entry.js'],
      });
      probeInjected = true;

      // 2. Measure page
      const measureRes = await chrome.tabs.sendMessage(tab.id, { type: 'PAGELENS_MEASURE_PAGE' });
      if (!measureRes || !measureRes.geometry) {
        throw new Error('Failed to measure document geometry.');
      }
      const geom = measureRes.geometry;

      // 3. Prime lazy loading
      await chrome.tabs.sendMessage(tab.id, {
        type: 'PAGELENS_PRIME_LAZY_LOAD',
        payload: { scrollHeight: geom.scrollHeight },
      });

      // 4. Calculate slices
      const viewportH = geom.viewportHeight;
      const totalH = geom.scrollHeight;
      const totalSlices = Math.ceil(totalH / viewportH);
      const slices = [];

      for (let i = 0; i < totalSlices; i++) {
        if (await SessionRegistry.isCancelled()) {
          throw new PagelensError(ERROR_CODES.CAPTURE_CANCELLED, 'Capture cancelled by user.');
        }

        const targetY = i * viewportH;

        // Scroll to slice
        const scrollRes = await chrome.tabs.sendMessage(tab.id, {
          type: 'PAGELENS_SCROLL_TO',
          payload: {
            x: 0,
            y: targetY,
            sliceIndex: i,
            totalSlices,
            delayMs: 180,
          }
        });

        // Hide sticky elements after the first slice is captured
        if (i > 0) {
          await chrome.tabs.sendMessage(tab.id, { type: 'PAGELENS_HIDE_STICKY' });
        }

        // Capture visible slice with resilient rate-limit throttling and backoff retry
        const sliceDataUrl = await this.captureTabWithRetry(tab.windowId, { format: 'png' });

        slices.push({
          index: i,
          y: scrollRes.actualY || targetY,
          height: viewportH,
          dataUrl: sliceDataUrl,
        });
      }

      // 5. Update progress: Stitching
      await chrome.tabs.sendMessage(tab.id, {
        type: 'PAGELENS_PROGRESS_UPDATE',
        payload: { text: 'Stitching slices...' }
      });

      // 6. Stitch slices off the main thread
      const stitched = await stitchSlices({
        slices,
        totalWidth: geom.viewportWidth,
        totalHeight: geom.scrollHeight,
        dpr: geom.dpr,
      });

      // 7. Restore page
      await chrome.tabs.sendMessage(tab.id, { type: 'PAGELENS_RESTORE_PAGE' });

      // 8. Store raw binary blob into BlobStore (IndexedDB) — zero base64 bloat & unlimited capacity
      try {
        await BlobStore.saveCapture(sessionId, stitched.blob, {
          title: geom.title,
          url: geom.url,
          width: stitched.width,
          height: stitched.height,
          type: 'full-page',
        });
      } catch (blobErr) {
        console.warn('[CaptureController] Failed to persist stitched blob in BlobStore:', blobErr);
      }

      // Store lightweight session metadata in chrome.storage.local without large image strings
      await chrome.storage.local.set({
        [sessionId]: {
          id: sessionId,
          title: geom.title,
          url: geom.url,
          width: stitched.width,
          height: stitched.height,
          timestamp: Date.now(),
          type: 'full-page',
        },
        pagelens_last_capture_id: sessionId,
      });

      // 9. Open Studio in a fresh tab
      await chrome.tabs.create({
        url: chrome.runtime.getURL(`src/studio/index.html?sessionId=${sessionId}`)
      });

      return { sessionId };
    } catch (err) {
      if (probeInjected) {
        await chrome.tabs.sendMessage(tab.id, { type: 'PAGELENS_RESTORE_PAGE' }).catch(() => {});
      }
      throw err;
    } finally {
      await SessionRegistry.finishSession();
    }
  }
}
