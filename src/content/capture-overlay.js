/**
 * Pagelens — Capture Overlay HUD
 * Minimal Apple macOS Sonoma-grade floating pill progress indicator.
 */

let overlayContainer = null;

export function showCaptureOverlay(initialText = 'Preparing capture...') {
  if (overlayContainer) return;

  overlayContainer = document.createElement('div');
  overlayContainer.id = 'pagelens-capture-hud';
  overlayContainer.setAttribute('role', 'status');
  overlayContainer.setAttribute('aria-live', 'polite');

  overlayContainer.innerHTML = `
    <div style="
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 10px 18px;
      border-radius: 9999px;
      background: rgba(18, 19, 23, 0.88);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.2);
      border: 1px solid transparent;
      color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: -0.01em;
      pointer-events: auto;
      user-select: none;
      transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    ">
      <!-- Pulsing Electric Violet Lens Dot -->
      <span style="
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: #6D63E6;
        box-shadow: 0 0 10px #6D63E6;
        animation: pagelens-pulse 1.4s ease-in-out infinite;
      "></span>

      <span id="pagelens-hud-text" style="white-space: nowrap;">${initialText}</span>

      <span style="
        background: rgba(255, 255, 255, 0.12);
        padding: 2px 7px;
        border-radius: 9999px;
        font-size: 10px;
        font-family: 'SF Mono', Menlo, monospace;
        color: #94A3B8;
        font-weight: 600;
        margin-left: 4px;
      ">ESC</span>
    </div>
    <style>
      @keyframes pagelens-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.6; }
      }
    </style>
  `;

  document.body.appendChild(overlayContainer);
}

export function updateCaptureOverlay(text) {
  const textEl = document.getElementById('pagelens-hud-text');
  if (textEl) {
    textEl.textContent = text;
  }
}

export function hideCaptureOverlay() {
  if (overlayContainer && overlayContainer.parentNode) {
    overlayContainer.parentNode.removeChild(overlayContainer);
    overlayContainer = null;
  }
}
