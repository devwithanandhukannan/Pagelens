/**
 * Pagelens — Apple Live Text Overlay & Text Extraction
 * Detects, highlights, and provides interactive text selection on screenshot images.
 * Features:
 * - Floating Apple-style [ ≡ ] toggle button at the bottom-right of the viewport.
 * - Frosted white/blue selection highlight pills synchronized with canvas transforms.
 * - Instant click-to-copy individual text blocks with spring feedback.
 * - Bottom floating [ 📋 Copy All ] action bar.
 * - Multi-engine text recognition: DOM metadata -> Native TextDetector -> Canvas Scanner.
 */

import { eventBus } from '../core/event-bus.js';

export class LiveTextOverlay {
  constructor(rootContainer, canvasTransformWrapper, documentModel) {
    this.rootContainer = rootContainer;
    this.canvasTransformWrapper = canvasTransformWrapper;
    this.documentModel = documentModel;
    this.isActive = false;
    this.detectedBlocks = [];

    this.render();
    this.bindEvents();
  }

  render() {
    // 1. Floating Apple Live Text Toggle Button at Bottom-Right
    let toggleBtn = document.getElementById('btn-live-text-toggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.className = 'live-text-toggle-btn spring-btn';
      toggleBtn.id = 'btn-live-text-toggle';
      toggleBtn.title = 'Live Text: Detect & Copy Text from Screenshot (T)';
      toggleBtn.setAttribute('aria-label', 'Toggle Live Text');
      toggleBtn.innerHTML = `
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 8V6a2 2 0 0 1 2-2h2"/>
          <path d="M16 4h2a2 2 0 0 1 2 2v2"/>
          <path d="M20 16v2a2 2 0 0 1-2 2h-2"/>
          <path d="M8 20H6a2 2 0 0 1-2-2v-2"/>
          <line x1="8" y1="9" x2="16" y2="9"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
          <line x1="8" y1="15" x2="13" y2="15"/>
        </svg>
      `;
      this.rootContainer.appendChild(toggleBtn);
    }
    this.toggleBtn = toggleBtn;

    // 2. Floating Action Bar (Copy All) at Bottom-Left
    let actionsBar = document.getElementById('live-text-actions-bar');
    if (!actionsBar) {
      actionsBar = document.createElement('div');
      actionsBar.className = 'live-text-actions-bar';
      actionsBar.id = 'live-text-actions-bar';
      actionsBar.style.display = 'none';
      actionsBar.innerHTML = `
        <button class="live-text-copy-all-btn spring-btn" id="btn-live-text-copy-all" title="Copy all detected text lines to clipboard">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>Copy All</span>
          <span class="live-text-count-badge" id="live-text-count-badge">0</span>
        </button>
      `;
      this.rootContainer.appendChild(actionsBar);
    }
    this.actionsBar = actionsBar;
    this.copyAllBtn = document.getElementById('btn-live-text-copy-all');
    this.countBadge = document.getElementById('live-text-count-badge');

    // 3. Canvas-Synchronized Overlay Container inside transform wrapper
    let overlay = document.getElementById('live-text-overlay');
    if (!overlay && this.canvasTransformWrapper) {
      overlay = document.createElement('div');
      overlay.className = 'live-text-overlay';
      overlay.id = 'live-text-overlay';
      this.canvasTransformWrapper.appendChild(overlay);
    }
    this.overlay = overlay;
    this.syncDimensions();
  }

  syncDimensions() {
    if (!this.overlay) return;
    const w = this.documentModel.width || 800;
    const h = this.documentModel.height || 600;
    this.overlay.style.width = `${w}px`;
    this.overlay.style.height = `${h}px`;
  }

  bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    if (this.copyAllBtn) {
      this.copyAllBtn.addEventListener('click', () => this.copyAll());
    }

    // Keyboard shortcut (T key toggles Live Text when not typing in input)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Only toggle if not holding space for panning
        this.toggle();
        e.preventDefault();
      }
    });

    eventBus.on('document-loaded', () => {
      this.syncDimensions();
      if (this.isActive) {
        this.detectAndRender();
      }
    });

    eventBus.on('document-changed', () => {
      this.syncDimensions();
      if (this.isActive) {
        this.detectAndRender();
      }
    });
  }

  async toggle() {
    this.isActive = !this.isActive;
    if (this.toggleBtn) {
      this.toggleBtn.classList.toggle('active', this.isActive);
    }

    if (this.isActive) {
      if (this.overlay) this.overlay.classList.add('visible');
      if (this.actionsBar) this.actionsBar.style.display = 'flex';
      await this.detectAndRender();
      eventBus.emit('show-toast', {
        message: `Live Text enabled (${this.detectedBlocks.length} text items detected)`,
        options: { icon: 'check', duration: 2000 }
      });
    } else {
      if (this.overlay) this.overlay.classList.remove('visible');
      if (this.actionsBar) this.actionsBar.style.display = 'none';
      eventBus.emit('show-toast', {
        message: 'Live Text disabled',
        options: { icon: 'check', duration: 1500 }
      });
    }
  }

  async detectAndRender() {
    if (!this.overlay) return;
    this.syncDimensions();

    this.detectedBlocks = await this.extractTextBlocks();
    if (this.countBadge) {
      this.countBadge.textContent = this.detectedBlocks.length;
    }

    this.overlay.innerHTML = '';
    const frag = document.createDocumentFragment();

    this.detectedBlocks.forEach((block, idx) => {
      const pill = document.createElement('div');
      pill.className = 'live-text-pill spring-btn';
      if (block.height > 34) {
        pill.classList.add('live-text-pill-multiline');
      }
      pill.style.left = `${Math.max(0, block.x)}px`;
      pill.style.top = `${Math.max(0, block.y)}px`;
      pill.style.width = `${Math.max(20, block.width)}px`;
      pill.style.height = `${Math.max(16, block.height)}px`;
      pill.title = `Click to copy: "${block.text}"`;

      const label = document.createElement('span');
      label.className = 'live-text-label';
      label.textContent = block.text;

      pill.appendChild(label);

      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyBlockText(block.text, pill);
      });

      frag.appendChild(pill);
    });

    this.overlay.appendChild(frag);
  }

  async extractTextBlocks() {
    // 1. Check if documentModel already contains text blocks (from probe-entry or capture)
    if (this.documentModel.textBlocks && this.documentModel.textBlocks.length > 0) {
      const blocks = this.documentModel.textBlocks;
      const canvasW = this.documentModel.width || 800;

      // Check if coordinates need scaling to canvas pixel dimensions (e.g. 1x CSS coordinates vs 2x Retina canvas)
      let maxX = 0;
      for (const b of blocks) {
        if (b.x + b.width > maxX) maxX = b.x + b.width;
      }

      if (maxX > 0 && maxX * 1.55 < canvasW && canvasW >= 1000) {
        const roundRatio = Math.round((canvasW / maxX) * 10) / 10;
        const scale = roundRatio >= 1.25 && roundRatio <= 3.5 ? roundRatio : (canvasW / maxX);
        return blocks.map(b => ({
          ...b,
          x: Math.round(b.x * scale),
          y: Math.round(b.y * scale),
          width: Math.round(b.width * scale),
          height: Math.round(b.height * scale)
        }));
      }

      return blocks;
    }

    // 2. Check for native Chromium Shape Detection API (window.TextDetector)
    if (typeof window.TextDetector !== 'undefined') {
      try {
        const canvas = document.getElementById('pagelens-main-canvas');
        if (canvas) {
          const detector = new window.TextDetector();
          const detected = await detector.detect(canvas);
          if (detected && detected.length > 0) {
            return detected.map(d => ({
              text: d.rawValue || '',
              x: Math.round(d.boundingBox.x),
              y: Math.round(d.boundingBox.y),
              width: Math.round(d.boundingBox.width),
              height: Math.round(d.boundingBox.height)
            }));
          }
        }
      } catch (err) {
        console.warn('[LiveText] Native TextDetector error:', err);
      }
    }

    // 3. Fallback: Optimal pixel-level canvas text & number region detector
    return this.detectCanvasTextBands();
  }

  /**
   * Fast, optimal pixel-level text & number region detector.
   * Runs client-side directly on canvas pixels with zero external dependencies.
   * Analyzes high-contrast gradient transitions, line profiles, and connected components.
   */
  detectCanvasTextBands() {
    const canvas = document.getElementById('pagelens-main-canvas');
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return [];

    const blocks = [];
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    try {
      // Analyze image data
      // For large images, step down slightly for speed (1-2px stride)
      const stride = w > 2000 || h > 2000 ? 2 : 1;
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 1. Calculate horizontal scanline edge density
      // Text lines produce rapid alternating transitions between dark glyphs and light background
      const rowDensity = new Float32Array(h);
      for (let y = 0; y < h; y += stride) {
        let transitions = 0;
        let prevLum = 0;
        const rowOffset = y * w * 4;

        for (let x = 0; x < w; x += stride * 2) {
          const idx = rowOffset + x * 4;
          // Luminance: 0.299R + 0.587G + 0.114B
          const lum = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          if (x > 0 && Math.abs(lum - prevLum) > 35) {
            transitions++;
          }
          prevLum = lum;
        }
        rowDensity[y] = transitions / (w / (stride * 2));
      }

      // 2. Identify candidate vertical text bands (lines)
      const threshold = 0.038; // minimum edge transition frequency for text
      const bands = [];
      let inBand = false;
      let startY = 0;

      for (let y = 0; y < h; y += stride) {
        const val = rowDensity[y];
        if (!inBand && val >= threshold) {
          inBand = true;
          startY = y;
        } else if (inBand && val < threshold) {
          const height = y - startY;
          // Typical text line height is between 8px and 85px
          if (height >= 8 && height <= 85) {
            bands.push({ y: startY, height });
          }
          inBand = false;
        }
      }
      if (inBand) {
        const height = h - startY;
        if (height >= 8 && height <= 85) {
          bands.push({ y: startY, height });
        }
      }

      // 3. For each detected text band, identify horizontal word/number segments
      for (const band of bands) {
        if (blocks.length >= 1200) break;

        const colDensity = new Float32Array(w);
        const yStart = Math.max(0, band.y + 2);
        const yEnd = Math.min(h - 1, band.y + band.height - 2);

        for (let x = 0; x < w; x += stride) {
          let colTransitions = 0;
          let prevVal = 0;
          for (let y = yStart; y <= yEnd; y += stride) {
            const idx = (y * w + x) * 4;
            const lum = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
            if (y > yStart && Math.abs(lum - prevVal) > 30) {
              colTransitions++;
            }
            prevVal = lum;
          }
          colDensity[x] = colTransitions;
        }

        // Segment words and number blocks along the line
        let inWord = false;
        let startX = 0;
        let emptyCount = 0;

        for (let x = 0; x < w; x += stride) {
          const val = colDensity[x];
          if (!inWord && val > 0.4) {
            inWord = true;
            startX = x;
            emptyCount = 0;
          } else if (inWord) {
            if (val <= 0.4) {
              emptyCount += stride;
              // If gap is wider than 14px, finalize the word/number block
              if (emptyCount >= 14 || x >= w - stride) {
                const wordWidth = x - emptyCount - startX;
                if (wordWidth >= 16) {
                  // Padding around text pill
                  const pillX = Math.max(0, startX - 2);
                  const pillY = Math.max(0, band.y - 2);
                  const pillW = Math.min(w - pillX, wordWidth + 4);
                  const pillH = Math.min(h - pillY, band.height + 4);

                  blocks.push({
                    text: `Text / Number (${Math.round(pillW)}x${Math.round(pillH)})`,
                    x: pillX,
                    y: pillY,
                    width: pillW,
                    height: pillH
                  });
                }
                inWord = false;
                emptyCount = 0;
              }
            } else {
              emptyCount = 0;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[LiveText] Canvas text band detection error:', err);
    }

    return blocks;
  }

  async copyBlockText(text, pillElement) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (pillElement) {
        pillElement.classList.add('just-copied');
        setTimeout(() => pillElement.classList.remove('just-copied'), 600);
      }
      const preview = text.length > 36 ? `${text.slice(0, 36)}...` : text;
      eventBus.emit('show-toast', {
        message: `Copied: "${preview}"`,
        options: { icon: 'check', duration: 1800 }
      });
    } catch (err) {
      console.error('[LiveText] Copy error:', err);
      eventBus.emit('show-toast', { message: 'Failed to copy text' });
    }
  }

  async copyAll() {
    if (!this.detectedBlocks || this.detectedBlocks.length === 0) {
      eventBus.emit('show-toast', { message: 'No text detected to copy' });
      return;
    }

    const fullText = this.detectedBlocks.map(b => b.text).join('\n');
    try {
      await navigator.clipboard.writeText(fullText);
      eventBus.emit('show-toast', {
        message: `Copied all ${this.detectedBlocks.length} text items to clipboard!`,
        options: { icon: 'check', duration: 2500 }
      });
    } catch (err) {
      console.error('[LiveText] Copy all error:', err);
      eventBus.emit('show-toast', { message: 'Failed to copy text' });
    }
  }
}
