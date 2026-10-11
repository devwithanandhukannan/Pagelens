/**
 * Pagelens — Options View Controller
 */

import { SettingsStore } from './settings-store.js';

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await SettingsStore.getSettings();

  const toggleAutoOpen = document.getElementById('setting-auto-open');
  const toggleStripMeta = document.getElementById('setting-strip-meta');
  const formatSelect = document.getElementById('setting-default-format');
  const themeSelect = document.getElementById('setting-theme');
  const prefixInput = document.getElementById('setting-prefix');
  const folderInput = document.getElementById('setting-folder');
  const saveNotice = document.getElementById('save-notice');

  // Populate initial values
  if (toggleAutoOpen) toggleAutoOpen.checked = settings.autoOpenStudio;
  if (toggleStripMeta) toggleStripMeta.checked = settings.stripMetadata;
  if (formatSelect) formatSelect.value = settings.exportFormat;
  if (themeSelect) themeSelect.value = settings.theme;
  if (folderInput) folderInput.value = settings.downloadDirectory;
  if (prefixInput) prefixInput.value = settings.filenameTemplate.replace('Pagelens_', '');

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
    const updated = {
      autoOpenStudio: toggleAutoOpen?.checked ?? true,
      stripMetadata: toggleStripMeta?.checked ?? true,
      exportFormat: formatSelect?.value ?? 'png',
      theme: themeSelect?.value ?? 'obsidian',
      downloadDirectory: folderInput?.value || 'Pagelens',
      filenameTemplate: `Pagelens_${prefixInput?.value || '{page_title}'}`,
    };
    await SettingsStore.saveSettings(updated);
    if (updated.theme !== 'system') {
      document.documentElement.setAttribute('data-theme', updated.theme);
    }
    showSaved();
  };

  [toggleAutoOpen, toggleStripMeta, formatSelect, themeSelect].forEach((el) => {
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
});
