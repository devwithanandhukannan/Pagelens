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

  async captureVisibleArea(tab, options = {}) {
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
          tabId: tab.id,
          type: 'visible',
          textBlocks: [],
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
          tabId: tab.id,
          timestamp: Date.now(),
          type: 'visible',
          textBlocks: [],
        },
        pagelens_last_capture_id: sessionId,
      });

      // Open Studio if not reusing existing studio tab
      if (!options.reuseStudio) {
        await chrome.tabs.create({
          url: chrome.runtime.getURL(`src/studio/index.html?sessionId=${sessionId}`)
        });
      }

      return { sessionId, title: tab.title, url: tab.url, tabId: tab.id, type: 'visible' };
    } finally {
      await SessionRegistry.finishSession();
    }
  }

  async captureFullPage(tab, options = {}) {
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

      // 4. Calculate slices and auto-scale settle delay
      const isElementScroll = !!geom.isElementScroll;
      const viewportH = geom.viewportHeight;
      const totalH = geom.scrollHeight;
      const scrollStep = isElementScroll ? (geom.scrollStep || viewportH) : viewportH;
      const totalSlices = geom.totalSlices || Math.max(1, Math.ceil(totalH / scrollStep));
      const topOffset = geom.topOffset || 0;
      const bottomOffset = geom.bottomOffset || 0;
      const slices = [];

      // Determine intelligent adaptive settle delay (prevent browser crash / blank slices)
      let configuredDelay = 560;
      try {
        const stored = await chrome.storage.local.get('pagelens_settings');
        if (stored?.pagelens_settings?.captureDelay) {
          configuredDelay = Number(stored.pagelens_settings.captureDelay) || 560;
        }
      } catch (_) {}

      let effectiveDelay = configuredDelay;
      if (totalSlices >= 14 || totalH >= 12000) {
        effectiveDelay = Math.max(configuredDelay, 950);
      } else if (totalSlices >= 7 || totalH >= 6000) {
        effectiveDelay = Math.max(configuredDelay, 720);
      }

      for (let i = 0; i < totalSlices; i++) {
        if (await SessionRegistry.isCancelled()) {
          throw new PagelensError(ERROR_CODES.CAPTURE_CANCELLED, 'Capture cancelled by user.');
        }

        const targetY = isElementScroll
          ? Math.min(Math.max(0, totalH - scrollStep), i * scrollStep)
          : Math.min(Math.max(0, totalH - viewportH), i * viewportH);

        // Scroll to slice with adaptive settle delay
        const scrollRes = await chrome.tabs.sendMessage(tab.id, {
          type: 'PAGELENS_SCROLL_TO',
          payload: {
            x: 0,
            y: targetY,
            sliceIndex: i,
            totalSlices,
            delayMs: effectiveDelay,
          }
        });

        // Update toolbar action badge & popup progress
        chrome.action.setBadgeText({ text: `${i + 1}/${totalSlices}`, tabId: tab.id }).catch(() => {});
        chrome.action.setBadgeBackgroundColor({ color: '#6366F1' }).catch(() => {});

        chrome.runtime.sendMessage({
          type: 'PAGELENS_CAPTURE_PROGRESS',
          payload: {
            sliceIndex: i,
            totalSlices,
            text: `Capturing slice ${i + 1} of ${totalSlices}...`,
            progress: Math.round(((i + 1) / totalSlices) * 100),
          }
        }).catch(() => {});

        // Hide sticky elements after the first slice is captured (skip for SPAs with inner element scroll)
        if (i > 0 && !isElementScroll) {
          await chrome.tabs.sendMessage(tab.id, { type: 'PAGELENS_HIDE_STICKY' });
        }

        // Capture visible slice with resilient rate-limit throttling and backoff retry
        const sliceDataUrl = await this.captureTabWithRetry(tab.windowId, { format: 'png' });

        slices.push({
          index: i,
          y: (scrollRes && scrollRes.actualY !== undefined) ? scrollRes.actualY : targetY,
          height: isElementScroll ? scrollStep : viewportH,
          dataUrl: sliceDataUrl,
        });
      }

      // 5. Update progress: Stitching
      chrome.action.setBadgeText({ text: '...', tabId: tab.id }).catch(() => {});
      chrome.runtime.sendMessage({
        type: 'PAGELENS_CAPTURE_PROGRESS',
        payload: {
          sliceIndex: totalSlices - 1,
          totalSlices,
          text: 'Stitching slices...',
          progress: 100,
        }
      }).catch(() => {});

      // 6. Stitch slices off the main thread
      const stitched = await stitchSlices({
        slices,
        totalWidth: geom.viewportWidth,
        totalHeight: geom.scrollHeight,
        dpr: geom.dpr,
        isElementScroll,
        topOffset,
        bottomOffset,
        scrollStep,
        rectLeft: geom.rectLeft || 0,
        rectWidth: geom.rectWidth || geom.viewportWidth,
        bgColor: geom.bgColor || '#111b21',
      });

      // 7. Restore page
      await chrome.tabs.sendMessage(tab.id, { type: 'PAGELENS_RESTORE_PAGE' });

      // 8. Store raw binary blob into BlobStore (IndexedDB) — zero base64 bloat & unlimited capacity
      try {
        await BlobStore.saveCapture(sessionId, stitched.blob, {
          title: geom.title,
          url: geom.url,
          tabId: tab.id,
          width: stitched.width,
          height: stitched.height,
          type: 'full-page',
          textBlocks: [],
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
          tabId: tab.id,
          width: stitched.width,
          height: stitched.height,
          timestamp: Date.now(),
          type: 'full-page',
          textBlocks: [],
        },
        pagelens_last_capture_id: sessionId,
      });

      // 9. Open Studio if not reusing an existing studio tab
      if (!options.reuseStudio) {
        await chrome.tabs.create({
          url: chrome.runtime.getURL(`src/studio/index.html?sessionId=${sessionId}`)
        });
      }

      return { sessionId, title: geom.title, url: geom.url, tabId: tab.id, type: 'full-page' };
    } catch (err) {
      if (probeInjected) {
        await chrome.tabs.sendMessage(tab.id, { type: 'PAGELENS_RESTORE_PAGE' }).catch(() => {});
      }
      throw err;
    } finally {
      chrome.action.setBadgeText({ text: '', tabId: tab.id }).catch(() => {});
      await SessionRegistry.finishSession();
    }
  }

  /**
   * Retake screenshot from source tab or source URL.
   * If initiated from Studio, seamlessly captures the target page and returns to the current Studio session.
   */
  async retakeCapture({ url, tabId, type = 'full-page', studioTabId } = {}) {
    let targetTab = null;
    let isTemporaryTab = false;

    // 1. Try finding by tabId first
    if (tabId) {
      try {
        const t = await chrome.tabs.get(tabId);
        if (t && t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://')) {
          targetTab = t;
        }
      } catch (_) {}
    }

    // 2. Try finding by matching URL across open tabs
    if (!targetTab && url && !url.startsWith('chrome://') && !url.startsWith('chrome-extension://')) {
      try {
        const allTabs = await chrome.tabs.query({});
        targetTab = allTabs.find(t => t.url === url || (url && t.url && t.url.split('#')[0] === url.split('#')[0]));
      } catch (_) {}
    }

    // 3. If tab is not open, but valid HTTP/HTTPS URL, open temporarily to capture
    if (!targetTab && url && (url.startsWith('http://') || url.startsWith('https://'))) {
      targetTab = await chrome.tabs.create({ url, active: true });
      isTemporaryTab = true;

      // Wait for tab to complete loading
      await new Promise((resolve) => {
        const listener = (tid, changeInfo) => {
          if (tid === targetTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }, 9000);
      });

      // Brief rendering pause
      await new Promise(r => setTimeout(r, 600));
    }

    // 4. Fallback: Find another active web tab
    if (!targetTab) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const active = tabs[0];
      if (active && active.id !== studioTabId && !active.url.startsWith('chrome://') && !active.url.startsWith('chrome-extension://')) {
        targetTab = active;
      } else {
        const otherTabs = await chrome.tabs.query({ currentWindow: true });
        targetTab = otherTabs.find(t => t.id !== studioTabId && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));
      }
    }

    if (!targetTab) {
      throw new Error('Unable to find or reload the target webpage to retake.');
    }

    // Bring targetTab to active foreground for capture
    await chrome.tabs.update(targetTab.id, { active: true });
    if (targetTab.windowId) {
      await chrome.windows.update(targetTab.windowId, { focused: true }).catch(() => {});
    }
    await new Promise(r => setTimeout(r, 350));

    // Capture using requested type
    let captureResult;
    try {
      if (type === 'visible') {
        captureResult = await this.captureVisibleArea(targetTab, { reuseStudio: !!studioTabId });
      } else {
        captureResult = await this.captureFullPage(targetTab, { reuseStudio: !!studioTabId });
      }
    } finally {
      if (isTemporaryTab && targetTab) {
        await chrome.tabs.remove(targetTab.id).catch(() => {});
      }
    }

    // If initiated from Studio, switch back to Studio tab and notify
    if (studioTabId) {
      await chrome.tabs.update(studioTabId, { active: true }).catch(() => {});
      chrome.tabs.sendMessage(studioTabId, {
        type: 'PAGELENS_SESSION_UPDATED',
        sessionId: captureResult.sessionId,
        url: targetTab.url,
        title: targetTab.title
      }).catch(() => {});
    }

    return captureResult;
  }
}
