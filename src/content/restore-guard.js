/**
 * Pagelens — Restore Guard
 * Ensures guaranteed cleanup of all page modifications under any exit condition.
 */

import { restoreStickyElements } from './sticky-neutralizer.js';
import { unfreezeMotion } from './motion-freezer.js';
import { hideCaptureOverlay } from './capture-overlay.js';

let originalScrollPosition = { x: 0, y: 0 };
let isGuarded = false;

export function initializeRestoreGuard(initialX = 0, initialY = 0) {
  originalScrollPosition = { x: initialX, y: initialY };
  isGuarded = true;

  // Global escape key listener to abort capture gracefully
  window.addEventListener('keydown', onKeyDownEscape, { capture: true });
}

function onKeyDownEscape(e) {
  if (e.key === 'Escape' && isGuarded) {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'PAGELENS_CANCEL_CAPTURE' }).catch(() => {});
    }
    restorePage();
  }
}

export function restorePage() {
  if (!isGuarded) return;

  try {
    // 1. Restore scroll position
    window.scrollTo({
      left: originalScrollPosition.x,
      top: originalScrollPosition.y,
      behavior: 'instant'
    });

    // 2. Unhide sticky elements
    restoreStickyElements();

    // 3. Unfreeze CSS animations and transitions
    unfreezeMotion();

    // 4. Remove HUD overlay
    hideCaptureOverlay();

    // 5. Remove escape listener
    window.removeEventListener('keydown', onKeyDownEscape, { capture: true });
  } finally {
    isGuarded = false;
  }
}
