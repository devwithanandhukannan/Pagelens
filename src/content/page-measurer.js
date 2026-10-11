/**
 * Pagelens — Page Measurer
 * Accurately determines true document scroll dimensions, DPR, and viewport size.
 */

export function measurePage() {
  const doc = document.documentElement;
  const body = document.body;

  // True document scroll height across browser variations
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
