/* Amicale SP Volvic — compatibilité écran/clavier mobile v1 */
(function () {
  function setViewportHeight() {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--mobile-vh', `${h}px`);

    if (vv) {
      const keyboard = window.innerHeight - vv.height > 150;
      document.body.classList.toggle('keyboard-open', keyboard);
    }
  }

  setViewportHeight();
  window.addEventListener('resize', setViewportHeight, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportHeight, { passive: true });
    window.visualViewport.addEventListener('scroll', setViewportHeight, { passive: true });
  }

  // Lorsqu'un champ est sélectionné, le remet dans la zone visible après ouverture du clavier.
  document.addEventListener('focusin', function (e) {
    if (!e.target.matches('input,select,textarea')) return;
    setTimeout(() => {
      try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
    }, 300);
  });

  // Évite qu'un ancien état "clavier ouvert" reste après retour dans l'application.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      document.body.classList.remove('keyboard-open');
      setTimeout(setViewportHeight, 100);
    }
  });
})();
