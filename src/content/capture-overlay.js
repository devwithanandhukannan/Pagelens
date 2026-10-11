/**
 * Pagelens — Capture Overlay HUD
 * Minimal Apple macOS Sonoma-grade floating pill progress indicator.
 */

let overlayContainer = null;

export function showCaptureOverlay(_initialText) {
  // In-page overlay disabled to guarantee captured screenshot pixels are 100% clean
  hideCaptureOverlay();
}

export function updateCaptureOverlay(_text) {
  // No-op: in-page overlay disabled
}

export function hideCaptureOverlay() {
  const existing = document.getElementById('pagelens-capture-hud');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }
  overlayContainer = null;
}
