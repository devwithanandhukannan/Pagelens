/**
 * Pagelens — Studio Main Orchestrator
 * Bootstraps the editor engine, renders the three-layer canvas pipeline,
 * and handles zoom, pan, and tool dispatching.
 */

import { AppShell } from './app-shell.js';
import { TopBar } from './ui/top-bar.js';
import { Toolbar } from './ui/toolbar.js';
import { Inspector } from './ui/inspector.js';
import { Toast } from './ui/toast.js';
import { ExportSheet } from './ui/export-sheet.js';
import { SettingsModal } from './ui/settings-modal.js';
import { EmptyState } from './ui/empty-state.js';
import { ViewportDock } from './ui/viewport-dock.js';
import { FilesModal } from './ui/files-modal.js';
import { AutosaveService } from './services/autosave.js';
import { BlobStore } from './services/blob-store.js';
import { ExportService } from './services/export-service.js';
import { LiveTextOverlay } from './ui/live-text-overlay.js';

import { store } from './core/store.js';
import { eventBus } from './core/event-bus.js';
import { documentModel } from './core/document-model.js';
import { viewport } from './core/viewport.js';
import { toolRegistry } from './tools/tool-registry.js';

import { baseLayer } from './render/base-layer.js';
import { effectsLayer } from './render/effects-layer.js';
import { annotationLayer } from './render/annotation-layer.js';

class StudioApp {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.transformWrapper = null;
    this.isSpacePressed = false;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.renderScheduled = false;
  }

  async init() {
    const root = document.getElementById('app-root') || document.body;
    this.shell = new AppShell(root);

    // Mount UI components
    this.topbar = new TopBar(document.getElementById('topbar-mount'), store, documentModel);
    this.toolbar = new Toolbar(document.getElementById('toolbar-mount'), store);
    this.inspector = new Inspector(document.getElementById('inspector-mount'), store);
    this.toast = new Toast(document.getElementById('toast-mount'));
    this.exportSheet = new ExportSheet(document.getElementById('export-sheet-mount'), documentModel);
    this.settingsModal = new SettingsModal(document.getElementById('settings-modal-mount'), store);
    this.filesModal = new FilesModal(document.getElementById('files-modal-mount'));
    this.viewportDock = new ViewportDock(document.getElementById('viewport-dock-mount'));
    this.emptyState = new EmptyState(document.getElementById('empty-state-mount'));
    this.autosave = new AutosaveService(documentModel);

    // Canvas elements
    this.canvas = document.getElementById('pagelens-main-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('studio-canvas-container');
    this.transformWrapper = document.getElementById('canvas-transform-wrapper');

    // Apple Live Text OCR & Text Selection Engine
    this.liveTextOverlay = new LiveTextOverlay(this.container, this.transformWrapper, documentModel);

    this.bindCanvasEvents();
    this.bindWindowEvents();

    // Check for sessionId in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (sessionId) {
      await this.loadSession(sessionId);
    } else {
      // Show clean empty state guidance over dot-grid canvas
      this.transformWrapper.style.display = 'none';
      this.emptyState.show();
    }

    // Set initial tool
    toolRegistry.setActiveTool('select');
  }

  bindCanvasEvents() {
    const updateContainerSize = () => {
      const rect = this.container.getBoundingClientRect();
      viewport.setContainerDimensions(rect.width, rect.height);
    };
    window.addEventListener('resize', updateContainerSize);
    setTimeout(updateContainerSize, 50);

    // Pointer events on canvas container
    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));

    // Mouse wheel for zoom and pan
    this.container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Keyboard handlers (Space for panning, Escape, Delete)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isSpacePressed && e.target.tagName !== 'INPUT') {
        this.isSpacePressed = true;
        this.container.classList.add('panning');
      }
      const activeTool = toolRegistry.activeTool;
      if (activeTool && activeTool.onKeyDown) {
        activeTool.onKeyDown(e, store, documentModel);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        this.container.classList.remove('panning');
      }
    });

    // Tool change synchronization
    eventBus.on('tool-changed', (toolName) => {
      const tool = toolRegistry.setActiveTool(toolName);
      if (this.container) {
        this.container.style.cursor = tool?.cursor || 'default';
      }
      this.requestRender();
    });

    // Render loop triggers
    eventBus.on('document-changed', () => this.requestRender());
    eventBus.on('selection-changed', () => this.requestRender());
    eventBus.on('viewport-changed', () => this.updateViewportTransform());
  }

  bindWindowEvents() {
    eventBus.on('load-image-element', ({ image, title, fromHistory }) => {
      this.setDocumentImage(image, { title, isExisting: !!fromHistory });
    });
    eventBus.on('fit-to-screen', () => {
      viewport.fitToScreen(documentModel.width, documentModel.height);
    });
    eventBus.on('recenter-canvas', () => {
      viewport.recenter(documentModel.width, documentModel.height);
      this.updateViewportTransform();
    });
    eventBus.on('clear-annotations', () => {
      if (documentModel.annotations.length > 0 || documentModel.crop) {
        documentModel.annotations = [];
        documentModel.setCrop(null);
        store.setSelectedObject(null);
        eventBus.emit('document-changed');
        this.requestRender();
        this.toast?.show('All markups cleared', { icon: 'check' });
      }
    });
    eventBus.on('open-export-sheet', () => {
      this.exportSheet?.show();
    });

    eventBus.on('copy-to-clipboard', async () => {
      try {
        await ExportService.exportDocument(documentModel, {
          format: 'png',
          destination: 'clipboard',
        });
        this.toast?.show('Screenshot copied to clipboard', { icon: 'check' });
      } catch (err) {
        this.toast?.show(`Copy failed: ${err.message}`, { icon: 'alert' });
      }
    });

    // Listen for retake background updates
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'PAGELENS_SESSION_UPDATED' && msg.sessionId) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('sessionId', msg.sessionId);
          window.history.replaceState({}, '', newUrl.toString());
          this.loadSession(msg.sessionId);
          this.toast?.show('Screenshot retaken successfully!', { icon: 'check' });
        }
      });
    }

    eventBus.on('retake-current-capture', async (opts = {}) => {
      await this.retakeCurrentCapture(opts);
    });
  }

  async retakeCurrentCapture(opts = {}) {
    const meta = opts.meta || this.currentCaptureMeta || {
      url: documentModel.url,
      tabId: documentModel.tabId,
      type: documentModel.captureType || 'full-page',
    };

    if (!meta.url && !meta.tabId) {
      this.toast?.show('No source webpage found to retake.', { icon: 'alert' });
      return;
    }

    this.toast?.show('Retaking screenshot from source page...', { icon: 'clock' });

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        const response = await chrome.runtime.sendMessage({
          type: 'PAGELENS_RETAKE',
          url: meta.url,
          tabId: meta.tabId,
          captureType: opts.captureType || meta.type || 'full-page',
        });
        if (response && response.sessionId) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('sessionId', response.sessionId);
          window.history.replaceState({}, '', newUrl.toString());
          await this.loadSession(response.sessionId);
          this.toast?.show('Screenshot retaken successfully!', { icon: 'check' });
        }
      }
    } catch (err) {
      console.error('[Studio] Retake failed:', err);
      this.toast?.show(err.message || 'Failed to retake screenshot.', { icon: 'alert' });
    }
  }

  onPointerDown(e) {
    if (!documentModel.baseImage) return;

    // Pan mode (Space pressed or middle click)
    if (this.isSpacePressed || e.button === 1) {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return; // Only primary button for tools

    this.container.classList.add('dragging-active');

    const containerRect = this.container.getBoundingClientRect();
    const canvasPt = viewport.screenToCanvas(e.clientX, e.clientY, containerRect);

    const activeTool = toolRegistry.activeTool;
    if (activeTool) {
      activeTool.onPointerDown(e, canvasPt, store, documentModel);
      this.requestRender();
    }
  }

  onPointerMove(e) {
    if (this.isPanning) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.panStart = { x: e.clientX, y: e.clientY };
      viewport.panBy(dx, dy);
      return;
    }

    if (!documentModel.baseImage) return;

    const containerRect = this.container.getBoundingClientRect();
    const canvasPt = viewport.screenToCanvas(e.clientX, e.clientY, containerRect);

    const activeTool = toolRegistry.activeTool;
    if (activeTool) {
      activeTool.onPointerMove(e, canvasPt, store, documentModel);
      this.requestRender();
    }
  }

  onPointerUp(e) {
    this.container.classList.remove('dragging-active');

    if (this.isPanning) {
      this.isPanning = false;
      return;
    }

    if (!documentModel.baseImage) return;

    const containerRect = this.container.getBoundingClientRect();
    const canvasPt = viewport.screenToCanvas(e.clientX, e.clientY, containerRect);

    const activeTool = toolRegistry.activeTool;
    if (activeTool) {
      activeTool.onPointerUp(e, canvasPt, store, documentModel);
      this.requestRender();
    }
  }

  onWheel(e) {
    e.preventDefault();

    // Normalize delta mode across trackpads and mouse wheels
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.deltaMode === 1) { // LINE mode (mouse wheel ticks)
      dx *= 16;
      dy *= 16;
    } else if (e.deltaMode === 2) { // PAGE mode
      dx *= 80;
      dy *= 80;
    }

    if (e.ctrlKey || e.metaKey) {
      // Smooth, controlled zoom centered on cursor
      const containerRect = this.container.getBoundingClientRect();
      const originX = e.clientX - containerRect.left;
      const originY = e.clientY - containerRect.top;
      const zoomFactor = Math.exp(-dy * 0.0025);
      const clampedFactor = Math.max(0.85, Math.min(1.15, zoomFactor));
      viewport.setZoom(viewport.zoom * clampedFactor, originX, originY);
    } else {
      // Smooth, controllable pan with gentle damping and velocity cap
      const damp = 0.65;
      const maxDelta = 80;
      const clampedDx = Math.max(-maxDelta, Math.min(maxDelta, dx)) * damp;
      const clampedDy = Math.max(-maxDelta, Math.min(maxDelta, dy)) * damp;
      viewport.panBy(-clampedDx, -clampedDy);
    }
  }

  updateViewportTransform() {
    if (!this.transformWrapper) return;
    this.transformWrapper.style.transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`;
    if (this.container) {
      this.container.style.backgroundPosition = `${viewport.panX}px ${viewport.panY}px`;
    }
  }

  requestRender() {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.renderScheduled = false;
      this.render();
    });
  }

  render() {
    if (!documentModel.baseImage || !this.ctx) return;

    const { width, height } = documentModel;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.clearRect(0, 0, width, height);

    // 1. Base Layer
    baseLayer.render(this.ctx, documentModel);

    // 2. Effects Layer (pixelate, blur, redact)
    effectsLayer.render(this.ctx, documentModel, false);

    // 3. Annotation Layer (shapes, pen, text, stamps, handles)
    annotationLayer.render(this.ctx, documentModel, store.getState().selectedObjectId);
  }

  setDocumentImage(image, meta = {}) {
    documentModel.setBaseImage(image, meta);
    this.emptyState.hide();
    this.transformWrapper.style.display = 'block';

    // Persist to recent captures history (last 10 screenshots) if saveHistory is enabled
    this.persistRecentCapture(image, meta);

    // Trigger premium minimalist screenshot reveal entrance animation
    this.transformWrapper.classList.remove('screenshot-enter-active');
    void this.transformWrapper.offsetWidth;
    this.transformWrapper.classList.add('screenshot-enter-active');
    const onRevealEnd = () => {
      this.transformWrapper.classList.remove('screenshot-enter-active');
      this.transformWrapper.removeEventListener('animationend', onRevealEnd);
    };
    this.transformWrapper.addEventListener('animationend', onRevealEnd, { once: true });
    setTimeout(() => {
      this.transformWrapper.classList.remove('screenshot-enter-active');
    }, 400);

    const updateDimensionsAndFit = () => {
      const rect = this.container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        viewport.setContainerDimensions(rect.width, rect.height);
        viewport.fitToScreen(documentModel.width, documentModel.height);
        this.updateViewportTransform();
        this.requestRender();
      }
    };

    updateDimensionsAndFit();
    requestAnimationFrame(updateDimensionsAndFit);
    setTimeout(updateDimensionsAndFit, 50);
  }

  async persistRecentCapture(image, meta = {}) {
    if (!image || meta.isSample || meta.isExisting) return;
    try {
      let saveHistory = true;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get('pagelens_settings');
        if (stored?.pagelens_settings?.saveHistory !== undefined) {
          saveHistory = stored.pagelens_settings.saveHistory;
        }
      } else {
        const local = localStorage.getItem('pagelens_settings');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.saveHistory !== undefined) saveHistory = parsed.saveHistory;
        }
      }
      if (!saveHistory) return;

      const tempCanvas = document.createElement('canvas');
      const w = image.naturalWidth || image.width || documentModel.width;
      const h = image.naturalHeight || image.height || documentModel.height;
      if (!w || !h) return;
      tempCanvas.width = Math.min(w, 2400);
      tempCanvas.height = Math.min(h, Math.round(2400 * (h / w)));
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);

      tempCanvas.toBlob(async (blob) => {
        if (blob) {
          const sid = meta.sessionId || ('capture_' + Date.now());
          await BlobStore.saveCapture(sid, blob, {
            title: meta.title || documentModel.title || 'Screenshot',
            url: meta.url || '',
            size: blob.size,
            width: w,
            height: h,
            timestamp: Date.now(),
            textBlocks: meta.textBlocks || documentModel.textBlocks || [],
          });
          eventBus.emit('history-updated');
        }
      }, 'image/png');
    } catch (e) {
      // Non-blocking persistence
    }
  }

  async loadSession(sessionId) {
    this.currentSessionId = sessionId;
    try {
      // Try IndexedDB first
      const record = await BlobStore.getCapture(sessionId);
      if (record) {
        const meta = {
          sessionId,
          title: record.title || 'Captured Page',
          url: record.url || '',
          tabId: record.tabId,
          type: record.type || 'full-page',
          textBlocks: record.textBlocks || [],
          isExisting: true,
        };
        this.currentCaptureMeta = meta;

        if (record.blob) {
          const blob = record.blob instanceof Blob ? record.blob : new Blob([record.blob], { type: 'image/png' });
          const img = new Image();
          img.onload = () => {
            this.setDocumentImage(img, meta);
          };
          img.src = URL.createObjectURL(blob);
          return;
        } else if (record.dataUrl) {
          const img = new Image();
          img.onload = () => {
            this.setDocumentImage(img, meta);
          };
          img.src = record.dataUrl;
          return;
        }
      }

      // Try chrome.storage.local
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const res = await chrome.storage.local.get(sessionId);
        const data = res[sessionId];
        if (data) {
          const meta = {
            sessionId,
            title: data.title || 'Captured Page',
            url: data.url || '',
            tabId: data.tabId,
            type: data.type || 'full-page',
            textBlocks: data.textBlocks || [],
            isExisting: true,
          };
          this.currentCaptureMeta = meta;

          if (data.dataUrl) {
            const img = new Image();
            img.onload = () => {
              this.setDocumentImage(img, meta);
            };
            img.src = data.dataUrl;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[Studio] Failed to load session:', e);
    }

    // Fallback to empty state if session loading fails or does not contain image
    this.transformWrapper.style.display = 'none';
    this.emptyState.show();
  }

  loadSampleCapture() {
    // Deprecated: No sample image loaded by default. Clean workspace provided.
    this.transformWrapper.style.display = 'none';
    this.emptyState.show();
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new StudioApp();
  app.init().catch((err) => console.error('[Pagelens Studio Init Error]', err));
});
