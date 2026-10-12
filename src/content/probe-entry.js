/**
 * Pagelens — Page Probe Entry (Content Script)
 * Executes inside web pages to measure geometry, coordinate scrolling, neutralize sticky elements,
 * prime lazy assets, freeze animations, and render progress overlay.
 */

(() => {
  if (window.__PAGELENS_PROBE_INJECTED__) {
    return;
  }
  window.__PAGELENS_PROBE_INJECTED__ = true;

  const STICKY_ATTR = 'data-pagelens-fixed';
  let modifiedStickyElements = [];
  let freezeStyleElement = null;
  let overlayContainer = null;
  let originalScrollPosition = { x: 0, y: 0 };
  let isGuarded = false;

  let primaryScrollElement = null;
  let originalElementScrollTop = 0;

  // --- 1. Primary Scroll Container Detector (WhatsApp Web, Claude, SPAs) ---
  // --- 1. Primary Scroll Container Detector (WhatsApp Web, Claude, SPAs) ---
  function isWindowScrollable() {
    const doc = document.documentElement;
    const body = document.body;
    const winHeight = window.innerHeight || doc.clientHeight;
    const docScrollHeight = Math.max(
      body ? body.scrollHeight : 0,
      doc ? doc.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      doc ? doc.offsetHeight : 0
    );

    if (docScrollHeight <= winHeight + 30) return false;

    const htmlStyle = window.getComputedStyle(doc);
    const bodyStyle = body ? window.getComputedStyle(body) : null;
    if (htmlStyle.overflowY === 'hidden' || htmlStyle.overflowY === 'clip') return false;
    if (bodyStyle && (bodyStyle.overflowY === 'hidden' || bodyStyle.overflowY === 'clip')) return false;

    // Test actual scrolling capability
    const initialY = window.scrollY || window.pageYOffset || 0;
    if (initialY > 0) return true;

    window.scrollBy(0, 2);
    const newY = window.scrollY || window.pageYOffset || 0;
    if (newY > 0) {
      window.scrollTo(0, initialY);
      return true;
    }

    return false;
  }

  function findPrimaryScrollContainer() {
    // If the window itself can scroll normally, no container override needed
    if (isWindowScrollable()) {
      return null;
    }

    const doc = document.documentElement;
    const winHeight = window.innerHeight || doc.clientHeight;
    const winWidth = window.innerWidth || doc.clientWidth;

    // Window does not scroll or is overflow:hidden (WhatsApp Web, Claude, ChatGPT, etc.)
    const candidates = [];
    const allElements = document.querySelectorAll('div, main, section, article, ul, ol, [role="main"], [role="region"], [role="feed"]');

    for (const el of allElements) {
      if (el.id && el.id.startsWith('pagelens-')) continue;
      if (el.scrollHeight <= el.clientHeight + 40) continue;
      if (el.clientHeight < winHeight * 0.25) continue;
      if (el.clientWidth < winWidth * 0.18) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.bottom <= 0 || rect.top >= winHeight) continue;

      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') {
        continue;
      }

      const visibleWidth = Math.min(rect.right, winWidth) - Math.max(rect.left, 0);
      const visibleHeight = Math.min(rect.bottom, winHeight) - Math.max(rect.top, 0);
      if (visibleWidth <= 0 || visibleHeight <= 0) continue;

      const visibleArea = visibleWidth * visibleHeight;
      const scrollExcess = el.scrollHeight - el.clientHeight;
      const widthRatio = visibleWidth / winWidth;

      let score = visibleArea * Math.log10(scrollExcess + 10);

      // Boost wide reading/chat panes over narrow sidebars (WhatsApp conversation pane is ~70% width)
      if (widthRatio >= 0.45) score *= 2.5;
      if (widthRatio >= 0.6) score *= 1.8;

      const tag = el.tagName.toLowerCase();
      if (tag === 'main' || el.getAttribute('role') === 'main') score *= 2.5;

      // Active element bonus (or child/sibling of active input)
      if (document.activeElement && (el.contains(document.activeElement) || el.parentElement?.contains(document.activeElement))) {
        score *= 2.2;
      }

      // If user had already scrolled this element, strong signal of primary reading surface
      if (el.scrollTop > 0) {
        score *= 2.0;
      }

      // Check common chat/conversation attributes
      const attrStr = ((el.getAttribute('data-testid') || '') + ' ' + (el.className || '') + ' ' + (el.id || '')).toLowerCase();
      if (/chat|conversation|message|history|scroll|feed|stream|transcript/i.test(attrStr)) {
        score *= 1.8;
      }

      candidates.push({
        el,
        score,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        rect
      });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].el;
    }

    return null;
  }

  // --- 2. Page Measurer ---
  function measurePage() {
    const doc = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth || doc.clientWidth;
    const viewportHeight = window.innerHeight || doc.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    primaryScrollElement = findPrimaryScrollContainer();

    if (primaryScrollElement) {
      originalElementScrollTop = primaryScrollElement.scrollTop;

      // Scroll to top of container to start capture from the very beginning
      primaryScrollElement.scrollTop = 0;
      primaryScrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));

      const rect = primaryScrollElement.getBoundingClientRect();
      const topOffset = Math.max(0, Math.round(rect.top));
      const bottomOffset = Math.max(0, Math.round(viewportHeight - rect.bottom));
      const scrollStep = Math.max(200, Math.round(rect.height));
      const scrollHeight = primaryScrollElement.scrollHeight;
      const totalSlices = Math.max(1, Math.ceil(scrollHeight / scrollStep));
      const rectLeft = Math.max(0, Math.round(rect.left));
      const rectWidth = Math.min(viewportWidth, Math.round(rect.width));

      let bgColor = '#111b21';
      try {
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        if (bodyBg && bodyBg !== 'transparent' && bodyBg !== 'rgba(0, 0, 0, 0)') {
          bgColor = bodyBg;
        } else {
          const docBg = window.getComputedStyle(document.documentElement).backgroundColor;
          if (docBg && docBg !== 'transparent' && docBg !== 'rgba(0, 0, 0, 0)') {
            bgColor = docBg;
          }
        }
      } catch (_) {}

      return {
        isElementScroll: true,
        topOffset,
        bottomOffset,
        scrollStep,
        scrollHeight,
        scrollWidth: viewportWidth,
        viewportWidth,
        viewportHeight,
        totalSlices,
        dpr,
        rectLeft,
        rectWidth,
        bgColor,
        title: document.title || 'Untitled Page',
        url: window.location.href,
        scrollY: originalElementScrollTop,
        scrollX: 0,
      };
    }

    const scrollHeight = Math.max(
      body.scrollHeight,
      doc.scrollHeight,
      body.offsetHeight,
      doc.offsetHeight,
      body.clientHeight,
      doc.clientHeight
    );

    const scrollWidth = Math.max(
      body.scrollWidth,
      doc.scrollWidth,
      body.offsetWidth,
      doc.offsetWidth,
      body.clientWidth,
      doc.clientWidth
    );

    return {
      isElementScroll: false,
      topOffset: 0,
      bottomOffset: 0,
      scrollStep: viewportHeight,
      scrollHeight: Math.ceil(scrollHeight),
      scrollWidth: Math.ceil(scrollWidth),
      viewportWidth: Math.ceil(viewportWidth),
      viewportHeight: Math.ceil(viewportHeight),
      totalSlices: Math.ceil(scrollHeight / viewportHeight),
      dpr,
      title: document.title || 'Untitled Page',
      url: window.location.href,
      scrollY: window.scrollY || window.pageYOffset || 0,
      scrollX: window.scrollX || window.pageXOffset || 0,
    };
  }

  // --- 2. Motion Freezer ---
  // Freezes CSS animations and transitions for stable visual slices without touching media playback
  function freezeMotion() {
    if (freezeStyleElement) return;

    freezeStyleElement = document.createElement('style');
    freezeStyleElement.id = 'pagelens-freeze-styles';
    freezeStyleElement.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
      html, body {
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(freezeStyleElement);
  }

  function unfreezeMotion() {
    if (freezeStyleElement && freezeStyleElement.parentNode) {
      freezeStyleElement.parentNode.removeChild(freezeStyleElement);
      freezeStyleElement = null;
    }
  }

  // --- 3. Sticky Neutralizer ---
  function findAndMarkStickyElements() {
    modifiedStickyElements = [];
    const allNodes = document.querySelectorAll('*');

    for (const el of allNodes) {
      if (el.nodeType !== Node.ELEMENT_NODE) continue;
      if (el.id && el.id.startsWith('pagelens-')) continue;

      const computed = window.getComputedStyle(el);
      const pos = computed.position;

      if (pos === 'fixed' || pos === 'sticky') {
        const originalVisibility = el.style.visibility || '';
        const originalOpacity = el.style.opacity || '';

        el.setAttribute(STICKY_ATTR, 'true');
        modifiedStickyElements.push({
          element: el,
          originalVisibility,
          originalOpacity,
        });
      }
    }
    return modifiedStickyElements.length;
  }

  function hideStickyElements() {
    for (const item of modifiedStickyElements) {
      if (item.element && item.element.isConnected) {
        item.element.style.setProperty('visibility', 'hidden', 'important');
      }
    }
  }

  function restoreStickyElements() {
    for (const item of modifiedStickyElements) {
      if (item.element && item.element.isConnected) {
        if (item.originalVisibility) {
          item.element.style.visibility = item.originalVisibility;
        } else {
          item.element.style.removeProperty('visibility');
        }
        if (item.originalOpacity) {
          item.element.style.opacity = item.originalOpacity;
        } else {
          item.element.style.removeProperty('opacity');
        }
        item.element.removeAttribute(STICKY_ATTR);
      }
    }
    modifiedStickyElements = [];
  }

  // --- 4. Lazy-Load Primer ---
  async function primeLazyLoading(scrollHeight, chunkStep = 1400) {
    if (primaryScrollElement) {
      let currentY = 0;
      while (currentY < scrollHeight) {
        primaryScrollElement.scrollTop = currentY;
        primaryScrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
        currentY += chunkStep;
        await new Promise((r) => setTimeout(r, 20));
      }
      primaryScrollElement.scrollTop = scrollHeight;
      primaryScrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      primaryScrollElement.scrollTop = 0;
      primaryScrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      return;
    }

    let currentY = 0;
    while (currentY < scrollHeight) {
      window.scrollTo({ left: 0, top: currentY, behavior: 'instant' });
      currentY += chunkStep;
      await new Promise((r) => setTimeout(r, 16));
    }

    window.scrollTo({ left: 0, top: scrollHeight, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 30));

    const images = Array.from(document.images);
    const pendingDecodes = images
      .filter((img) => !img.complete && img.src)
      .slice(0, 30)
      .map((img) => img.decode().catch(() => {}));

    if (pendingDecodes.length > 0) {
      await Promise.race([
        Promise.all(pendingDecodes),
        new Promise((r) => setTimeout(r, 250))
      ]);
    }

    window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 30));
  }

  // --- 5. Scroll Driver (Optimized paint settle for slow processors & heavy DOMs) ---
  async function scrollToPosition(targetX, targetY, delayMs = 180) {
    return new Promise((resolve) => {
      if (primaryScrollElement) {
        primaryScrollElement.scrollTop = targetY;
        primaryScrollElement.scrollLeft = targetX;
        // Trigger React / virtualized list scroll listeners
        primaryScrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
        primaryScrollElement.dispatchEvent(new UIEvent('scroll', { bubbles: true, cancelable: false, detail: 0 }));
        window.dispatchEvent(new Event('scroll'));
      } else {
        window.scrollTo({ left: targetX, top: targetY, behavior: 'instant' });
      }

      // Double RAF ensures both layout recalculation and paint compositor commit before snapshotting
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const actualX = primaryScrollElement ? primaryScrollElement.scrollLeft : (window.scrollX || window.pageXOffset || 0);
            const actualY = primaryScrollElement ? primaryScrollElement.scrollTop : (window.scrollY || window.pageYOffset || 0);
            resolve({
              actualX,
              actualY,
              reachedTarget: Math.abs(actualY - targetY) < 5,
            });
          }, Math.max(160, delayMs));
        });
      });
    });
  }

  // --- 6. In-Page HUD Disabler (Zero-Artifact Capture Guarantee) ---
  // In-page HUD overlay is disabled from DOM injection to guarantee captured screenshot pixels are 100% pristine.
  // Progress is displayed exclusively in the Pagelens extension popup and browser action badge.
  function removeCaptureOverlay() {
    const hud = document.getElementById('pagelens-capture-hud');
    if (hud && hud.parentNode) {
      hud.parentNode.removeChild(hud);
    }
    const styles = document.getElementById('pagelens-hud-styles');
    if (styles && styles.parentNode) {
      styles.parentNode.removeChild(styles);
    }
  }

  function showCaptureOverlay(_initialText) {
    removeCaptureOverlay();
  }

  function updateCaptureOverlay(_text, _sliceIndex, _totalSlices) {
    // No-op: in-page overlay disabled to prevent baking into screenshot pixels
  }

  function hideCaptureOverlay() {
    removeCaptureOverlay();
  }

  // --- 7. Restore Guard ---
  function initializeRestoreGuard(initialX, initialY) {
    originalScrollPosition = { x: initialX, y: initialY };
    isGuarded = true;
    window.addEventListener('keydown', onKeyDownEscape, { capture: true });
  }

  function onKeyDownEscape(e) {
    if (e.key === 'Escape' && isGuarded) {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'PAGELENS_CANCEL_CAPTURE' }).catch(() => {});
      }
      restorePage();
    }
  }

  function restorePage() {
    if (!isGuarded) return;
    try {
      if (primaryScrollElement) {
        primaryScrollElement.scrollTop = originalElementScrollTop;
        primaryScrollElement.dispatchEvent(new Event('scroll', { bubbles: true }));
      }
      window.scrollTo({
        left: originalScrollPosition.x,
        top: originalScrollPosition.y,
        behavior: 'instant'
      });
      restoreStickyElements();
      unfreezeMotion();
      hideCaptureOverlay();
      window.removeEventListener('keydown', onKeyDownEscape, { capture: true });
    } finally {
      isGuarded = false;
      primaryScrollElement = null;
    }
  }

  // --- 8. Apple Live Text — Precise Per-Line Text & Number Extractor ---
  function extractPageTextBlocks(options = {}) {
    const { visibleOnly = false, dpr = window.devicePixelRatio || 1 } = options;
    const blocks = [];
    try {
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            let el = node.parentElement;
            while (el) {
              if (el.id && el.id.startsWith('pagelens-')) return NodeFilter.FILTER_REJECT;
              if (el.classList && (el.classList.contains('pagelens-overlay') || el.classList.contains('pagelens-hud'))) return NodeFilter.FILTER_REJECT;
              el = el.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const range = document.createRange();
      const seenKeys = new Set();

      function addBlock(rect, rawText) {
        if (!rect || rect.width < 6 || rect.height < 6) return;
        const text = rawText.trim();
        if (text.length < 1) return;
        if (!/[0-9a-zA-Z\u00C0-\u024F\u0900-\u0D7F]/.test(text)) return;

        if (visibleOnly) {
          if (rect.bottom <= 0 || rect.top >= viewH || rect.right <= 0 || rect.left >= viewW) return;
        }

        let x, y;
        if (visibleOnly) {
          x = Math.round(rect.left * dpr);
          y = Math.round(rect.top * dpr);
        } else {
          if (primaryScrollElement) {
            const containerRect = primaryScrollElement.getBoundingClientRect();
            x = Math.round((rect.left - containerRect.left + primaryScrollElement.scrollLeft) * dpr);
            y = Math.round((rect.top - containerRect.top + primaryScrollElement.scrollTop) * dpr);
          } else {
            x = Math.round((rect.left + scrollX) * dpr);
            y = Math.round((rect.top + scrollY) * dpr);
          }
        }
        const width = Math.round(rect.width * dpr);
        const height = Math.round(rect.height * dpr);

        const key = `${Math.round(x / 6)}_${Math.round(y / 6)}_${text.slice(0, 16)}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        blocks.push({
          text: text.slice(0, 600),
          x,
          y,
          width,
          height,
          dpr
        });
      }

      let textNode;
      while ((textNode = walker.nextNode())) {
        if (blocks.length >= 6000) break;

        const text = textNode.nodeValue;
        if (!text || !text.trim()) continue;
        if (!/[0-9a-zA-Z\u00C0-\u024F\u0900-\u0D7F]/.test(text)) continue;

        const parent = textNode.parentElement;
        if (!parent) continue;
        try {
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
        } catch (_) { continue; }

        range.selectNodeContents(textNode);
        const rects = range.getClientRects();
        if (!rects || rects.length === 0) continue;

        if (rects.length === 1) {
          // Single-line text node: entire text matches this single rect
          addBlock(rects[0], text);
        } else {
          // Multi-line text node: segment words by visual line using Range
          const tokens = text.match(/\S+|\s+/g) || [text];
          let lineTokens = [];
          let lineBox = null;
          let prevTop = null;
          let offset = 0;

          for (const token of tokens) {
            const start = offset;
            const end = offset + token.length;
            offset = end;

            if (!/\S/.test(token)) {
              lineTokens.push(token);
              continue;
            }

            try {
              range.setStart(textNode, start);
              range.setEnd(textNode, end);
              const r = range.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                if (prevTop === null || Math.abs(r.top - prevTop) > Math.min(8, r.height * 0.45)) {
                  // Line break detected
                  if (lineTokens.length > 0 && lineBox) {
                    addBlock(lineBox, lineTokens.join(''));
                  }
                  lineTokens = [token];
                  prevTop = r.top;
                  lineBox = {
                    left: r.left,
                    top: r.top,
                    right: r.right,
                    bottom: r.bottom,
                    width: r.width,
                    height: r.height
                  };
                } else {
                  lineTokens.push(token);
                  lineBox.left = Math.min(lineBox.left, r.left);
                  lineBox.right = Math.max(lineBox.right, r.right);
                  lineBox.top = Math.min(lineBox.top, r.top);
                  lineBox.bottom = Math.max(lineBox.bottom, r.bottom);
                  lineBox.width = lineBox.right - lineBox.left;
                  lineBox.height = lineBox.bottom - lineBox.top;
                }
              } else {
                lineTokens.push(token);
              }
            } catch (_) {
              lineTokens.push(token);
            }
          }

          if (lineTokens.length > 0 && lineBox) {
            addBlock(lineBox, lineTokens.join(''));
          }
        }
      }

      // Sort by y, then x
      blocks.sort((a, b) => a.y - b.y || a.x - b.x);

      // Merge inline fragments on the exact same line
      const merged = [];
      let i = 0;
      while (i < blocks.length) {
        let cur = { ...blocks[i] };
        let j = i + 1;
        while (j < blocks.length) {
          const next = blocks[j];
          const yClose = Math.abs(next.y - cur.y) < Math.max(5, cur.height * 0.35);
          const gap = next.x - (cur.x + cur.width);
          // If on same line and overlapping or within 10px gap, merge them
          if (yClose && gap >= -8 * dpr && gap < 12 * dpr) {
            cur.text = cur.text + (gap > 2 * dpr ? ' ' : '') + next.text;
            const newRight = Math.max(cur.x + cur.width, next.x + next.width);
            cur.width = newRight - cur.x;
            cur.height = Math.max(cur.height, next.height);
            j++;
          } else {
            break;
          }
        }
        merged.push(cur);
        i = j;
      }

      return merged;
    } catch (err) {
      console.warn('[Pagelens] extractPageTextBlocks error:', err);
    }
    return blocks;
  }

  // --- 9. Message Listener ---
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      (async () => {
        try {
          switch (message.type) {
            case 'PAGELENS_PING_PROBE': {
              sendResponse({ success: true, status: 'pong' });
              break;
            }

            case 'PAGELENS_EXTRACT_TEXT_BLOCKS': {
              const { visibleOnly, dpr } = message.payload || {};
              const blocks = extractPageTextBlocks({ visibleOnly, dpr: dpr || window.devicePixelRatio || 1 });
              sendResponse({ success: true, textBlocks: blocks });
              break;
            }

            case 'PAGELENS_MEASURE_PAGE': {
              const geom = measurePage();
              geom.textBlocks = extractPageTextBlocks({ visibleOnly: false, dpr: geom.dpr });
              initializeRestoreGuard(geom.scrollX, geom.scrollY);
              freezeMotion();
              findAndMarkStickyElements();
              showCaptureOverlay('Initializing Pagelens capture...');
              sendResponse({ success: true, geometry: geom });
              break;
            }

            case 'PAGELENS_PRIME_LAZY_LOAD': {
              const { scrollHeight } = message.payload || {};
              updateCaptureOverlay('Priming lazy images...');
              await primeLazyLoading(scrollHeight || document.documentElement.scrollHeight);
              sendResponse({ success: true });
              break;
            }

            case 'PAGELENS_HIDE_STICKY': {
              hideStickyElements();
              sendResponse({ success: true });
              break;
            }

            case 'PAGELENS_SCROLL_TO': {
              const { x, y, delayMs, sliceIndex, totalSlices } = message.payload || {};
              if (sliceIndex !== undefined && totalSlices !== undefined) {
                updateCaptureOverlay(`Capturing slice ${sliceIndex + 1} of ${totalSlices}...`);
              }
              const res = await scrollToPosition(x, y, delayMs || 140);
              sendResponse({ success: true, ...res });
              break;
            }

            case 'PAGELENS_PROGRESS_UPDATE': {
              const { text } = message.payload || {};
              updateCaptureOverlay(text);
              sendResponse({ success: true });
              break;
            }

            case 'PAGELENS_HIDE_HUD': {
              hideCaptureOverlay();
              sendResponse({ success: true });
              break;
            }

            case 'PAGELENS_SHOW_HUD': {
              const { text, sliceIndex, totalSlices } = message.payload || {};
              showCaptureOverlay(text);
              if (sliceIndex !== undefined && totalSlices !== undefined) {
                updateCaptureOverlay(text, sliceIndex, totalSlices);
              }
              sendResponse({ success: true });
              break;
            }

            case 'PAGELENS_RESTORE_PAGE': {
              removeCaptureOverlay();
              restorePage();
              sendResponse({ success: true });
              break;
            }

            default:
              sendResponse({ success: false, error: 'Unknown message type' });
          }
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true; // Keep message channel open for async response
    });
  }

  // Expose probe API on window for testing and web simulator
  window.__PAGELENS_PROBE__ = {
    measurePage,
    freezeMotion,
    unfreezeMotion,
    findAndMarkStickyElements,
    hideStickyElements,
    restoreStickyElements,
    primeLazyLoading,
    scrollToPosition,
    showCaptureOverlay,
    updateCaptureOverlay,
    hideCaptureOverlay,
    initializeRestoreGuard,
    restorePage,
  };
})();
