/**
 * Pagelens — Page Measurer
 * Accurately determines true document scroll dimensions, DPR, and viewport size.
 * Automatically identifies primary scroll containers in Single Page Apps (WhatsApp Web, Claude, SPAs).
 */

export function isWindowScrollable() {
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

export function findPrimaryScrollContainer() {
  if (isWindowScrollable()) return null;

  const doc = document.documentElement;
  const winHeight = window.innerHeight || doc.clientHeight;
  const winWidth = window.innerWidth || doc.clientWidth;
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
    if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') continue;

    const visibleWidth = Math.min(rect.right, winWidth) - Math.max(rect.left, 0);
    const visibleHeight = Math.min(rect.bottom, winHeight) - Math.max(rect.top, 0);
    if (visibleWidth <= 0 || visibleHeight <= 0) continue;

    const visibleArea = visibleWidth * visibleHeight;
    const scrollExcess = el.scrollHeight - el.clientHeight;
    const widthRatio = visibleWidth / winWidth;

    let score = visibleArea * Math.log10(scrollExcess + 10);
    if (widthRatio >= 0.45) score *= 2.5;
    if (widthRatio >= 0.6) score *= 1.8;
    if (el.tagName.toLowerCase() === 'main' || el.getAttribute('role') === 'main') score *= 2.5;
    if (document.activeElement && (el.contains(document.activeElement) || el.parentElement?.contains(document.activeElement))) score *= 2.2;
    if (el.scrollTop > 0) score *= 2.0;

    candidates.push({ el, score });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].el;
  }
  return null;
}

export function measurePage() {
  const doc = document.documentElement;
  const body = document.body;
  const viewportWidth = window.innerWidth || doc.clientWidth;
  const viewportHeight = window.innerHeight || doc.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  const primaryScrollElement = findPrimaryScrollContainer();

  if (primaryScrollElement) {
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
      scrollY: primaryScrollElement.scrollTop,
      scrollX: 0,
    };
  }

  const scrollHeight = Math.max(
    body ? body.scrollHeight : 0,
    doc.scrollHeight,
    body ? body.offsetHeight : 0,
    doc.offsetHeight,
    body ? body.clientHeight : 0,
    doc.clientHeight
  );

  const scrollWidth = Math.max(
    body ? body.scrollWidth : 0,
    doc.scrollWidth,
    body ? body.offsetWidth : 0,
    doc.offsetWidth,
    body ? body.clientWidth : 0,
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
    totalSlices: Math.max(1, Math.ceil(scrollHeight / viewportHeight)),
    dpr,
    title: document.title || 'Untitled Page',
    url: window.location.href,
    scrollY: window.scrollY || window.pageYOffset || 0,
    scrollX: window.scrollX || window.pageXOffset || 0,
  };
}
