/**
 * Pagelens — Redaction Scanner Worker
 * Scans text content for sensitive tokens, emails, API keys, and credit cards.
 */

export const PATTERNS = {
  creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  apiKey: /\b(?:sk_[a-zA-Z0-9_]{16,}|live_sec_[a-zA-Z0-9_]{12,}|api_key_[a-zA-Z0-9_]{12,})\b/g,
  jwt: /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g,
};

export function scanSensitiveText(text) {
  const matches = [];

  for (const [category, regex] of Object.entries(PATTERNS)) {
    let match;
    const re = new RegExp(regex.source, 'g');
    while ((match = re.exec(text)) !== null) {
      matches.push({
        category,
        text: match[0],
        index: match.index,
        length: match[0].length,
      });
    }
  }

  return matches;
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = (e) => {
    const { text } = e.data || {};
    const matches = scanSensitiveText(text || '');
    self.postMessage({ matches });
  };
}
