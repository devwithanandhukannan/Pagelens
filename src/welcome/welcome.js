/**
 * Pagelens — Welcome & Onboarding Page Controller
 * Handles particle animations, interactive pin simulator, platform shortcuts, and studio launcher.
 */

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initPlatformShortcuts();
  initPinSimulator();
  initActionButtons();
});

/**
 * Generates gentle floating confetti, candy, star, and emoji particles
 * across the background matching the onboarding celebration theme
 */
function initParticles() {
  const container = document.getElementById('particles-container');
  if (!container) return;

  const emojis = ['🎉', '⭐', '🍬', '✨', '📸', '🚀', '🍭', '💫', '🌟', '🎨'];
  const particleCount = 28;

  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const left = Math.random() * 96; // 0% to 96%
    const delay = Math.random() * 14; // staggered start
    const duration = 12 + Math.random() * 10; // 12s - 22s
    const size = 18 + Math.random() * 18; // 18px - 36px

    el.style.left = `${left}vw`;
    el.style.animationDelay = `-${delay}s`;
    el.style.animationDuration = `${duration}s`;
    el.style.fontSize = `${size}px`;

    container.appendChild(el);
  }
}

/**
 * Detects user OS (Mac vs Windows/Linux) to adjust keyboard shortcut badges
 */
function initPlatformShortcuts() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? 'Cmd' : 'Alt';

  const fullDisplay = document.getElementById('shortcut-full-display');
  const visDisplay = document.getElementById('shortcut-vis-display');

  if (fullDisplay) {
    fullDisplay.innerHTML = `<kbd class="key-cap">${modKey}</kbd> + <kbd class="key-cap">Shift</kbd> + <kbd class="key-cap">S</kbd>`;
  }
  if (visDisplay) {
    visDisplay.innerHTML = `<kbd class="key-cap">${modKey}</kbd> + <kbd class="key-cap">Shift</kbd> + <kbd class="key-cap">V</kbd>`;
  }
}

/**
 * Interactive Pin Simulator
 * Lets the user click the pin icon in the welcome card to simulate pinning the extension
 */
function initPinSimulator() {
  const pinBtn = document.getElementById('pin-sim-toggle');
  const pinIcon = document.getElementById('pin-sim-icon');
  const pinStatus = document.getElementById('pin-sim-status');

  if (!pinBtn) return;

  let isPinned = false;

  pinBtn.addEventListener('click', () => {
    isPinned = !isPinned;
    pinBtn.classList.toggle('pinned', isPinned);

    if (isPinned) {
      pinIcon.textContent = '📌';
      pinStatus.textContent = 'Pinned! (Blue)';
      spawnBurst(pinBtn);
    } else {
      pinIcon.textContent = '📌';
      pinStatus.textContent = 'Click to pin';
    }
  });
}

/**
 * Confetti burst on pin button click
 */
function spawnBurst(target) {
  const rect = target.getBoundingClientRect();
  const burstIcons = ['🎉', '✨', '⭐', '💙'];

  for (let i = 0; i < 8; i++) {
    const burst = document.createElement('div');
    burst.textContent = burstIcons[Math.floor(Math.random() * burstIcons.length)];
    burst.style.position = 'fixed';
    burst.style.left = `${rect.left + rect.width / 2}px`;
    burst.style.top = `${rect.top}px`;
    burst.style.fontSize = '18px';
    burst.style.pointerEvents = 'none';
    burst.style.zIndex = '999';
    burst.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';

    document.body.appendChild(burst);

    const angle = (Math.PI * 2 * i) / 8;
    const distance = 40 + Math.random() * 30;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - 20;

    requestAnimationFrame(() => {
      burst.style.transform = `translate(${destX}px, ${destY}px) scale(0)`;
      burst.style.opacity = '0';
    });

    setTimeout(() => {
      if (burst.parentNode) burst.parentNode.removeChild(burst);
    }, 700);
  }
}

/**
 * Sets up action buttons for testing capture, options, and shortcuts
 */
function initActionButtons() {
  // 1. Open Studio & Try Sample Capture
  const openStudioBtn = document.getElementById('btn-open-studio-test');
  if (openStudioBtn) {
    openStudioBtn.addEventListener('click', () => {
      window.open('../studio/index.html', '_blank');
    });
  }

  // 2. Open Settings / Options
  const openSettingsBtn = document.getElementById('btn-open-settings');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('../options/options.html', '_blank');
      }
    });
  }

  // 3. Manage shortcuts / guide
  const manageShortcutsLink = document.getElementById('link-manage-shortcuts');
  const shortcutsHelpLink = document.getElementById('link-shortcuts-help');
  const openShortcuts = (e) => {
    e.preventDefault();
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }).catch(() => {
        window.open('../options/options.html', '_blank');
      });
    } else {
      window.open('../options/options.html', '_blank');
    }
  };

  if (manageShortcutsLink) manageShortcutsLink.addEventListener('click', openShortcuts);
  if (shortcutsHelpLink) shortcutsHelpLink.addEventListener('click', openShortcuts);

  // 4. Close notification button
  const closeNotifBtn = document.getElementById('btn-close-notification');
  const notifCard = document.getElementById('install-notification');
  if (closeNotifBtn && notifCard) {
    closeNotifBtn.addEventListener('click', () => {
      notifCard.style.opacity = '0';
      notifCard.style.transform = 'translateY(-20px)';
      setTimeout(() => notifCard.style.display = 'none', 300);
    });
  }
}
