/* Tournées Calendriers — compatibilité PWA iPhone / Android v2 */
(function () {
  const APP_VERSION = '2026.10.05-1';

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  function platform() {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    return 'other';
  }

  function updateInstallHelp() {
    const cards = Array.from(document.querySelectorAll('.card'));
    const installCard = cards.find(card => {
      const txt = (card.textContent || '').toLowerCase();
      return txt.includes('installation') && txt.includes("écran d'accueil");
    });
    if (!installCard) return;

    const p = installCard.querySelector('p');
    if (!p) return;

    if (isStandalone()) {
      p.textContent = '✅ Application installée sur ce téléphone.';
      return;
    }

    const os = platform();
    if (os === 'ios') {
      p.innerHTML = '<b>iPhone / iPad :</b> Safari → Partager → Ajouter à l’écran d’accueil.';
    } else if (os === 'android') {
      p.innerHTML = '<b>Android :</b> Chrome → menu ⋮ → Installer l’application ou Ajouter à l’écran d’accueil.';
    } else {
      p.innerHTML = '<b>Installation :</b> ouvre le menu de ton navigateur puis choisis Installer l’application ou Ajouter à l’écran d’accueil.';
    }
  }

  function showUpdateToast() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = '🔄 Nouvelle version installée. Actualisation…';
    toast.style.display = 'block';
  }

  async function registerSW() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register('./sw.js?v=' + encodeURIComponent(APP_VERSION), {
        scope: './',
        updateViaCache: 'none'
      });

      // Demande immédiatement à GitHub s'il existe une nouvelle version.
      await reg.update().catch(() => {});

      // Si un nouveau SW attend, on lui demande de prendre la main.
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        showUpdateToast();
        setTimeout(() => location.reload(), 500);
      });
    } catch (err) {
      console.error('Service Worker', err);
    }
  }

  window.addEventListener('load', () => {
    updateInstallHelp();
    registerSW();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.serviceWorker) {
      navigator.serviceWorker.getRegistration('./').then(reg => reg && reg.update()).catch(() => {});
    }
  });
})();
