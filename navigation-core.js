/* Navigation persistante V3 — iOS + Android
   Bloque tout retour automatique à Accueil.
   Accueil reste accessible normalement si l'utilisateur appuie dessus. */
(() => {
  const KEY = 'tc_last_page';
  const allowed = new Set(['home','tour','map','admin','settings']);
  const originalPage = window.page;
  if (typeof originalPage !== 'function') return;

  function savedPage() {
    const s = localStorage.getItem(KEY);
    return allowed.has(s) ? s : 'home';
  }

  // Point important :
  // app.js peut rappeler page('home') après une reprise/reconnexion.
  // Tant que l'utilisateur n'a pas réellement choisi Accueil,
  // ce retour automatique est remplacé par sa dernière page.
  window.page = function(name) {
    let target = name;
    if (name === 'home' && savedPage() !== 'home') {
      target = savedPage();
    }
    return originalPage(target);
  };

  // Un appui réel sur une barre de navigation est mémorisé AVANT onclick.
  document.addEventListener('pointerdown', e => {
    const tab = e.target.closest?.('[data-page]');
    if (tab?.dataset.page && allowed.has(tab.dataset.page)) {
      localStorage.setItem(KEY, tab.dataset.page);
    }
    if (e.target.closest?.('.bigstart')) {
      localStorage.setItem(KEY, 'tour');
    }
  }, true);

  // Sécurité clavier/clic.
  document.addEventListener('click', e => {
    const tab = e.target.closest?.('[data-page]');
    if (tab?.dataset.page && allowed.has(tab.dataset.page)) {
      localStorage.setItem(KEY, tab.dataset.page);
    }
  }, true);

  function currentPage() {
    return [...allowed].find(name => {
      const el = document.getElementById('page-' + name);
      return el && !el.classList.contains('hidden');
    });
  }

  function saveCurrent() {
    const p = currentPage();
    if (p) localStorage.setItem(KEY, p);
  }

  function restore() {
    const p = savedPage();
    try {
      if (p === 'admin' && typeof me !== 'undefined' && me && me.role !== 'admin') return;
      window.page(p);
    } catch (_) {}
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveCurrent();
    } else {
      [0,100,300,700,1200].forEach(ms => setTimeout(restore, ms));
    }
  });

  window.addEventListener('pagehide', saveCurrent, true);
  window.addEventListener('pageshow', () => {
    [0,100,300,700,1200].forEach(ms => setTimeout(restore, ms));
  }, true);
})();
