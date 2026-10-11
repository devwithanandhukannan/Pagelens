/**
 * Pagelens — Sticky Neutralizer
 * Detects fixed & sticky elements, suppresses them after slice 1, and restores them when done.
 */

const STICKY_ATTR = 'data-pagelens-fixed';
let modifiedElements = [];

export function findAndMarkStickyElements() {
  modifiedElements = [];
  const allNodes = document.querySelectorAll('*');

  for (const el of allNodes) {
    if (el.nodeType !== Node.ELEMENT_NODE) continue;
    // Skip Pagelens overlay elements
    if (el.id && el.id.startsWith('pagelens-')) continue;

    const computed = window.getComputedStyle(el);
    const pos = computed.position;

    if (pos === 'fixed' || pos === 'sticky') {
      const originalVisibility = el.style.visibility || '';
      const originalOpacity = el.style.opacity || '';

      el.setAttribute(STICKY_ATTR, 'true');
      modifiedElements.push({
        element: el,
        originalVisibility,
        originalOpacity,
      });
    }
  }

  return modifiedElements.length;
}

export function hideStickyElements() {
  for (const item of modifiedElements) {
    if (item.element && item.element.isConnected) {
      item.element.style.setProperty('visibility', 'hidden', 'important');
    }
  }
}

export function restoreStickyElements() {
  for (const item of modifiedElements) {
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
  modifiedElements = [];
}
