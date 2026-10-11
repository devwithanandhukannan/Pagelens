/**
 * Pagelens — Empty State UI Component
 * Calm, helpful guidance displayed when no capture session is loaded.
 */

import { eventBus } from '../core/event-bus.js';

export class EmptyState {
  constructor(container) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="empty-state-view" id="pagelens-empty-state">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        </div>
        <h2 class="empty-title">Welcome to Pagelens Studio</h2>
        <p class="empty-subtitle">
          Capture any webpage with one click or explore the Apple Sonoma Zero-Border Studio tools using a preloaded sample capture.
        </p>

        <div style="display: flex; gap: 12px; margin-top: 8px;">
          <button class="action-btn primary spring-btn" id="empty-load-sample">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Load Sample Capture
          </button>
          <label class="action-btn secondary spring-btn" style="cursor: pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Image
            <input type="file" id="empty-file-input" accept="image/*" style="display: none;">
          </label>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const sampleBtn = document.getElementById('empty-load-sample');
    const fileInput = document.getElementById('empty-file-input');

    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        eventBus.emit('load-sample-capture');
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              eventBus.emit('load-image-element', {
                image: img,
                title: file.name.replace(/\.[^/.]+$/, ''),
              });
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  hide() {
    const el = document.getElementById('pagelens-empty-state');
    if (el) el.style.display = 'none';
  }

  show() {
    const el = document.getElementById('pagelens-empty-state');
    if (el) el.style.display = 'flex';
  }
}
