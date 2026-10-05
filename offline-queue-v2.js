/* Amicale SP Volvic — sécurisation file hors connexion V2.1
   Conserve uniquement la saisie la plus récente pour chaque maison/campagne.
   Aucun changement Supabase. */
(function () {
  const KEY = 'visitQueue';
  let flushing = false;

  function readQueue() {
    try {
      const q = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(q) ? q : [];
    } catch (_) { return []; }
  }

  function keyOf(p) {
    return String(p?.campaign_id || '') + '|' + String(p?.household_id || '');
  }

  function dedupe(list) {
    const latest = new Map();
    for (const p of list) {
      if (!p || !p.household_id) continue;
      latest.set(keyOf(p), p);
    }
    return Array.from(latest.values());
  }

  function writeQueue(list) {
    const clean = dedupe(list);
    localStorage.setItem(KEY, JSON.stringify(clean));
    return clean;
  }

  try { writeQueue(readQueue()); } catch (_) {}

  window.queue = function (p) {
    const clean = readQueue().filter(x => keyOf(x) !== keyOf(p));
    clean.push(p);
    const saved = writeQueue(clean);
    try { if (typeof setSync === 'function') setSync(`${saved.length} saisie(s) à synchroniser`, true); } catch (_) {}
  };

  window.flushQueue = async function () {
    if (!navigator.onLine || flushing) return;
    flushing = true;
    try {
      const snapshot = dedupe(readQueue());
      if (!snapshot.length) return;

      const failedKeys = new Set();
      for (const p of snapshot) {
        const key = keyOf(p);
        try {
          const { error } = await sb.from('visits').upsert(p, { onConflict: 'campaign_id,household_id' });
          if (error) failedKeys.add(key);
        } catch (_) { failedKeys.add(key); }
      }

      const now = dedupe(readQueue());
      const snapshotByKey = new Map(snapshot.map(p => [keyOf(p), p]));
      const left = now.filter(p => {
        const key = keyOf(p), sent = snapshotByKey.get(key);
        if (!sent || failedKeys.has(key)) return true;
        return JSON.stringify(p) !== JSON.stringify(sent);
      });

      const saved = writeQueue(left);
      if (!saved.length) {
        try { if (typeof toast === 'function') toast('Saisies synchronisées'); } catch (_) {}
        try { if (typeof loadAll === 'function') await loadAll(); } catch (_) {}
      } else {
        try { if (typeof setSync === 'function') setSync(`${saved.length} saisie(s) en attente`, true); } catch (_) {}
      }
    } finally { flushing = false; }
  };

  window.addEventListener('online', () => setTimeout(() => window.flushQueue(), 250));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.onLine) setTimeout(() => window.flushQueue(), 250);
  });
  window.addEventListener('focus', () => {
    if (navigator.onLine) setTimeout(() => window.flushQueue(), 250);
  });
})();