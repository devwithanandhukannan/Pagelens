# Pagelens — Chrome Web Store Listing & Store Assets Metadata

**Tagline:** *Capture everything. Share only what you mean to.*  
**Primary Category:** Productivity / Photos & Graphics  
**Version:** 1.0.0  
**Last Updated:** October 2026  

---

## 1. Store Listing Summary

### Title
Pagelens — Zero-Border Full Page Capture & Privacy Studio

### Summary (132 characters max)
Full-page scrolling screenshots with zero network traffic. Redact sensitive text, annotate, and export Apple-grade Sonoma visuals.

### Detailed Description
Pagelens is an Apple-grade, macOS Sonoma-inspired screenshot and annotation studio that operates strictly offline with zero remote telemetry.

**Why Pagelens?**
- **100% Offline & Zero Network:** No accounts, no servers, no analytics, no remote code. Your captures never leave your browser memory.
- **One-Click Full Page Scrolling Capture:** Smart stitching engine that neutralizes sticky navbars, pre-scrolls lazy loaded images, freezes jarring animations, and calculates exact device-pixel-ratio offsets.
- **Irreversible Solid-Fill Redaction:** Traditional blurs can be inverted by machine learning models. Pagelens features genuine solid-fill cryptographic-grade redaction where obscured pixels are permanently discarded upon export.
- **Apple Sonoma "Zero-Border" Studio:** Layered tonal surfaces (Obsidian Dark & Porcelain Light), fluid spring physics, split-pane workspace, floating glassmorphism HUD chips, and contextual inspectors.
- **Annotation Suite:** Freehand pen with spline curve smoothing, translucent highlighter, shapes, directional arrows, numbered bug report stamps (1, 2, 3...), and rich text.
- **Multi-Format Export:** Export pristine PNG, high-efficiency WebP/JPG, or auto-split multi-page PDFs (A4 / US Letter / Single Canvas) with automatic EXIF/metadata stripping.

---

## 2. Permissions Justification

| Permission | Technical Requirement | Plain-English Reason for Web Store Review Team |
|---|---|---|
| `activeTab` | Temporary interaction with the user's selected tab | Required to measure document dimensions, scroll down page slices, and capture viewport images when the user explicitly triggers capture. |
| `scripting` | `chrome.scripting.executeScript` injection | Required to inject the lightweight Page Probe content script that freezes animations and hides duplicate sticky headers during capture. |
| `storage` | `chrome.storage.local` and `chrome.storage.session` | Required to persist user UI preferences (Obsidian dark vs Porcelain light, default export format) and coordinate lock states between captures. |
| `unlimitedStorage` | Client-side quota elevation | Required to store high-resolution, multi-slice full-page screenshot canvas blobs locally in IndexedDB without hitting the default 5MB storage quota (`kQuotaBytes`). All data remains 100% local on user device. |
| `downloads` | `chrome.downloads.download` | Required to save exported screenshots and generated PDF documents directly to the user's default download folder. |
| `tabs` | `chrome.tabs.query` and `chrome.tabs.create` | Required to open the full-screen Studio editor page in a fresh tab when capture completes and inspect capturable tab URLs. |

---

## 3. Privacy & Data Use Disclosure

1. **Remote Data Collection:** None. Zero bytes transmitted over any network socket.
2. **Analytics / Telemetry:** None.
3. **Local Storage Usage:**
   - Active captured image bitmaps stored temporarily in browser memory / IndexedDB blob store.
   - User settings (theme, format, quality) saved locally in `chrome.storage.local`.
4. **Third-party Libraries:** Zero external CDN scripts or remote trackers. All canvas rendering and PDF engines are bundled locally.

---

## 4. Version History

- **1.0.0** (Initial Release)
  - Full-page capture engine with sticky element neutralizer and lazy image primer.
  - Zero-Border macOS Sonoma studio interface with Obsidian and Porcelain themes.
  - Non-destructive annotation layers: shapes, arrows, pen, text, blur, redact, and step stamps.
  - Export to PNG, JPG, and paginated PDF.
