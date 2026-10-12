/**
 * Pagelens — Directory Picker Service
 * Manages persistent directory handle access via the File System Access API
 * and IndexedDB storage.
 */

const DB_NAME = 'PagelensDirectoryStore';
const STORE_NAME = 'dir_handles';
const KEY_NAME = 'defaultSaveHandle';

export class DirectoryPickerService {
  static isSupported() {
    return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
  }

  static async openDB() {
    return new Promise((resolve, reject) => {
      const idb = typeof indexedDB !== 'undefined' ? indexedDB : (typeof self !== 'undefined' ? self.indexedDB : null);
      if (!idb) return reject(new Error('IndexedDB not supported'));
      const req = idb.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async storeHandle(handle) {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(handle, KEY_NAME);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[DirectoryPicker] Failed to store handle:', err);
      return false;
    }
  }

  static async getStoredHandle() {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(KEY_NAME);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      return null;
    }
  }

  static async clearStoredHandle() {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(KEY_NAME);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (err) {
      return false;
    }
  }

  static async pickDirectory() {
    if (!this.isSupported()) {
      throw new Error('Directory picker is not supported in this browser.');
    }
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'desktop',
    });
    await this.storeHandle(handle);
    return handle;
  }

  static async verifyPermission(handle, readWrite = true) {
    if (!handle) return false;
    const opts = { mode: readWrite ? 'readwrite' : 'read' };
    try {
      if (typeof handle.queryPermission === 'function') {
        const current = await handle.queryPermission(opts);
        if (current === 'granted') return true;
      }
      if (typeof handle.requestPermission === 'function') {
        const requested = await handle.requestPermission(opts);
        return requested === 'granted';
      }
    } catch (e) {
      console.warn('[DirectoryPicker] Permission check warning:', e);
    }
    return true;
  }

  static async saveBlobToDirectory(blob, filename) {
    const handle = await this.getStoredHandle();
    if (!handle) return null;

    const hasPerm = await this.verifyPermission(handle, true);
    if (!hasPerm) {
      throw new Error('Permission denied to save in selected folder.');
    }

    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { success: true, folderName: handle.name, filename };
  }
}
