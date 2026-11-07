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
const CONSENT_VALIDITY_MS = CONSENT_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
const META_PIXEL_ID = '1695390391145063';
const META_PIXEL_SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';
const META_PIXEL_SCRIPT_SELECTOR = 'script[src*="connect.facebook.net"][src*="fbevents.js"]';
const LEAD_NAVIGATION_TIMEOUT_MS = 1200;
const cookieBanner = document.querySelector('#cookie-banner');
const cookieOverlay = document.querySelector('#cookie-preferences');
const analyticsToggle = document.querySelector('#consent-analytics');
const marketingToggle = document.querySelector('#consent-marketing');
let priorFocus = null;
let sessionConsent = null;
let pixelInitialized = false;
let pixelScriptRequested = false;
let pixelPageViewSent = false;

function isValidConsent(consent) {
  return consent !== null
    && typeof consent === 'object'
    && consent.necessary === true
    && typeof consent.analytics === 'boolean'
    && typeof consent.marketing === 'boolean'
    && consent.version === CONSENT_VERSION
    && Number.isFinite(consent.expiresAt)
    && consent.expiresAt > Date.now();
}

function readConsent() {
  let raw;
  try {
    raw = localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let consent;
  try {
    consent = JSON.parse(raw);
  } catch {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // O banner continua disponível mesmo se o navegador bloquear o armazenamento.
    }
    return null;
  }

  if (!isValidConsent(consent)) {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // O banner continua disponível mesmo se o navegador bloquear o armazenamento.
    }
    return null;
  }
  return consent;
}

function getCurrentConsent() {
  return readConsent() || (isValidConsent(sessionConsent) ? sessionConsent : null);
}

function syncCookieBanner(consent) {
  if (cookieBanner) cookieBanner.hidden = isValidConsent(consent);
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
  script.src = META_PIXEL_SCRIPT_URL;
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
  if (consent?.marketing === true && isValidConsent(consent)) {
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
    expiresAt: now + CONSENT_VALIDITY_MS
  };
  sessionConsent = consent;
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // A escolha continua aplicada nesta visita se o navegador bloquear armazenamento.
  }
  syncCookieBanner(consent);
  if (cookieOverlay) cookieOverlay.hidden = true;
  document.body.classList.remove('cookie-dialog-open');
  applyPixelConsent(consent);
}

function openPreferences() {
  const consent = getCurrentConsent();
  priorFocus = document.activeElement;
  if (analyticsToggle) analyticsToggle.checked = consent?.analytics === true;
  if (marketingToggle) marketingToggle.checked = consent?.marketing === true;
  if (!cookieOverlay) return;
  cookieOverlay.hidden = false;
  document.body.classList.add('cookie-dialog-open');
  cookieOverlay.querySelector('[data-cookie-close]')?.focus();
}

function closePreferences() {
  if (!cookieOverlay) return;
  cookieOverlay.hidden = true;
  document.body.classList.remove('cookie-dialog-open');
  priorFocus?.focus?.();
}

function rejectOptionalCookies() {
  saveConsent({ analytics: false, marketing: false });
}

function getWhatsAppGroupLink(target) {
  const link = target?.closest?.('a[data-whatsapp]');
  if (!link) return null;

  try {
    const url = new URL(link.href, window.location.href);
    const host = url.hostname.toLowerCase();
    const isWhatsAppHost = host === 'wa.me'
      || host === 'whatsapp.com'
      || host.endsWith('.whatsapp.com');
    return url.protocol === 'https:' && isWhatsAppHost ? link : null;
  } catch {
    return null;
  }
}

document.querySelectorAll('[data-cookie-accept]').forEach((button) => button.addEventListener('click', () => {
  saveConsent({ analytics: true, marketing: true });
}));
document.querySelectorAll('[data-cookie-reject]').forEach((button) => button.addEventListener('click', rejectOptionalCookies));
document.querySelector('[data-cookie-customize]')?.addEventListener('click', openPreferences);
document.querySelector('[data-open-cookie-settings]')?.addEventListener('click', () => {
  if (cookieBanner) cookieBanner.hidden = true;
  openPreferences();
});
document.querySelector('[data-cookie-close]')?.addEventListener('click', closePreferences);
document.querySelector('[data-cookie-save]')?.addEventListener('click', () => {
  saveConsent({ analytics: analyticsToggle?.checked, marketing: marketingToggle?.checked });
});
cookieOverlay?.addEventListener('click', (event) => {
  if (event.target === cookieOverlay) closePreferences();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && cookieOverlay && !cookieOverlay.hidden) closePreferences();
});

document.addEventListener('click', (event) => {
  const whatsappLink = getWhatsAppGroupLink(event.target);
  if (!whatsappLink || !hasMarketingConsent()) return;

  enableMetaPixel();
  if (!hasMarketingConsent() || !pixelInitialized || typeof window.fbq !== 'function') return;

  const fbq = window.fbq;
  const modifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  const opensAnotherContext = whatsappLink.target && whatsappLink.target.toLowerCase() !== '_self';
  const isDownload = whatsappLink.hasAttribute('download');
  const canDelayNavigation = event.button === 0 && !modifiedClick && !opensAnotherContext && !isDownload;

  if (!canDelayNavigation) {
    fbq('track', 'Lead');
    return;
  }

  event.preventDefault();
  let navigated = false;
  const navigate = () => {
    if (navigated) return;
    navigated = true;
    window.location.assign(whatsappLink.href);
  };
  const navigationTimer = window.setTimeout(navigate, LEAD_NAVIGATION_TIMEOUT_MS);

  fbq('track', 'Lead', {}, {
    eventCallback: () => {
      window.clearTimeout(navigationTimer);
      navigate();
    },
    eventTimeout: LEAD_NAVIGATION_TIMEOUT_MS
  });
});

window.addEventListener('storage', (event) => {
  if (event.key !== CONSENT_STORAGE_KEY && event.key !== null) return;
  sessionConsent = readConsent();
  const consent = getCurrentConsent();
  syncCookieBanner(consent);
  applyPixelConsent(consent);
});

const initialConsent = readConsent();
sessionConsent = initialConsent;
syncCookieBanner(getCurrentConsent());
applyPixelConsent(initialConsent);

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();
