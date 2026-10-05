/* Amicale SP Volvic — sécurisation file hors connexion V2
   Conserve uniquement la saisie la plus récente pour chaque maison/campagne.
   Aucun changement Supabase. */
(function () {
  const KEY = 'visitQueue';

  function readQueue() {
    try {
      const q = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(q) ? q : [];
    } catch (_) {
      return [];
    }
  }

  function dedupe(list) {
    const latest = new Map();
    for (const p of list) {
      if (!p || !p.household_id) continue;
      const key = String(p.campaign_id || '') + '|' + String(p.household_id);
      latest.set(key, p); // la dernière saisie gagne
    }
    return Array.from(latest.values());
  }

  function writeQueue(list) {
    const clean = dedupe(list);
    localStorage.setItem(KEY, JSON.stringify(clean));
    return clean;
  }

  // Nettoie immédiatement une ancienne file qui contiendrait plusieurs versions
  // de la même maison, sans supprimer la version la plus récente.
  try { writeQueue(readQueue()); } catch (_) {}

  // Remplace la fonction queue() globale utilisée par app.js.
  window.queue = function (p) {
    const q = readQueue();
    const key = String(p.campaign_id || '') + '|' + String(p.household_id);
    const clean = q.filter(x =>
      String(x?.campaign_id || '') + '|' + String(x?.household_id) !== key
    );
    clean.push(p);
    const saved = writeQueue(clean);
    try {
      if (typeof setSync === 'function') {
        setSync(`${saved.length} saisie(s) à synchroniser`, true);
      }
    } catch (_) {}
  };

  // Version robuste : si une nouvelle saisie de la même maison arrive pendant
  // une synchronisation, elle n'est jamais effacée par la fin du flush précédent.
  window.flushQueue = async function () {
    if (!navigator.onLine || !window.sb) return;

    const snapshot = dedupe(readQueue());
    if (!snapshot.length) return;

    const failedKeys = new Set();

    for (const p of snapshot) {
      const key = String(p.campaign_id || '') + '|' + String(p.household_id);
      try {
        const { error } = await sb.from('visits')
          .upsert(p, { onConflict: 'campaign_id,household_id' });
        if (error) failedKeys.add(key);
      } catch (_) {
        failedKeys.add(key);
      }
    }

    // Relit la file après les requêtes : elle peut avoir changé entre-temps.
    const now = dedupe(readQueue());
    const snapshotByKey = new Map(snapshot.map(p => [
      String(p.campaign_id || '') + '|' + String(p.household_id), p
    ]));

    const left = now.filter(p => {
      const key = String(p.campaign_id || '') + '|' + String(p.household_id);
      const sent = snapshotByKey.get(key);
      if (!sent) return true; // ajoutée pendant le flush
      if (failedKeys.has(key)) return true;
      // Si la saisie locale a été modifiée pendant le flush, garder la nouvelle.
      return JSON.stringify(p) !== JSON.stringify(sent);
    });

    const saved = writeQueue(left);

    if (!saved.length) {
      try { if (typeof toast === 'function') toast('Saisies synchronisées'); } catch (_) {}
      try { if (typeof loadAll === 'function') await loadAll(); } catch (_) {}
    } else {
      try {
        if (typeof setSync === 'function') {
          setSync(`${saved.length} saisie(s) en attente`, true);
        }
      } catch (_) {}
    }
  };

  // Nouvelle tentative au retour dans l'application, en plus de l'évènement online.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && navigator.onLine) {
      setTimeout(() => window.flushQueue(), 250);
    }
  });
  window.addEventListener('focus', function () {
    if (navigator.onLine) setTimeout(() => window.flushQueue(), 250);
  });
})();
