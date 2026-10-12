/**
 * Pagelens — Download Manager
 * Handles filename formatting, sanitization, and chrome.downloads execution.
 */

export class DownloadManager {
  static sanitizeFilename(name) {
    return name
      .replace(/\.(png|jpg|jpeg|webp|pdf)$/i, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  static generateFilename(title = 'Page', format = 'png') {
    const cleanTitle = this.sanitizeFilename(title);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');

    return `Pagelens_${cleanTitle}_${dateStr}_${timeStr}.${format}`;
  }

  static async downloadDataUrl(dataUrl, filename, promptUser = false, subfolder = null) {
    let folder = subfolder;
    if (folder === null) {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
          const res = await chrome.storage.sync.get('pagelens_settings');
          folder = res.pagelens_settings?.defaultSaveLocation || 'Desktop';
        } else if (typeof localStorage !== 'undefined') {
          const local = localStorage.getItem('pagelens_settings');
          if (local) {
            folder = JSON.parse(local).defaultSaveLocation || 'Desktop';
          }
        }
      } catch (e) {
        folder = 'Desktop';
      }
    }
    if (!folder) folder = 'Desktop';

    let targetFilename;
    if (folder === 'Downloads' || folder === 'root' || folder === '.') {
      targetFilename = filename;
    } else {
      const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
      targetFilename = `${cleanFolder}/${filename}`;
    }

    if (typeof chrome !== 'undefined' && chrome.downloads?.download) {
      return new Promise((resolve, reject) => {
        chrome.downloads.download(
          {
            url: dataUrl,
            filename: targetFilename,
            saveAs: promptUser,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              // Graceful fallback to direct root filename if subfolder not permitted
              chrome.downloads.download(
                { url: dataUrl, filename, saveAs: promptUser },
                (fallbackId) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    resolve(fallbackId);
                  }
                }
              );
            } else {
              resolve(downloadId);
            }
          }
        );
      });
    }

    // Web fallback
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
}
