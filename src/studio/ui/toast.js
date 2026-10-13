/**
 * Pagelens — Toast HUD UI Component
 * Floating glassmorphism pill toast with spring entrance, vector SVG icons,
 * interactive text annotation prompt toast, and optional undo action.
 */

import { eventBus } from '../core/event-bus.js';
import { history } from '../core/history.js';
import { store } from '../core/store.js';
import { AddShapeCommand } from '../core/commands/add-shape-command.js';

export class Toast {
  constructor(container) {
    this.container = container;
    this.activePrompt = null;
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="hud-toast-container" id="hud-toast-container" role="status" aria-live="polite"></div>
    `;
    this.toastBox = document.getElementById('hud-toast-container');
  }

  show(message, options = {}) {
    const { duration = 3200, showUndo = false, icon = null } = options;

    let iconSvg;
    if (icon === 'redact' || message.toLowerCase().includes('redact')) {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-crimson)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    } else if (icon === 'check' || message.toLowerCase().includes('saved') || message.toLowerCase().includes('copied') || message.toLowerCase().includes('download')) {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-mint)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-violet)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>`;
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'hud-toast';
    toastEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        ${iconSvg}
        <span>${message}</span>
      </div>
      ${showUndo ? `<button class="toast-undo-btn spring-btn">Undo</button>` : ''}
    `;

    if (showUndo) {
      toastEl.querySelector('.toast-undo-btn').addEventListener('click', () => {
        history.undo();
        this.dismiss(toastEl);
      });
    }

    // Keep at most 2 toasts simultaneously to prevent screen clutter
    while (this.toastBox.children.length >= 2) {
      const old = this.toastBox.firstChild;
      if (old) old.remove();
    }

    this.toastBox.appendChild(toastEl);

    setTimeout(() => {
      this.dismiss(toastEl);
    }, duration);
  }

  /**
   * In-app HUD Prompt Toast (replaces browser native blocking prompt() modal)
   */
  showPromptToast({ title = 'Enter annotation text', defaultValue = 'Note', onConfirm, onCancel }) {
    if (this.activePrompt) {
      this.dismissPrompt();
    }

    const promptEl = document.createElement('div');
    promptEl.className = 'hud-prompt-toast';
    promptEl.innerHTML = `
      <div class="hud-prompt-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        <span>${title}</span>
      </div>
      <div class="hud-prompt-body">
        <input type="text" class="hud-prompt-input" value="${defaultValue}" placeholder="Type note or annotation..." spellcheck="false" autocomplete="off" />
      </div>
      <div class="hud-prompt-actions">
        <button class="spring-btn hud-prompt-btn cancel-btn" type="button">Cancel</button>
        <button class="spring-btn hud-prompt-btn confirm-btn" type="button">OK</button>
      </div>
    `;

    const input = promptEl.querySelector('.hud-prompt-input');
    const cancelBtn = promptEl.querySelector('.cancel-btn');
    const confirmBtn = promptEl.querySelector('.confirm-btn');

    const handleConfirm = () => {
      const val = input.value.trim();
      this.dismissPrompt();
      if (val && onConfirm) {
        onConfirm(val);
      }
    };

    const handleCancel = () => {
      this.dismissPrompt();
      if (onCancel) onCancel();
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });

    this.toastBox.appendChild(promptEl);
    this.activePrompt = promptEl;

    // Autofocus and select text
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }

  dismissPrompt() {
    if (!this.activePrompt) return;
    const el = this.activePrompt;
    this.activePrompt = null;
    el.style.animation = 'toast-spring-out 0.22s var(--ease-spring) forwards';
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 220);
  }

  dismiss(toastEl) {
    if (!toastEl || !toastEl.parentNode) return;
    toastEl.style.animation = 'toast-spring-out 0.24s var(--ease-spring) forwards';
    setTimeout(() => {
      if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    }, 240);
  }

  bindEvents() {
    eventBus.on('show-toast', ({ message, options }) => {
      this.show(message, options);
    });

    eventBus.on('redaction-applied', () => {
      this.show('Redaction layer added — Permanent on export', { showUndo: true, icon: 'redact' });
    });
  }
}
