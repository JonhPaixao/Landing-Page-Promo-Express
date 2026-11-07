const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const toast = document.querySelector('.toast');
menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const CONSENT_STORAGE_KEY = 'promoExpressConsent';
const CONSENT_VERSION = 1;
const CONSENT_VALIDITY_DAYS = 180;
const META_PIXEL_ID = '1695390391145063';
const META_PIXEL_SCRIPT_SELECTOR = 'script[src*="connect.facebook.net"][src*="fbevents.js"]';
const cookieBanner = document.querySelector('#cookie-banner');
const cookieOverlay = document.querySelector('#cookie-preferences');
const analyticsToggle = document.querySelector('#consent-analytics');
const marketingToggle = document.querySelector('#consent-marketing');
let priorFocus = null;
let sessionConsent = null;
let pixelInitialized = false;
let pixelScriptRequested = false;
let pixelPageViewSent = false;

function readConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const consent = JSON.parse(raw);
    if (consent.version !== CONSENT_VERSION || !Number.isFinite(consent.expiresAt) || consent.expiresAt <= Date.now()) {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      return null;
    }
    return consent;
  } catch {
    return null;
  }
}

function getCurrentConsent() {
  return readConsent() || sessionConsent;
}

function hasMarketingConsent() {
  return getCurrentConsent()?.marketing === true;
}

function getMetaPixel() {
  if (typeof window.fbq === 'function') return window.fbq;

  const fbq = function () {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, arguments);
    } else {
      fbq.queue.push(arguments);
    }
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  return fbq;
}

function loadMetaPixelScript() {
  if (pixelScriptRequested) return;

  const existingScript = document.querySelector(META_PIXEL_SCRIPT_SELECTOR);
  if (existingScript) {
    pixelScriptRequested = true;
    return;
  }

  pixelScriptRequested = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  script.addEventListener('error', () => {
    pixelScriptRequested = false;
    script.remove();
  }, { once: true });
  document.head.appendChild(script);
}

function enableMetaPixel() {
  if (!hasMarketingConsent()) return;

  const fbq = getMetaPixel();
  fbq('consent', 'grant');
  if (!pixelInitialized) {
    fbq('init', META_PIXEL_ID);
    pixelInitialized = true;
  }
  loadMetaPixelScript();

  if (!pixelPageViewSent) {
    fbq('track', 'PageView');
    pixelPageViewSent = true;
  }
}

function applyPixelConsent(consent) {
  if (consent?.marketing === true) {
    enableMetaPixel();
    return;
  }
  if (pixelInitialized && typeof window.fbq === 'function') {
    window.fbq('consent', 'revoke');
  }
}

function saveConsent({ analytics = false, marketing = false } = {}) {
  const now = Date.now();
  const consent = {
    necessary: true,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    version: CONSENT_VERSION,
    updatedAt: now,
    expiresAt: now + CONSENT_VALIDITY_DAYS * 24 * 60 * 60 * 1000
  };
  sessionConsent = consent;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // A escolha continua aplicada nesta visita se o navegador bloquear armazenamento.
  }
  cookieBanner.hidden = true;
  cookieOverlay.hidden = true;
  document.body.classList.remove('cookie-dialog-open');
  applyPixelConsent(consent);
}

function openPreferences() {
  const consent = getCurrentConsent();
  priorFocus = document.activeElement;
  analyticsToggle.checked = consent?.analytics === true;
  marketingToggle.checked = consent?.marketing === true;
  cookieOverlay.hidden = false;
  document.body.classList.add('cookie-dialog-open');
  cookieOverlay.querySelector('[data-cookie-close]')?.focus();
}

function closePreferences() {
  cookieOverlay.hidden = true;
  document.body.classList.remove('cookie-dialog-open');
  priorFocus?.focus?.();
}

function rejectOptionalCookies() {
  saveConsent({ analytics: false, marketing: false });
}

document.querySelectorAll('[data-cookie-accept]').forEach((button) => button.addEventListener('click', () => {
  saveConsent({ analytics: true, marketing: true });
}));
document.querySelectorAll('[data-cookie-reject]').forEach((button) => button.addEventListener('click', rejectOptionalCookies));
document.querySelector('[data-cookie-customize]')?.addEventListener('click', openPreferences);
document.querySelector('[data-open-cookie-settings]')?.addEventListener('click', () => {
  cookieBanner.hidden = true;
  openPreferences();
});
document.querySelector('[data-cookie-close]')?.addEventListener('click', closePreferences);
document.querySelector('[data-cookie-save]')?.addEventListener('click', () => {
  saveConsent({ analytics: analyticsToggle.checked, marketing: marketingToggle.checked });
});
cookieOverlay?.addEventListener('click', (event) => {
  if (event.target === cookieOverlay) closePreferences();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && cookieOverlay && !cookieOverlay.hidden) closePreferences();
});

document.addEventListener('click', (event) => {
  const whatsappLink = event.target.closest?.('[data-whatsapp]');
  if (!whatsappLink || !hasMarketingConsent()) return;

  enableMetaPixel();
  if (hasMarketingConsent() && pixelInitialized && typeof window.fbq === 'function') {
    window.fbq('track', 'Lead');
  }
});

window.addEventListener('storage', (event) => {
  if (event.key !== CONSENT_STORAGE_KEY && event.key !== null) return;
  sessionConsent = readConsent();
  applyPixelConsent(sessionConsent);
  if (cookieBanner && !sessionConsent) cookieBanner.hidden = false;
  if (cookieBanner && sessionConsent) cookieBanner.hidden = true;
});

const initialConsent = readConsent();
sessionConsent = initialConsent;
if (cookieBanner && !initialConsent) cookieBanner.hidden = false;
applyPixelConsent(initialConsent);

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
