/**
 * Pagelens — Export Sheet UI Component
 * Apple-grade slide-up bottom sheet with format choices, PDF splitting, and privacy toggles.
 */

import { eventBus } from '../core/event-bus.js';
import { ExportService } from '../services/export-service.js';

export class ExportSheet {
  constructor(container, documentModel) {
    this.container = container;
    this.documentModel = documentModel;
    this.isOpen = false;
    this.selectedFormat = 'png';
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="export-sheet-backdrop" id="export-sheet-backdrop">
        <div class="export-sheet" role="dialog" aria-modal="true" aria-labelledby="export-sheet-title">
          <div class="sheet-header">
            <h2 class="sheet-title" id="export-sheet-title">Export Capture</h2>
            <button class="icon-btn spring-btn" id="export-sheet-close" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <!-- Format Choice -->
          <div>
            <label class="inspector-label" style="margin-bottom: 8px; display: block;">Format</label>
            <div class="format-selector" role="radiogroup">
              <div class="format-option active" data-format="png" role="radio" aria-checked="true">PNG (Lossless)</div>
              <div class="format-option" data-format="jpeg" role="radio" aria-checked="false">JPEG (Compact)</div>
              <div class="format-option" data-format="pdf" role="radio" aria-checked="false">PDF (Document)</div>
            </div>
          </div>

          <!-- JPEG Quality Slider (visible for JPEG) -->
          <div id="jpeg-quality-container" style="display: none;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span class="inspector-label">Quality</span>
              <span id="quality-display" style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">92%</span>
            </div>
            <input type="range" id="export-quality-slider" min="50" max="100" value="92" style="width: 100%; accent-color: var(--accent-violet);">
          </div>

          <!-- PDF Page Layout (visible for PDF) -->
          <div id="pdf-options-container" style="display: none;">
            <label class="inspector-label" style="margin-bottom: 8px; display: block;">Page Layout</label>
            <div style="display: flex; gap: 8px;">
              <button class="spring-btn pill-badge" data-pdf-size="a4" style="height: 32px; padding: 0 14px;">A4 Paginated</button>
              <button class="spring-btn icon-btn" data-pdf-size="letter" style="height: 32px; padding: 0 14px; width: auto; font-size: 12px;">US Letter</button>
              <button class="spring-btn icon-btn" data-pdf-size="continuous" style="height: 32px; padding: 0 14px; width: auto; font-size: 12px;">Continuous Canvas</button>
            </div>
          </div>

          <!-- Apple Toggle: Strip Metadata -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
            <div>
              <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Strip Metadata</div>
              <div style="font-size: 12px; color: var(--text-muted);">Remove EXIF and system tags on export</div>
            </div>
            <label class="apple-toggle">
              <input type="checkbox" id="toggle-strip-meta" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Actions -->
          <div style="display: flex; gap: 12px; margin-top: 8px;">
            <button class="action-btn secondary spring-btn" id="export-action-clipboard" style="flex: 1; justify-content: center; height: 42px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
              Copy to Clipboard
            </button>
            <button class="action-btn primary spring-btn" id="export-action-download" style="flex: 1; justify-content: center; height: 42px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const backdrop = document.getElementById('export-sheet-backdrop');
    const closeBtn = document.getElementById('export-sheet-close');

    eventBus.on('open-export-sheet', () => {
      this.isOpen = true;
      backdrop.classList.add('open');
    });

    const closeSheet = () => {
      this.isOpen = false;
      backdrop.classList.remove('open');
    };

    closeBtn.addEventListener('click', closeSheet);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeSheet();
    });

    // Format selection
    const formatOptions = backdrop.querySelectorAll('.format-option');
    const jpegBox = document.getElementById('jpeg-quality-container');
    const pdfBox = document.getElementById('pdf-options-container');

    formatOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        formatOptions.forEach((o) => {
          o.classList.remove('active');
          o.setAttribute('aria-checked', 'false');
        });
        opt.classList.add('active');
        opt.setAttribute('aria-checked', 'true');
        this.selectedFormat = opt.dataset.format;

        jpegBox.style.display = this.selectedFormat === 'jpeg' ? 'block' : 'none';
        pdfBox.style.display = this.selectedFormat === 'pdf' ? 'block' : 'none';
      });
    });

    // Quality slider
    const qualitySlider = document.getElementById('export-quality-slider');
    const qualityLabel = document.getElementById('quality-display');
    qualitySlider.addEventListener('input', (e) => {
      qualityLabel.textContent = `${e.target.value}%`;
    });

    // Export execution buttons
    document.getElementById('export-action-download').addEventListener('click', async () => {
      try {
        const quality = parseInt(qualitySlider.value, 10) / 100;
        await ExportService.exportDocument(this.documentModel, {
          format: this.selectedFormat,
          quality,
          destination: 'download',
        });
        eventBus.emit('show-toast', { message: 'Screenshot saved to downloads' });
        closeSheet();
      } catch (err) {
        eventBus.emit('show-toast', { message: `Export failed: ${err.message}` });
      }
    });

    document.getElementById('export-action-clipboard').addEventListener('click', async () => {
      try {
        await ExportService.exportDocument(this.documentModel, {
          format: 'png',
          destination: 'clipboard',
        });
        eventBus.emit('show-toast', { message: 'Image copied to clipboard' });
        closeSheet();
      } catch (err) {
        eventBus.emit('show-toast', { message: `Clipboard copy failed: ${err.message}` });
      }
    });
  }
}
