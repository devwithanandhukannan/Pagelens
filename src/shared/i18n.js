/**
 * Pagelens — Internationalization / Strings dictionary
 */

export const STRINGS = {
  app_name: 'Pagelens',
  tagline: 'Capture everything. Share only what you mean to.',
  capture_full: 'Capture Full Page',
  capture_visible: 'Capture Visible Area',
  capturing: 'Capturing...',
  scrolling_slice: 'Capturing slice {current} of {total}',
  stitching: 'Stitching slices...',
  ready: 'Capture complete',
  studio_title: 'Pagelens Studio',
  undo: 'Undo',
  redo: 'Redo',
  zoom_in: 'Zoom In',
  zoom_out: 'Zoom Out',
  fit_screen: 'Fit to Screen',
  export: 'Export',
  copy_clipboard: 'Copy to Clipboard',
  download: 'Download Image',
  redact_warning: 'Redactions are permanent and irreversible upon export',
  copied_toast: 'Image copied to clipboard',
  saved_toast: 'Screenshot saved to downloads',
  restore_capture: 'Restore last capture',
  tools: {
    select: 'Select & Move (V)',
    crop: 'Crop Viewport (C)',
    shape: 'Shapes & Arrows (U)',
    pen: 'Freehand Pen (P)',
    highlighter: 'Highlighter (H)',
    text: 'Text Label (T)',
    blur: 'Blur & Pixelate (B)',
    redact: 'Solid Redaction (R)',
    stamp: 'Step Stamp (S)',
  }
};

export function t(key, params = {}) {
  const parts = key.split('.');
  let val = STRINGS;
  for (const part of parts) {
    if (val && val[part]) {
      val = val[part];
    } else {
      return key;
    }
  }
  if (typeof val === 'string') {
    return val.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
  }
  return val;
}
