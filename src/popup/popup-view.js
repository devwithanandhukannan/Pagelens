/**
 * Pagelens — Popup View Controller
 * Coordinates button interactions, keyboard hints, and capture triggering.
 */

import { popupState } from './popup-state.js';

document.addEventListener('DOMContentLoaded', () => {
  const actionsArea = document.getElementById('popup-actions-area');
  const fullPageBtn = document.getElementById('btn-capture-full');
  const visibleBtn = document.getElementById('btn-capture-visible');
  const openStudioBtn = document.getElementById('btn-open-studio');
  const cancelArea = document.getElementById('popup-cancel-area');
  const cancelBtn = document.getElementById('btn-cancel-capture');
  const cancelBtnText = document.getElementById('btn-cancel-text');
  const statusContainer = document.getElementById('popup-status-area');
  const hudTitle = document.getElementById('popup-hud-title');
  const statusText = document.getElementById('popup-status-text');
  const noticeCard = document.getElementById('popup-notice-card');
  const noticeText = document.getElementById('popup-notice-text');
  const errorArea = document.getElementById('popup-error-area');
  const errorTitle = document.getElementById('popup-error-title');
  const errorMessage = document.getElementById('popup-error-message');
  const dismissErrorBtn = document.getElementById('btn-dismiss-error');
  const headerBadge = document.getElementById('popup-header-badge');

  // Detect platform for shortcut badges
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? 'CMD' : 'CTRL';
  const fullBadge = document.getElementById('shortcut-full');
  const visBadge = document.getElementById('shortcut-vis');
  if (fullBadge) fullBadge.textContent = `${modKey}+SHIFT+S`;
  if (visBadge) visBadge.textContent = `${modKey}+SHIFT+V`;

  const updateSegments = (progressPct) => {
    const blocks = document.querySelectorAll('.popup-seg-block');
    if (!blocks || blocks.length === 0) return;
    const ratio = Math.max(0, Math.min(100, progressPct)) / 100;
    const count = Math.min(16, Math.max(1, Math.round(ratio * 16)));
    blocks.forEach((b, idx) => {
      if (idx < count - 1) {
        b.className = 'popup-seg-block filled';
      } else if (idx === count - 1) {
        b.className = 'popup-seg-block active';
      } else {
        b.className = 'popup-seg-block';
      }
    });
  };

  popupState.subscribe((state) => {
    if (state.status === 'capturing' || state.status === 'stitching') {
      // HIDE capture buttons, SHOW cancel button
      if (actionsArea) actionsArea.style.display = 'none';
      if (cancelArea) cancelArea.style.display = 'block';
      if (cancelBtn) cancelBtn.disabled = false;
      if (cancelBtnText) cancelBtnText.textContent = 'Cancel Capture';

      if (noticeCard) noticeCard.style.display = 'none';
      if (errorArea) errorArea.style.display = 'none';

      if (statusContainer) statusContainer.style.display = 'flex';
      if (hudTitle) hudTitle.textContent = state.status === 'stitching' ? 'Stitching slices...' : 'Screen capture in progress...';
      if (statusText) statusText.textContent = state.message || 'Capturing...';
      updateSegments(state.progress || 20);

      if (headerBadge) {
        headerBadge.textContent = state.status === 'stitching' ? 'Stitching' : 'Capturing';
        headerBadge.className = 'pill-badge active-pulse';
      }
    } else if (state.status === 'error') {
      // SHOW capture buttons, HIDE cancel button
      if (actionsArea) actionsArea.style.display = 'flex';
      if (cancelArea) cancelArea.style.display = 'none';
      if (statusContainer) statusContainer.style.display = 'none';

      let displayMsg = state.message || 'An unexpected error occurred during capture.';
      if (displayMsg.includes('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND') || displayMsg.includes('quota')) {
        displayMsg = 'Capture rate limit reached. Waiting a moment before retry...';
      }

      if (errorArea && errorMessage) {
        errorArea.style.display = 'flex';
        errorMessage.textContent = displayMsg;
      }

      if (headerBadge) {
        headerBadge.textContent = 'Failed';
        headerBadge.className = 'pill-badge danger';
      }

      if (fullPageBtn) fullPageBtn.disabled = false;
      if (visibleBtn) visibleBtn.disabled = false;
    } else {
      // IDLE
      if (actionsArea) actionsArea.style.display = 'flex';
      if (cancelArea) cancelArea.style.display = 'none';
      if (statusContainer) statusContainer.style.display = 'none';

      if (headerBadge) {
        headerBadge.textContent = 'Ready';
        headerBadge.className = 'pill-badge mint';
      }

      if (fullPageBtn) fullPageBtn.disabled = false;
      if (visibleBtn) visibleBtn.disabled = false;
    }
  });

  // Cancel Button Action
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      cancelBtn.disabled = true;
      if (cancelBtnText) cancelBtnText.textContent = 'Cancelling...';
      if (statusText) statusText.textContent = 'Stopping capture...';

      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          await chrome.runtime.sendMessage({ type: 'PAGELENS_CANCEL_CAPTURE' });
        } catch (_) {}
      }
      popupState.setState({ status: 'idle', message: 'Capture cancelled' });
    });
  }

  // Dismiss Error Alert
  if (dismissErrorBtn && errorArea) {
    dismissErrorBtn.addEventListener('click', () => {
      errorArea.style.display = 'none';
      if (headerBadge) {
        headerBadge.textContent = 'Ready';
        headerBadge.className = 'pill-badge mint';
      }
    });
  }

  // Listen to live progress broadcast from capture controller
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'PAGELENS_CAPTURE_PROGRESS' && msg.payload) {
        const { text, progress } = msg.payload;
        if (noticeCard) noticeCard.style.display = 'none';
        if (actionsArea) actionsArea.style.display = 'none';
        if (cancelArea) cancelArea.style.display = 'block';
        if (statusContainer) statusContainer.style.display = 'flex';
        if (statusText && text) statusText.textContent = text;
        updateSegments(progress || 50);
      } else if (msg.type === 'PAGELENS_CAPTURE_CANCELLED') {
        popupState.setState({ status: 'idle', message: 'Capture cancelled' });
      }
    });
  }

  // Check active session on popup open
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'PAGELENS_GET_CAPTURE_STATE' }).then((res) => {
      if (res && res.success && res.state && res.state !== 'idle') {
        popupState.setState({ status: 'capturing', message: 'Capture in progress...', progress: 35 });
      }
    }).catch(() => {});
  }

  // 1. Capture Full Page
  if (fullPageBtn) {
    fullPageBtn.addEventListener('click', async () => {
      if (errorArea) errorArea.style.display = 'none';
      popupState.setState({ status: 'capturing', message: 'Measuring document...', progress: 15 });
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          const response = await chrome.runtime.sendMessage({ type: 'PAGELENS_CAPTURE_FULL_PAGE' });
          if (response && response.success) {
            window.close(); // Close popup upon Studio launch
          } else if (response && response.code === 'CAPTURE_CANCELLED') {
            popupState.setState({ status: 'idle', message: 'Capture cancelled' });
          } else if (response && response.error) {
            if (response.error.toLowerCase().includes('cancel')) {
              popupState.setState({ status: 'idle', message: 'Capture cancelled' });
            } else {
              popupState.setState({ status: 'error', message: response.error });
            }
          }
        } catch (err) {
          if (err.message && err.message.toLowerCase().includes('cancel')) {
            popupState.setState({ status: 'idle', message: 'Capture cancelled' });
          } else {
            popupState.setState({ status: 'error', message: err.message });
          }
        }
      } else {
        // Testing/Simulator fallback
        window.open('../studio/index.html', '_blank');
      }
    });
  }

  // 2. Capture Visible Area
  if (visibleBtn) {
    visibleBtn.addEventListener('click', async () => {
      if (errorArea) errorArea.style.display = 'none';
      popupState.setState({ status: 'capturing', message: 'Capturing viewport...', progress: 50 });
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          const response = await chrome.runtime.sendMessage({ type: 'PAGELENS_CAPTURE_VISIBLE' });
          if (response && response.success) {
            window.close();
          } else if (response && response.code === 'CAPTURE_CANCELLED') {
            popupState.setState({ status: 'idle', message: 'Capture cancelled' });
          } else if (response && response.error) {
            if (response.error.toLowerCase().includes('cancel')) {
              popupState.setState({ status: 'idle', message: 'Capture cancelled' });
            } else {
              popupState.setState({ status: 'error', message: response.error });
            }
          }
        } catch (err) {
          if (err.message && err.message.toLowerCase().includes('cancel')) {
            popupState.setState({ status: 'idle', message: 'Capture cancelled' });
          } else {
            popupState.setState({ status: 'error', message: err.message });
          }
        }
      } else {
        window.open('../studio/index.html', '_blank');
      }
    });
  }

  // 3. Open Studio directly
  if (openStudioBtn) {
    openStudioBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/studio/index.html') });
        window.close();
      } else {
        window.open('../studio/index.html', '_blank');
      }
    });
  }



  // 5. Pre-check active tab eligibility
  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab) return;
      const url = tab.url || '';
      if (url.startsWith('chrome:') || url.startsWith('chrome-extension:') || url.startsWith('devtools:') || url.startsWith('about:') || url.startsWith('edge:') || url.startsWith('brave:')) {
        if (noticeCard) {
          noticeCard.style.display = 'flex';
          if (noticeText) {
            noticeText.textContent = 'Browser-protected page. Switch to any regular website to capture.';
          }
        }
        fullPageBtn.disabled = true;
        visibleBtn.disabled = true;
        fullPageBtn.style.opacity = '0.5';
        visibleBtn.style.opacity = '0.5';
      } else {
        if (noticeCard) noticeCard.style.display = 'none';
        fullPageBtn.disabled = false;
        visibleBtn.disabled = false;
        fullPageBtn.style.opacity = '1';
        visibleBtn.style.opacity = '1';
      }
    }).catch(() => {});
  }

  // 6. Dynamically update shortcut badges from Chrome registered commands
  if (typeof chrome !== 'undefined' && chrome.commands?.getAll) {
    chrome.commands.getAll((commands) => {
      commands.forEach((cmd) => {
        if (cmd.name === 'capture-full-page' && cmd.shortcut) {
          document.getElementById('shortcut-full').textContent = cmd.shortcut;
        } else if (cmd.name === 'capture-visible' && cmd.shortcut) {
          document.getElementById('shortcut-vis').textContent = cmd.shortcut;
        }
      });
    });
  }

  // 7. Keyboard shortcut listener inside the popup window
  window.addEventListener('keydown', (e) => {
    const isMacPlatform = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const hasMod = isMacPlatform ? (e.metaKey || e.altKey) : (e.ctrlKey || e.altKey);
    const key = e.key.toLowerCase();

    // Full Page: (Cmd/Ctrl/Alt + Shift + S) OR 'f' OR '1' OR Enter
    if ((hasMod && e.shiftKey && key === 's') || (e.shiftKey && key === 's') || key === '1' || key === 'f' || (e.key === 'Enter' && !openStudioBtn.matches(':focus') && !visibleBtn.matches(':focus'))) {
      e.preventDefault();
      if (!fullPageBtn.disabled) fullPageBtn.click();
    }
    // Visible Area: (Cmd/Ctrl/Alt + Shift + V) OR 'v' OR '2'
    else if ((hasMod && e.shiftKey && key === 'v') || (e.shiftKey && key === 'v') || key === '2' || key === 'v') {
      e.preventDefault();
      if (!visibleBtn.disabled) visibleBtn.click();
    }
    // Studio: 'o' OR '3'
    else if (key === 'o' || key === '3') {
      e.preventDefault();
      openStudioBtn?.click();
    }
    // Escape closes popup or cancels active capture
    else if (e.key === 'Escape') {
      if (popupState.status === 'capturing' || popupState.status === 'stitching') {
        e.preventDefault();
        cancelBtn?.click();
      } else {
        window.close();
      }
    }
  });
});
