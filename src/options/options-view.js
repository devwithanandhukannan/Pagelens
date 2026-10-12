/**
 * Pagelens — Options View Controller
 */

import { SettingsStore } from './settings-store.js';

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await SettingsStore.getSettings();

  const toggleAutoOpen = document.getElementById('setting-auto-open');
  const toggleSaveHistory = document.getElementById('setting-save-history');
  const toggleStripMeta = document.getElementById('setting-strip-meta');
  const formatSelect = document.getElementById('setting-default-format');
  const themeSelect = document.getElementById('setting-theme');
  const saveLocationSelect = document.getElementById('setting-save-location');
  const prefixInput = document.getElementById('setting-prefix');
  const folderInput = document.getElementById('setting-folder');
  const saveNotice = document.getElementById('save-notice');

  // Populate initial values
  if (toggleAutoOpen) toggleAutoOpen.checked = settings.autoOpenStudio ?? true;
  if (toggleSaveHistory) toggleSaveHistory.checked = settings.saveHistory ?? true;
  if (toggleStripMeta) toggleStripMeta.checked = settings.stripMetadata ?? true;
  if (formatSelect) formatSelect.value = settings.exportFormat || 'png';
  if (themeSelect) themeSelect.value = settings.theme || 'system';
  if (saveLocationSelect) {
    const loc = settings.defaultSaveLocation || settings.downloadDirectory || 'Desktop';
    saveLocationSelect.value = ['Desktop', 'Downloads', 'Pagelens'].includes(loc) ? loc : 'custom';
  }
  if (folderInput) folderInput.value = settings.downloadDirectory || 'Desktop';
  if (prefixInput) prefixInput.value = (settings.filenameTemplate || '').replace('Pagelens_', '');

  // Theme application
  if (settings.theme !== 'system') {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }

  const showSaved = () => {
    saveNotice.style.opacity = '1';
    setTimeout(() => {
      saveNotice.style.opacity = '0';
    }, 2000);
  };

  const save = async () => {
    let loc = saveLocationSelect?.value || 'Desktop';
    let dir = folderInput?.value || 'Desktop';
    if (loc === 'Desktop') {
      dir = 'Desktop';
    } else if (loc === 'Downloads') {
      dir = '';
    } else if (loc === 'Pagelens') {
      dir = 'Pagelens';
    }

    const updated = {
      autoOpenStudio: toggleAutoOpen?.checked ?? true,
      saveHistory: toggleSaveHistory?.checked ?? true,
      stripMetadata: toggleStripMeta?.checked ?? true,
      exportFormat: formatSelect?.value ?? 'png',
      theme: themeSelect?.value ?? 'obsidian',
      defaultSaveLocation: loc,
      downloadDirectory: dir,
      filenameTemplate: `Pagelens_${prefixInput?.value || '{page_title}'}`,
    };
    await SettingsStore.saveSettings(updated);
    if (updated.theme !== 'system') {
      document.documentElement.setAttribute('data-theme', updated.theme);
    }
    showSaved();
  };

  if (saveLocationSelect && folderInput) {
    saveLocationSelect.addEventListener('change', () => {
      if (saveLocationSelect.value === 'Desktop') {
        folderInput.value = 'Desktop';
      } else if (saveLocationSelect.value === 'Downloads') {
        folderInput.value = '';
      } else if (saveLocationSelect.value === 'Pagelens') {
        folderInput.value = 'Pagelens';
      }
      save();
    });
  }

  [toggleAutoOpen, toggleSaveHistory, toggleStripMeta, formatSelect, themeSelect].forEach((el) => {
    if (el) el.addEventListener('change', save);
  });

  [prefixInput, folderInput].forEach((el) => {
    if (el) el.addEventListener('blur', save);
  });

  // Sidebar navigation switching
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      const targetId = item.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  const navWelcome = document.getElementById('nav-welcome');
  if (navWelcome) {
    navWelcome.addEventListener('click', () => {
      window.open('../welcome/welcome.html', '_blank');
    });
  }

  const chromeShortcutsBtn = document.getElementById('btn-open-chrome-shortcuts');
  if (chromeShortcutsBtn) {
    chromeShortcutsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      }
    });
  }
});
