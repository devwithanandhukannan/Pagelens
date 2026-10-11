/**
 * Pagelens — Shortcut Listener (Content Script)
 * Intercepts keyboard shortcuts directly in active browser tabs
 * to trigger capture instantly across all websites.
 */

(() => {
  if (window.__PAGELENS_SHORTCUT_LISTENER__) return;
  window.__PAGELENS_SHORTCUT_LISTENER__ = true;

  window.addEventListener('keydown', (e) => {
    // Avoid triggering while typing in form inputs, textareas, or editable elements
    const tag = (e.target?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const hasMod = isMac ? (e.metaKey || e.altKey) : (e.ctrlKey || e.altKey);
    const key = e.key.toLowerCase();

    // Full Page Capture: Cmd+Shift+S / Alt+Shift+S / Ctrl+Shift+S
    if (hasMod && e.shiftKey && key === 's') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'PAGELENS_CAPTURE_FULL_PAGE' }).catch(() => {});
      }
      return;
    }

    // Visible Area Capture: Cmd+Shift+V / Alt+Shift+V / Ctrl+Shift+V
    if (hasMod && e.shiftKey && key === 'v') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'PAGELENS_CAPTURE_VISIBLE' }).catch(() => {});
      }
      return;
    }
  }, { capture: true });
})();
