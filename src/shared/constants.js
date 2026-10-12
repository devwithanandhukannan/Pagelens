/**
 * Pagelens — Shared Constants
 */

export const CAPTURE_LIMITS = {
  MAX_TOTAL_HEIGHT: 32000, // Maximum pixels before offering tiled downscale
  MAX_SLICES: 120,          // Safety ceiling on slice loop
  MIN_SLICE_DELAY_MS: 560,  // Chrome quota is max 2 calls/sec (500ms min); 560ms gives safe buffer
  MAX_SLICE_DELAY_MS: 1500, // Adaptive delay upper bound
  DEFAULT_SCROLL_DELAY_MS: 220,
  LAZY_LOAD_PRESCROLL_CHUNK: 800,
  SETTLE_NETWORK_TIMEOUT_MS: 1200,
  STICKY_ATTR: 'data-pagelens-fixed',
};

export const STORAGE_KEYS = {
  ACTIVE_SESSION: 'pagelens_active_session',
  SETTINGS: 'pagelens_settings',
  LAST_CAPTURE_ID: 'pagelens_last_capture_id',
  RESTORE_BACKUP: 'pagelens_restore_backup',
};

export const DEFAULT_SETTINGS = {
  theme: 'system', // 'system' | 'obsidian' | 'porcelain'
  exportFormat: 'png', // 'png' | 'jpeg' | 'pdf'
  jpegQuality: 0.92,
  autoOpenStudio: true,
  stripMetadata: true,
  saveHistory: true, // Retain last 10 screenshots by default
  defaultSaveLocation: 'Desktop', // Default location: Desktop
  downloadDirectory: 'Desktop',
  filenameTemplate: 'Pagelens_{page_title}_{date}_{time}',
  pdfPageSize: 'a4', // 'a4' | 'letter' | 'continuous'
  showShortcutsHint: true,
};

export const EDITOR_CONSTANTS = {
  MAX_UNDO_DEPTH: 100,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 4.0,
  ZOOM_STEP: 0.15,
  HANDLE_SIZE: 10,
  AUTOSAVE_DEBOUNCE_MS: 600,
  CLIPBOARD_MAX_BYTES: 45 * 1024 * 1024,
};

export const THEME_COLORS = {
  obsidian: {
    appCanvas: '#0A0B0E',
    primarySurface: '#121317',
    elevatedSheet: '#17181D',
    nestedSecondary: '#1F2026',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
    electricViolet: '#6D63E6',
    emeraldMint: '#10B981',
    crimsonRed: '#EF4444',
  },
  porcelain: {
    appCanvas: '#F1F4F8',
    primarySurface: '#FFFFFF',
    elevatedSheet: '#FFFFFF',
    nestedSecondary: '#EFF2F7',
    textPrimary: '#0F172A',
    textMuted: '#64748B',
    electricViolet: '#6D63E6',
    emeraldMint: '#10B981',
    crimsonRed: '#EF4444',
  }
};
