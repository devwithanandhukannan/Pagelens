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

  // --- 1. Page Measurer ---
  function measurePage() {
    const doc = document.documentElement;
    const body = document.body;

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

    const viewportWidth = window.innerWidth || doc.clientWidth;
    const viewportHeight = window.innerHeight || doc.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    return {
      scrollHeight: Math.ceil(scrollHeight),
      scrollWidth: Math.ceil(scrollWidth),
      viewportWidth: Math.ceil(viewportWidth),
      viewportHeight: Math.ceil(viewportHeight),
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

  // --- 5. Scroll Driver (Optimized paint settle) ---
  async function scrollToPosition(targetX, targetY, delayMs = 70) {
    return new Promise((resolve) => {
      window.scrollTo({ left: targetX, top: targetY, behavior: 'instant' });
      requestAnimationFrame(() => {
        setTimeout(() => {
          const actualX = window.scrollX || window.pageXOffset || 0;
          const actualY = window.scrollY || window.pageYOffset || 0;
          resolve({
            actualX,
            actualY,
            reachedTarget: Math.abs(actualY - targetY) < 3,
          });
        }, delayMs);
      });
    });
  }

  // --- 6. HUD Overlay ---
  // To ensure 100% pristine screenshots without any UI toast or progress badge baked
  // into the captured image pixels, no DOM HUD element is injected into the document.
  function showCaptureOverlay(_initialText) {
    hideCaptureOverlay();
  }

  function updateCaptureOverlay(_text) {
    // In-page toast disabled so it never appears in screenshot pixels
  }

  function hideCaptureOverlay() {
    const existing = document.getElementById('pagelens-capture-hud');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    overlayContainer = null;
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
    }
  }

  // --- 8. Message Listener ---
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      (async () => {
        try {
          switch (message.type) {
            case 'PAGELENS_PING_PROBE': {
              sendResponse({ success: true, status: 'pong' });
              break;
            }

            case 'PAGELENS_MEASURE_PAGE': {
              const geom = measurePage();
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

            case 'PAGELENS_RESTORE_PAGE': {
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
