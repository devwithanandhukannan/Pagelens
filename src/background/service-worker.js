/**
 * Pagelens — Service Worker (Background Entry Point)
 * Coordinates capture pipeline, listeners, shortcuts, and messages.
 */

import { CaptureController } from './capture-controller.js';
import { setupCommandRouter } from './command-router.js';
import { SessionRegistry } from './session-registry.js';

const captureController = new CaptureController();
setupCommandRouter(captureController);

// Runtime message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'PAGELENS_CAPTURE_FULL_PAGE': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const res = await captureController.captureFullPage(tab);
          sendResponse({ success: true, ...res });
          break;
        }

        case 'PAGELENS_CAPTURE_VISIBLE': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          const res = await captureController.captureVisibleArea(tab);
          sendResponse({ success: true, ...res });
          break;
        }

        case 'PAGELENS_CANCEL_CAPTURE': {
          await SessionRegistry.cancelSession();
          chrome.action.setBadgeText({ text: '' }).catch(() => {});
          chrome.runtime.sendMessage({ type: 'PAGELENS_CAPTURE_CANCELLED' }).catch(() => {});
          sendResponse({ success: true });
          break;
        }

        case 'PAGELENS_RETAKE': {
          const res = await captureController.retakeCapture({
            url: message.url,
            tabId: message.tabId,
            type: message.captureType || 'full-page',
            studioTabId: sender.tab?.id,
          });
          sendResponse({ success: true, ...res });
          break;
        }

        case 'PAGELENS_GET_CAPTURE_STATE': {
          const state = await SessionRegistry.getState();
          sendResponse({ success: true, state });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (err) {
      console.error('[Pagelens Service Worker]', err);
      sendResponse({
        success: false,
        error: err.message,
        code: err.code || 'UNKNOWN_ERROR',
        userHint: err.userHint || ''
      });
    }
  })();
  return true; // Keep message channel open for async response
});

// Clean up orphaned session locks on extension startup
chrome.runtime.onStartup.addListener(async () => {
  await SessionRegistry.finishSession();
});



