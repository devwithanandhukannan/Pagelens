/**
 * Pagelens — Popup View Controller
 * Coordinates button interactions, keyboard hints, and capture triggering.
 */

import { popupState } from './popup-state.js';

document.addEventListener('DOMContentLoaded', () => {
  const fullPageBtn = document.getElementById('btn-capture-full');
  const visibleBtn = document.getElementById('btn-capture-visible');
  const openStudioBtn = document.getElementById('btn-open-studio');
  const optionsLink = document.getElementById('link-options');
  const statusContainer = document.getElementById('popup-status-area');
  const statusText = document.getElementById('popup-status-text');
  const progressBar = document.getElementById('popup-progress-bar');

  // Detect platform for shortcut badges
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? 'CMD' : 'CTRL';
  document.getElementById('shortcut-full').textContent = `${modKey}+SHIFT+S`;
  document.getElementById('shortcut-vis').textContent = `${modKey}+SHIFT+V`;

  popupState.subscribe((state) => {
    if (state.status === 'capturing' || state.status === 'stitching') {
      statusContainer.style.display = 'block';
      statusText.textContent = state.message || 'Capturing...';
      progressBar.style.width = `${state.progress}%`;
      fullPageBtn.disabled = true;
      visibleBtn.disabled = true;
    } else if (state.status === 'error') {
      statusContainer.style.display = 'block';
      statusText.textContent = `Error: ${state.message}`;
      progressBar.style.backgroundColor = 'var(--accent-crimson)';
      fullPageBtn.disabled = false;
      visibleBtn.disabled = false;
    }
  });

  // 1. Capture Full Page
  fullPageBtn.addEventListener('click', async () => {
    popupState.setState({ status: 'capturing', message: 'Measuring document...', progress: 20 });
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'PAGELENS_CAPTURE_FULL_PAGE' });
        if (response && response.success) {
          window.close(); // Close popup upon Studio launch
        } else if (response && response.error) {
          popupState.setState({ status: 'error', message: response.error });
        }
      } catch (err) {
        popupState.setState({ status: 'error', message: err.message });
      }
    } else {
      // Testing/Simulator fallback
      window.open('../studio/index.html', '_blank');
    }
  });

  // 2. Capture Visible Area
  visibleBtn.addEventListener('click', async () => {
    popupState.setState({ status: 'capturing', message: 'Capturing viewport...', progress: 50 });
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'PAGELENS_CAPTURE_VISIBLE' });
        if (response && response.success) {
          window.close();
        } else if (response && response.error) {
          popupState.setState({ status: 'error', message: response.error });
        }
      } catch (err) {
        popupState.setState({ status: 'error', message: err.message });
      }
    } else {
      window.open('../studio/index.html', '_blank');
    }
  });

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

  // 4. Options page link
  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('../options/options.html', '_blank');
      }
    });
  }
});
