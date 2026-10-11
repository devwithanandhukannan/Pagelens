/**
 * Pagelens — Command Router
 * Maps keyboard shortcuts and context menus to capture controller actions.
 */

export function setupCommandRouter(captureController) {
  if (typeof chrome !== 'undefined' && chrome.commands?.onCommand) {
    chrome.commands.onCommand.addListener(async (command) => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) return;

        if (command === 'capture-full-page') {
          await captureController.captureFullPage(tab);
        } else if (command === 'capture-visible') {
          await captureController.captureVisibleArea(tab);
        }
      } catch (err) {
        console.warn('[Pagelens Command Router] Command error:', err.message || err);
      }
    });
  }
}
