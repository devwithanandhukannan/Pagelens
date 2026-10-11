/**
 * Pagelens — Session Registry & Lock Manager
 * Prevents concurrent captures with state locking stored in chrome.storage.session.
 */

export class SessionRegistry {
  static async getState() {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const res = await chrome.storage.session.get('captureState');
      return res.captureState || 'idle';
    }
    return this._fallbackState || 'idle';
  }

  static async setState(state) {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      await chrome.storage.session.set({ captureState: state });
    } else {
      this._fallbackState = state;
    }
  }

  static async startSession(sessionId, tabId) {
    const currentState = await this.getState();
    if (currentState !== 'idle') {
      return { acquired: false, reason: 'Another capture session is currently active.' };
    }

    await this.setState('starting');
    const sessionData = {
      id: sessionId,
      tabId,
      startTime: Date.now(),
      cancelled: false,
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      await chrome.storage.session.set({ activeSession: sessionData });
    } else {
      this._activeSession = sessionData;
    }

    return { acquired: true, session: sessionData };
  }

  static async cancelSession() {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const res = await chrome.storage.session.get('activeSession');
      if (res.activeSession) {
        res.activeSession.cancelled = true;
        await chrome.storage.session.set({ activeSession: res.activeSession });
      }
    } else if (this._activeSession) {
      this._activeSession.cancelled = true;
    }
    await this.setState('idle');
  }

  static async isCancelled() {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      const res = await chrome.storage.session.get('activeSession');
      return Boolean(res.activeSession?.cancelled);
    }
    return Boolean(this._activeSession?.cancelled);
  }

  static async finishSession() {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      await chrome.storage.session.remove('activeSession');
    } else {
      this._activeSession = null;
    }
    await this.setState('idle');
  }
}
