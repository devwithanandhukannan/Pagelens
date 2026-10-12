/**
 * Pagelens — Files Manager Modal
 * Displays saved previous screenshots in a clean table view matching GoFullPage Files manager:
 * - Select All / Multi-select checkboxes
 * - Batch Download & Batch Delete
 * - Direct row click to open and edit screenshot in Studio
 * - Displays file name, origin URL, size, and date/time
 * - Explicit action controls: View, Download [Format], Retake, Delete
 */

import { eventBus } from '../core/event-bus.js';
import { BlobStore } from '../services/blob-store.js';
import { DownloadManager } from '../../background/download-manager.js';
import { DirectoryPickerService } from '../services/directory-picker.js';
import { encodeCanvas } from '../../workers/encode-worker.js';
import { generatePdfFromCanvas } from '../../workers/pdf-worker.js';

export class FilesModal {
  constructor(container) {
    this.container = container;
    this.selectedIds = new Set();
    this.captures = [];
    this.activeFormat = 'png';
    this.init();
  }

  async init() {
    await this.loadActiveFormat();
    this.render();
    this.bindEvents();
  }

  async loadActiveFormat() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get('pagelens_settings');
        if (stored?.pagelens_settings?.defaultFormat) {
          this.activeFormat = stored.pagelens_settings.defaultFormat;
        }
      } else {
        const local = localStorage.getItem('pagelens_settings');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.defaultFormat) this.activeFormat = parsed.defaultFormat;
        }
      }
    } catch (_) {}
  }

  getFormatBadge(fmt = this.activeFormat) {
    if (fmt === 'jpeg') return 'JPG';
    if (fmt === 'pdf') return 'PDF';
    return 'PNG';
  }

  render() {
    const formatBadge = this.getFormatBadge();

    this.container.innerHTML = `
      <div class="files-modal-backdrop" id="files-modal-backdrop" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="files-modal-title">
        <div class="files-modal-sheet" id="files-modal-sheet">
          <!-- Modal Header -->
          <div class="files-modal-header">
            <div class="files-header-left">
              <h2 class="files-modal-title" id="files-modal-title">Files</h2>
              <span class="files-count-tag" id="files-total-badge">0 captures</span>
            </div>
            <button class="icon-btn spring-btn files-close-btn" id="files-modal-close" aria-label="Close Files Manager">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Top Action Bar (Select all, Format Selector, Download, Delete) -->
          <div class="files-action-toolbar">
            <div class="files-select-cluster">
              <label class="files-checkbox-label">
                <input type="checkbox" id="files-select-all-checkbox" class="files-checkbox" />
                <span class="files-select-text" id="files-selected-count-label">(0 Selected)</span>
              </label>
            </div>

            <div class="files-format-selector-wrap">
              <span class="files-format-selector-label">Format:</span>
              <select id="files-format-select" class="files-format-select" title="Active download format">
                <option value="png" ${this.activeFormat === 'png' ? 'selected' : ''}>PNG</option>
                <option value="jpeg" ${this.activeFormat === 'jpeg' ? 'selected' : ''}>JPG</option>
                <option value="pdf" ${this.activeFormat === 'pdf' ? 'selected' : ''}>PDF</option>
              </select>
            </div>

            <div class="files-batch-actions">
              <button class="files-action-btn" id="files-btn-download-selected" disabled title="Download selected captures as ${formatBadge}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download <span class="files-format-pill header-pill" id="files-batch-format-pill">${formatBadge}</span></span>
              </button>
              <button class="files-action-btn danger" id="files-btn-delete-selected" disabled title="Delete selected captures">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                <span>Delete</span>
              </button>
            </div>
          </div>

          <!-- Files Table / List -->
          <div class="files-table-container">
            <div class="files-table-body" id="files-table-body">
              <div class="files-loading-state">Loading previous screenshots...</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const backdrop = document.getElementById('files-modal-backdrop');
    const closeBtn = document.getElementById('files-modal-close');
    const selectAllBox = document.getElementById('files-select-all-checkbox');
    const downloadBtn = document.getElementById('files-btn-download-selected');
    const deleteBtn = document.getElementById('files-btn-delete-selected');
    const formatSelect = document.getElementById('files-format-select');

    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.hide();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop && backdrop.style.display !== 'none') {
        this.hide();
      }
    });

    eventBus.on('open-files-modal', () => this.show());

    // Format selector change
    if (formatSelect) {
      formatSelect.addEventListener('change', async (e) => {
        this.activeFormat = e.target.value;
        this.updateFormatBadges();

        // Update settings in storage
        try {
          if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            const stored = await chrome.storage.local.get('pagelens_settings');
            const s = stored.pagelens_settings || {};
            s.defaultFormat = this.activeFormat;
            await chrome.storage.local.set({ pagelens_settings: s });
          } else {
            const local = localStorage.getItem('pagelens_settings');
            const s = local ? JSON.parse(local) : {};
            s.defaultFormat = this.activeFormat;
            localStorage.setItem('pagelens_settings', JSON.stringify(s));
          }
          eventBus.emit('settings-changed', { defaultFormat: this.activeFormat });
        } catch (_) {}
      });
    }

    // React to external settings changes
    eventBus.on('settings-changed', (s) => {
      if (s?.defaultFormat && s.defaultFormat !== this.activeFormat) {
        this.activeFormat = s.defaultFormat;
        if (formatSelect) formatSelect.value = s.defaultFormat;
        this.updateFormatBadges();
      }
    });

    // Select all checkbox
    if (selectAllBox) {
      selectAllBox.addEventListener('click', (e) => e.stopPropagation());
      selectAllBox.addEventListener('change', (e) => {
        e.stopPropagation();
        if (selectAllBox.checked) {
          this.captures.forEach(c => this.selectedIds.add(c.id));
        } else {
          this.selectedIds.clear();
        }
        this.updateSelectionUI();
      });
    }

    // Batch download
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.downloadSelected();
      });
    }

    // Batch delete
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await this.deleteSelected();
      });
    }

    eventBus.on('history-updated', () => {
      if (backdrop && backdrop.style.display !== 'none') {
        this.loadFiles();
      }
    });
  }

  updateFormatBadges() {
    const badge = this.getFormatBadge();
    const batchPill = document.getElementById('files-batch-format-pill');
    if (batchPill) batchPill.textContent = badge;

    const rowPills = document.querySelectorAll('.files-row-dl .row-format-pill');
    rowPills.forEach(pill => {
      pill.textContent = badge;
    });

    const downloadBtn = document.getElementById('files-btn-download-selected');
    if (downloadBtn) downloadBtn.title = `Download selected captures as ${badge}`;
  }

  async show() {
    const backdrop = document.getElementById('files-modal-backdrop');
    if (backdrop) {
      await this.loadActiveFormat();
      const formatSelect = document.getElementById('files-format-select');
      if (formatSelect) formatSelect.value = this.activeFormat;
      this.updateFormatBadges();

      backdrop.style.display = 'flex';
      this.selectedIds.clear();
      await this.loadFiles();
    }
  }

  hide() {
    const backdrop = document.getElementById('files-modal-backdrop');
    if (backdrop) {
      backdrop.style.display = 'none';
      this.selectedIds.clear();
    }
  }

  async loadFiles() {
    const body = document.getElementById('files-table-body');
    const totalBadge = document.getElementById('files-total-badge');
    if (!body) return;

    this.captures = await BlobStore.getAllCaptures();
    if (totalBadge) {
      totalBadge.textContent = `${this.captures.length} captures`;
    }

    if (this.captures.length === 0) {
      body.innerHTML = `
        <div class="files-empty-state">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <div class="empty-title">No Previous Screenshots</div>
          <div class="empty-desc">Any screenshots captured with Pagelens will be saved here automatically (up to 10 retained).</div>
        </div>
      `;
      this.updateSelectionUI();
      return;
    }

    const formatBadge = this.getFormatBadge();
    body.innerHTML = '';
    this.captures.forEach((item) => {
      const row = document.createElement('div');
      row.className = `files-table-row ${this.selectedIds.has(item.id) ? 'selected' : ''}`;
      row.dataset.id = item.id;

      const dateStr = this.formatDate(item.timestamp);
      const sizeStr = this.formatSize(item.size || (item.blob ? item.blob.size : 0));
      const urlStr = item.url || 'chrome://pagelens/capture';

      row.innerHTML = `
        <div class="files-row-check">
          <input type="checkbox" class="files-checkbox row-select-box" data-id="${item.id}" ${this.selectedIds.has(item.id) ? 'checked' : ''} />
        </div>
        <div class="files-row-main">
          <div class="files-row-title-line">
            <span class="files-row-title" title="Open screenshot in editor">${this.escapeHtml(item.title || 'Untitled Screenshot')}</span>
            <span class="files-row-badge">edited</span>
          </div>
          <div class="files-row-url" title="${this.escapeHtml(urlStr)}">${this.escapeHtml(urlStr)}</div>
        </div>
        <div class="files-row-size">${sizeStr}</div>
        <div class="files-row-date">${dateStr}</div>
        <div class="files-row-actions">
          <button type="button" class="files-row-btn files-row-open" title="View & edit in Studio">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>View</span>
          </button>
          <button type="button" class="files-row-btn files-row-dl" title="Download as ${formatBadge}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download</span>
            <span class="files-format-pill row-format-pill">${formatBadge}</span>
          </button>
          <button type="button" class="files-row-btn files-row-retake" title="Retake this capture">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
          <button type="button" class="files-row-btn files-row-del danger" title="Delete screenshot">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            <span>Delete</span>
          </button>
        </div>
      `;

      // 1. Checkbox click isolation
      const checkCol = row.querySelector('.files-row-check');
      if (checkCol) {
        checkCol.addEventListener('click', (e) => e.stopPropagation());
      }
      const cb = row.querySelector('.row-select-box');
      if (cb) {
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          if (e.target.checked) {
            this.selectedIds.add(item.id);
          } else {
            this.selectedIds.delete(item.id);
          }
          this.updateSelectionUI();
        });
      }

      // 2. Actions column click isolation
      const actionsCol = row.querySelector('.files-row-actions');
      if (actionsCol) {
        actionsCol.addEventListener('click', (e) => e.stopPropagation());
      }

      // 3. View button
      const openBtn = row.querySelector('.files-row-open');
      if (openBtn) {
        openBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openScreenshot(item);
        });
      }

      // 4. Download button
      const dlBtn = row.querySelector('.files-row-dl');
      if (dlBtn) {
        dlBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this.downloadItem(item);
        });
      }

      // 5. Retake button
      const retakeBtn = row.querySelector('.files-row-retake');
      if (retakeBtn) {
        retakeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.hide();
          eventBus.emit('retake-current-capture', {
            meta: {
              url: item.url,
              tabId: item.tabId,
              type: item.type || 'full-page',
              title: item.title,
            }
          });
        });
      }

      // 6. Delete button
      const delBtn = row.querySelector('.files-row-del');
      if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            await BlobStore.removeCapture(item.id);
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
              try {
                await chrome.storage.local.remove(item.id);
              } catch (_) {}
            }
            this.selectedIds.delete(item.id);
            eventBus.emit('history-updated');
            eventBus.emit('show-toast', { message: 'Screenshot deleted', options: { icon: 'check' } });
            await this.loadFiles();
          } catch (err) {
            console.error('[FilesModal] Delete failed:', err);
            eventBus.emit('show-toast', { message: 'Failed to delete screenshot', options: { icon: 'alert' } });
          }
        });
      }

      // 7. Row click to open (guarded so actions/checkbox never trigger it)
      row.addEventListener('click', (e) => {
        if (e.target.closest('.files-row-actions') || e.target.closest('.files-row-check')) {
          return;
        }
        this.openScreenshot(item);
      });

      body.appendChild(row);
    });

    this.updateSelectionUI();
  }

  updateSelectionUI() {
    const selectAllBox = document.getElementById('files-select-all-checkbox');
    const countLabel = document.getElementById('files-selected-count-label');
    const downloadBtn = document.getElementById('files-btn-download-selected');
    const deleteBtn = document.getElementById('files-btn-delete-selected');

    const total = this.captures.length;
    const selected = this.selectedIds.size;

    if (countLabel) {
      countLabel.textContent = `(${selected} Selected)`;
    }

    if (selectAllBox) {
      selectAllBox.checked = total > 0 && selected === total;
      selectAllBox.indeterminate = selected > 0 && selected < total;
    }

    const hasSelection = selected > 0;
    if (downloadBtn) downloadBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;

    // Update row highlight
    document.querySelectorAll('.files-table-row').forEach(row => {
      const id = row.dataset.id;
      const isSelected = this.selectedIds.has(id);
      row.classList.toggle('selected', isSelected);
      const cb = row.querySelector('.row-select-box');
      if (cb) cb.checked = isSelected;
    });
  }

  async openScreenshot(item) {
    this.hide();
    if (item.blob) {
      const blob = item.blob instanceof Blob ? item.blob : new Blob([item.blob], { type: 'image/png' });
      const img = new Image();
      img.onload = () => {
        eventBus.emit('load-image-element', { image: img, title: item.title || 'Screenshot', fromHistory: true });
        eventBus.emit('show-toast', { message: `Opened ${item.title || 'Screenshot'}`, options: { icon: 'check' } });
      };
      img.src = URL.createObjectURL(blob);
    } else if (item.dataUrl) {
      const img = new Image();
      img.onload = () => {
        eventBus.emit('load-image-element', { image: img, title: item.title || 'Screenshot', fromHistory: true });
        eventBus.emit('show-toast', { message: `Opened ${item.title || 'Screenshot'}`, options: { icon: 'check' } });
      };
      img.src = item.dataUrl;
    }
  }

  async blobToCanvas(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob], { type: 'image/png' }));
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  async downloadItem(item, targetFormat = this.activeFormat) {
    const format = targetFormat || 'png';
    const ext = format === 'jpeg' ? 'jpg' : format;
    const title = item.title || 'Screenshot';
    const filename = DownloadManager.generateFilename(title, ext);

    try {
      let finalBlob = null;
      let rawBlob = item.blob instanceof Blob ? item.blob : (item.blob ? new Blob([item.blob], { type: 'image/png' }) : null);

      if (!rawBlob && item.dataUrl) {
        const resp = await fetch(item.dataUrl);
        rawBlob = await resp.blob();
      }

      if (!rawBlob) {
        throw new Error('Image data not found');
      }

      if (format === 'png') {
        finalBlob = rawBlob;
      } else if (format === 'jpeg') {
        const canvas = await this.blobToCanvas(rawBlob);
        finalBlob = await encodeCanvas(canvas, 'jpeg', 0.92);
      } else if (format === 'pdf') {
        const canvas = await this.blobToCanvas(rawBlob);
        finalBlob = await generatePdfFromCanvas(canvas, { title });
      }

      // Check if user set a custom directory handle via DirectoryPicker
      try {
        const storedHandle = await DirectoryPickerService.getStoredHandle();
        if (storedHandle) {
          const res = await DirectoryPickerService.saveBlobToDirectory(finalBlob, filename);
          if (res?.success) {
            eventBus.emit('show-toast', {
              message: `Saved to 📁 ${res.folderName}/${filename}`,
              options: { icon: 'check' },
            });
            return true;
          }
        }
      } catch (err) {
        console.warn('[FilesModal] Direct folder save fallback:', err);
      }

      // Standard download fallback
      const dataUrl = URL.createObjectURL(finalBlob);
      await DownloadManager.downloadDataUrl(dataUrl, filename);
      setTimeout(() => URL.revokeObjectURL(dataUrl), 10000);
      eventBus.emit('show-toast', {
        message: `Downloaded ${filename}`,
        options: { icon: 'check' },
      });
      return true;
    } catch (err) {
      console.error('[FilesModal] Download failed:', err);
      eventBus.emit('show-toast', {
        message: 'Download failed: ' + (err.message || 'Unknown error'),
        options: { icon: 'alert' },
      });
      return false;
    }
  }

  async downloadSelected() {
    const toDownload = this.captures.filter(c => this.selectedIds.has(c.id));
    if (toDownload.length === 0) return;

    for (let i = 0; i < toDownload.length; i++) {
      await this.downloadItem(toDownload[i], this.activeFormat);
      // Small pause between multiple downloads to avoid browser block
      if (i < toDownload.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    eventBus.emit('show-toast', {
      message: `Downloaded ${toDownload.length} screenshot${toDownload.length > 1 ? 's' : ''} (${this.getFormatBadge()})`,
      options: { icon: 'check' }
    });
  }

  async deleteSelected() {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) return;

    try {
      await BlobStore.deleteCaptures(ids);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          await chrome.storage.local.remove(ids);
        } catch (_) {}
      }
      this.selectedIds.clear();
      eventBus.emit('history-updated');
      eventBus.emit('show-toast', {
        message: `Deleted ${ids.length} screenshot${ids.length > 1 ? 's' : ''}`,
        options: { icon: 'check' }
      });
      await this.loadFiles();
    } catch (err) {
      console.error('[FilesModal] Batch delete failed:', err);
      eventBus.emit('show-toast', { message: 'Failed to delete selected captures', options: { icon: 'alert' } });
    }
  }

  formatDate(timestamp) {
    if (!timestamp) return 'Recently';
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  }

  formatSize(bytes) {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
