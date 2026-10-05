/* Amicale SP Volvic — pont runtime pour modules temps réel V1
   Rend accessibles aux modules additionnels les objets déjà créés par app.js.
   Aucun changement de données / Supabase. */
(function () {
  try {
    if (typeof sb !== 'undefined') window.sb = sb;
  } catch (_) {}

  try {
    Object.defineProperty(window, 'campaign', {
      configurable: true,
      get: function () {
        try { return campaign; } catch (_) { return null; }
      }
    });
  } catch (_) {}

  try {
    if (typeof loadAll === 'function') window.loadAll = loadAll;
    if (typeof renderHouses === 'function') window.renderHouses = renderHouses;
    if (typeof renderStats === 'function') window.renderStats = renderStats;
  } catch (_) {}
})();
