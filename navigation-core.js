/* Navigation persistante - charge juste après app.js.
   Intercepte le page('home') de démarrage sans écraser la dernière page choisie. */
(() => {
  const KEY = 'tc_last_page';
  const allowed = new Set(['home','tour','map','admin','settings']);
  const original = window.page;
  if (typeof original !== 'function') return;

  let startupHandled = false;

  window.page = function(name) {
    let target = name;

    // Le premier page('home') après reconnexion est le retour forcé historique.
    // On le remplace par la dernière page réellement choisie par l'utilisateur.
    if (!startupHandled && name === 'home') {
      startupHandled = true;
      const saved = localStorage.getItem(KEY);
      if (allowed.has(saved)) target = saved;
    }

    return original(target);
  };

  // Mémorise uniquement les navigations réellement demandées par l'utilisateur.
  document.addEventListener('pointerdown', (e) => {
    const tab = e.target.closest?.('[data-page]');
    if (tab?.dataset.page && allowed.has(tab.dataset.page)) {
      localStorage.setItem(KEY, tab.dataset.page);
    }
    if (e.target.closest?.('.bigstart')) {
      localStorage.setItem(KEY, 'tour');
    }
  }, true);

  // Sauvegarde de sécurité avant suspension iOS/Android.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    const current = [...allowed].find(name => {
      const el = document.getElementById('page-' + name);
      return el && !el.classList.contains('hidden');
    });
    if (current) localStorage.setItem(KEY, current);
  });
})();
