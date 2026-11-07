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

function trackWhatsAppLead(link, { navigate = true } = {}) {
  if (link.dataset.leadTracking === 'pending') return;

  if (navigate) {
    link.dataset.leadTracking = 'pending';
  }

  let hasNavigated = false;
  const continueToWhatsApp = () => {
    if (!navigate || hasNavigated) return;
    hasNavigated = true;
    window.location.assign(link.href);
  };

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Lead', {}, { eventCallback: continueToWhatsApp });
  }

  if (navigate) {
    window.setTimeout(continueToWhatsApp, 500);
  }
}

document.querySelectorAll('[data-whatsapp]').forEach((link) => link.addEventListener('click', (event) => {
  if (!link.href.startsWith('https://chat.whatsapp.com/')) return;

  if (link.href.includes('SEU_LINK_AQUI')) {
    event.preventDefault();
    toast.textContent = 'Configure seu link de convite do WhatsApp no arquivo index.html.';
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3600);
    return;
  }

  const canNavigateInCurrentTab = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  trackWhatsAppLead(link, { navigate: canNavigateInCurrentTab });

  if (canNavigateInCurrentTab) {
    event.preventDefault();
  }
}));

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const toastMessages = [
  'O Promo Express está crescendo!',
  'Mais uma oportunidade para economizar!',
  'Fique de olho nas próximas ofertas!'
];
if (toast && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let messageIndex = 0;
  const showNotification = () => {
    toast.textContent = toastMessages[messageIndex];
    toast.classList.add('show');
    messageIndex = (messageIndex + 1) % toastMessages.length;
    window.setTimeout(() => toast.classList.remove('show'), 4200);
  };
  window.setTimeout(() => {
    showNotification();
    window.setInterval(showNotification, 11000);
  }, 5000);
}
