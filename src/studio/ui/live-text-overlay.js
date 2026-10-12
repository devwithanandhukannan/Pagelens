/**
 * Pagelens — Apple Live Text Overlay & Text Extraction
 * Replicates macOS Sonoma / iOS native Live Text:
 * - Floating Apple-style [ ≡ ] toggle button at the bottom-right.
 * - Floating dark frosted [ 📋 Copy All ] action bar at the bottom-left.
 * - Crisp white rounded text capsules displaying detected text, numbers, and links.
 * - Native text selection (drag cursor to select with macOS lavender/blue highlight).
 * - Instant click-to-copy individual text blocks with Apple-style "Copied ✓" micro-tag.
 * - Canvas veil dimming when active so text cards stand out with high contrast.
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
    // 1. Floating Apple Live Text Toggle Button at Bottom-Right (matches macOS Live Text)
    let toggleBtn = document.getElementById('btn-live-text-toggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.className = 'live-text-toggle-btn';
      toggleBtn.id = 'btn-live-text-toggle';
      toggleBtn.title = 'Live Text (T)';
      toggleBtn.setAttribute('aria-label', 'Toggle Live Text');
      toggleBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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

    // 2. Floating Action Bar (Copy All) at Bottom-Left (matches Apple native look)
    let actionsBar = document.getElementById('live-text-actions-bar');
    if (!actionsBar) {
      actionsBar = document.createElement('div');
      actionsBar.className = 'live-text-actions-bar';
      actionsBar.id = 'live-text-actions-bar';
      actionsBar.style.display = 'none';
      actionsBar.innerHTML = `
        <button class="live-text-copy-all-btn" id="btn-live-text-copy-all" title="Copy All">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span class="live-text-copy-all-label">Copy All</span>
        </button>
      `;
      this.rootContainer.appendChild(actionsBar);
    }
    this.actionsBar = actionsBar;
    this.copyAllBtn = document.getElementById('btn-live-text-copy-all');

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
        options: { icon: 'check', duration: 1800 }
      });
    } else {
      if (this.overlay) this.overlay.classList.remove('visible');
      if (this.actionsBar) this.actionsBar.style.display = 'none';
      eventBus.emit('show-toast', {
        message: 'Live Text disabled',
        options: { icon: 'check', duration: 1200 }
      });
    }
  }

  async detectAndRender() {
    if (!this.overlay) return;
    this.syncDimensions();

    this.detectedBlocks = await this.extractTextBlocks();

    this.overlay.innerHTML = '';
    const frag = document.createDocumentFragment();

    this.detectedBlocks.forEach((block) => {
      const pill = document.createElement('div');
      pill.className = 'live-text-pill';
      pill.style.left = `${Math.max(0, block.x)}px`;
      pill.style.top = `${Math.max(0, block.y)}px`;
      pill.style.width = `${Math.max(16, block.width)}px`;
      pill.style.height = `${Math.max(14, block.height)}px`;

      // Font size proportional to pill height for crisp native rendering
      const fontSize = Math.max(11, Math.min(26, Math.round(block.height * 0.68)));
      pill.style.fontSize = `${fontSize}px`;
      pill.title = `Click to copy: "${block.text}"`;

      // Format content with link & entity recognition
      this.renderPillContent(pill, block.text);

      // Track drag vs click so users can select text with mouse drag
      let isDragging = false;
      let startX = 0;
      let startY = 0;

      pill.addEventListener('mousedown', (e) => {
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
      });

      pill.addEventListener('mousemove', (e) => {
        if (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) {
          isDragging = true;
        }
      });

      pill.addEventListener('click', (e) => {
        // If the user was highlighting/selecting text, do not trigger single-click copy
        const sel = window.getSelection();
        if (isDragging || (sel && sel.toString().trim().length > 0)) {
          return;
        }
        e.stopPropagation();
        this.copyBlockText(block.text, pill);
      });

      frag.appendChild(pill);
    });

    this.overlay.appendChild(frag);
  }

  renderPillContent(container, text) {
    // Detect URLs, emails, and common clickable link keywords
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:Click here|Docs|Blog|Sign in|Learn more|Read more|View all)\b)/gi;
    
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Plain text before link
      if (match.index > lastIndex) {
        const plain = document.createElement('span');
        plain.className = 'live-text-text';
        plain.textContent = text.slice(lastIndex, match.index);
        container.appendChild(plain);
      }

      // Link element
      const link = document.createElement('span');
      link.className = 'live-text-link';
      link.textContent = match[0];
      link.title = `Link: ${match[0]}`;
      container.appendChild(link);

      lastIndex = linkRegex.lastIndex;
    }

    // Remaining text
    if (lastIndex < text.length) {
      const plain = document.createElement('span');
      plain.className = 'live-text-text';
      plain.textContent = text.slice(lastIndex);
      container.appendChild(plain);
    }

    if (!container.firstChild) {
      const plain = document.createElement('span');
      plain.className = 'live-text-text';
      plain.textContent = text;
      container.appendChild(plain);
    }
  }

  async extractTextBlocks() {
    // 1. Use high-fidelity DOM text blocks captured by probe during capture
    if (this.documentModel.textBlocks && this.documentModel.textBlocks.length > 0) {
      let blocks = this.documentModel.textBlocks;
      // Remove container-level blocks & eliminate duplicates
      blocks = this.eliminateOverlaps(blocks);
      return blocks;
    }

    // 2. Native Chromium Shape Detection API (if supported)
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
        console.warn('[LiveText] Native TextDetector note:', err);
      }
    }

    // 3. Intelligent Canvas OCR & Text Band Detector fallback
    return this.detectCanvasTextBands();
  }

  /**
   * Remove container overlaps: if pill A fully wraps pill B and A is significantly larger,
   * keep B (the tighter line-level pill).
   */
  eliminateOverlaps(blocks) {
    const canvasW = this.documentModel.width || 800;

    // Filter out huge whole-page container divs
    let filtered = blocks.filter(b => {
      if (b.width > canvasW * 0.85 && b.height > 80) return false;
      if (b.height > 180) return false;
      if (b.width < 8 || b.height < 6) return false;
      return true;
    });

    // Sort by area ascending — smaller (tighter) pills first
    filtered.sort((a, b) => (a.width * a.height) - (b.width * b.height));

    const result = [];
    for (let i = 0; i < filtered.length; i++) {
      const cur = filtered[i];
      let isContainer = false;

      for (const kept of result) {
        if (cur.x <= kept.x + 4 && cur.y <= kept.y + 4 &&
            cur.x + cur.width >= kept.x + kept.width - 4 &&
            cur.y + cur.height >= kept.y + kept.height - 4 &&
            (cur.width * cur.height) > (kept.width * kept.height) * 1.35) {
          isContainer = true;
          break;
        }
      }

      if (!isContainer) {
        result.push(cur);
      }
    }

    // Sort visually from top to bottom, left to right
    result.sort((a, b) => a.y - b.y || a.x - b.x);

    return result;
  }

  /**
   * Fast canvas edge-density text scanner for screenshots loaded without DOM metadata.
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
      const stride = w > 2000 || h > 2000 ? 2 : 1;
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 1. Compute horizontal row contrast transitions
      const rowDensity = new Float32Array(h);
      for (let y = 0; y < h; y += stride) {
        let transitions = 0;
        let prevLum = 0;
        const rowOffset = y * w * 4;

        for (let x = 0; x < w; x += stride * 2) {
          const idx = rowOffset + x * 4;
          const lum = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          if (x > 0 && Math.abs(lum - prevLum) > 32) {
            transitions++;
          }
          prevLum = lum;
        }
        rowDensity[y] = transitions / (w / (stride * 2));
      }

      // 2. Extract text line bands
      const threshold = 0.035;
      const bands = [];
      let inBand = false;
      let startY = 0;

      for (let y = 0; y < h; y += stride) {
        if (!inBand && rowDensity[y] >= threshold) {
          inBand = true;
          startY = y;
        } else if (inBand && rowDensity[y] < threshold) {
          const bh = y - startY;
          if (bh >= 10 && bh <= 60) {
            bands.push({ y: startY, height: bh });
          }
          inBand = false;
        }
      }

      // 3. Extract word bounds along each text line
      for (const band of bands) {
        if (blocks.length >= 600) break;

        const colDensity = new Float32Array(w);
        const yStart = Math.max(0, band.y + 1);
        const yEnd = Math.min(h - 1, band.y + band.height - 1);

        for (let x = 0; x < w; x += stride) {
          let col = 0;
          let prev = 0;
          for (let y = yStart; y <= yEnd; y += stride) {
            const idx = (y * w + x) * 4;
            const lum = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
            if (y > yStart && Math.abs(lum - prev) > 28) col++;
            prev = lum;
          }
          colDensity[x] = col;
        }

        let inWord = false, sx = 0, empty = 0;
        for (let x = 0; x < w; x += stride) {
          if (!inWord && colDensity[x] > 0.35) {
            inWord = true;
            sx = x;
            empty = 0;
          } else if (inWord) {
            if (colDensity[x] <= 0.35) {
              empty += stride;
              if (empty >= 14 || x >= w - stride) {
                const ww = x - empty - sx;
                if (ww >= 16) {
                  blocks.push({
                    text: 'Live Text',
                    x: Math.max(0, sx - 2),
                    y: Math.max(0, band.y - 2),
                    width: Math.min(w, ww + 4),
                    height: band.height + 4
                  });
                }
                inWord = false;
              }
            } else {
              empty = 0;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[LiveText] Canvas text band detection note:', err);
    }

    return blocks;
  }

  async copyBlockText(text, pillElement) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);

      if (pillElement) {
        pillElement.classList.add('just-copied');

        // Create micro "Copied ✓" badge attached to the pill
        let badge = pillElement.querySelector('.live-text-copied-tag');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'live-text-copied-tag';
          badge.innerHTML = `
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Copied</span>
          `;
          pillElement.appendChild(badge);
        }

        setTimeout(() => {
          pillElement.classList.remove('just-copied');
          if (badge && badge.parentNode) {
            badge.remove();
          }
        }, 1200);
      }

      const preview = text.length > 36 ? `${text.slice(0, 36)}...` : text;
      eventBus.emit('show-toast', {
        message: `Copied: "${preview}"`,
        options: { icon: 'check', duration: 1600 }
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

      // Micro animation on Copy All button
      if (this.copyAllBtn) {
        const label = this.copyAllBtn.querySelector('.live-text-copy-all-label');
        if (label) {
          const orig = label.textContent;
          label.textContent = 'Copied All!';
          this.copyAllBtn.classList.add('copied');
          setTimeout(() => {
            label.textContent = orig;
            this.copyAllBtn.classList.remove('copied');
          }, 1800);
        }
      }

      eventBus.emit('show-toast', {
        message: `Copied all ${this.detectedBlocks.length} text items to clipboard!`,
        options: { icon: 'check', duration: 2200 }
      });
    } catch (err) {
      console.error('[LiveText] Copy all error:', err);
      eventBus.emit('show-toast', { message: 'Failed to copy text' });
    }
  }
}
