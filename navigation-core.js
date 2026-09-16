/* Correctif Amicale SP Volvic
   - conserve la navigation persistante V3
   - restaure les fonctions d'import supprimées de app.js
   Chargé avant help-mode.js dans index.html.
*/

/* ===== CORRECTIF IMPORT ADRESSES ===== */
function importLocality(a, city) {
  const v = String(a?.locality || a?.context || '').trim();
  return v || city?.name || '';
}

function importCityName(a, city) {
  return String(a?.city || city?.name || '').trim();
}

function importStreetName(a) {
  return String(a?.street || '').trim()
    || String(a?.name || '').replace(/^\s*\d+\s*(?:bis|ter|quater)?\s*/i, '').trim();
}

function importHouseNumber(a) {
  const m = String(a?.name || a?.label || '').match(/^\s*(\d+\s*(?:bis|ter|quater)?)/i);
  return (m?.[1] || '').trim();
}

function normImport(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function addressIdentity(cityName, locality, street, number) {
  return [
    normImport(cityName),
    normImport(locality),
    normImport(street),
    normImport(number)
  ].join('|');
}

function importKey(city, a) {
  return addressIdentity(
    importCityName(a, city),
    importLocality(a, city),
    importStreetName(a),
    importHouseNumber(a)
  );
}

function renderImportedAddresses(city) {
  const target = document.getElementById('streetImport');
  if (!target) return;

  const groups = {};

  (window.imported || imported || []).forEach(a => {
    const street = importStreetName(a);
    if (!street) return;

    const locality = importLocality(a, city);
    const lk = locality || city?.name || 'Sans lieu-dit';

    (groups[lk] ??= {});
    (groups[lk][street] ??= []).push(a);
  });

  const blocks = Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([locality, roadMap]) => {
      const roads = Object.entries(roadMap)
        .sort(([a], [b]) => a.localeCompare(b, 'fr'))
        .map(([street, ads]) => {
          const unique = [];
          const seen = new Set();

          for (const a of ads) {
            const k = importKey(city, a);
            if (!seen.has(k)) {
              seen.add(k);
              unique.push(a);
            }
          }

          const already = unique.filter(a => {
            const key = addressIdentity(
              importCityName(a, city),
              locality,
              street,
              importHouseNumber(a)
            );
            return (window.households || households || []).some(h =>
              addressIdentity(
                h.city_name || '',
                h.locality || '',
                h.street || '',
                h.house_number || ''
              ) === key
            );
          }).length;

          const safeLocality = typeof esc === 'function' ? esc(locality) : locality;
          const safeStreet = typeof esc === 'function' ? esc(street) : street;

          return `<div class="street" style="margin-left:12px">
            <label>
              <input type="checkbox" class="streetCheck"
                data-locality="${safeLocality}" value="${safeStreet}">
              <b>${safeStreet}</b>
            </label>
            <div class="muted">${unique.length} adresse(s)${
              already ? ` · ${already} déjà enregistrée(s)` : ''
            }</div>
          </div>`;
        }).join('');

      const total = Object.values(roadMap).reduce((n, a) => n + a.length, 0);
      const safeLocality = typeof esc === 'function' ? esc(locality) : locality;

      return `<div class="street">
        <div><b>🏘️ ${safeLocality}</b> <span class="pill">${total} adresse(s)</span></div>
        ${roads}
      </div>`;
    }).join('');

  const list = (window.imported || imported || []);
  target.innerHTML =
    `<p class="muted"><b>${list.length}</b> adresse(s) reçue(s).
    Classement par hameau / lieu-dit puis par rue.
    Les adresses déjà présentes ne seront pas recréées.</p>` +
    (blocks || '<p class="muted">Aucune voie trouvée.</p>');
}


/* ===== NAVIGATION PERSISTANTE V3 — iOS + Android =====
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

  window.page = function(name) {
    let target = name;
    if (name === 'home' && savedPage() !== 'home') {
      target = savedPage();
    }
    return originalPage(target);
  };

  document.addEventListener('pointerdown', e => {
    const tab = e.target.closest?.('[data-page]');
    if (tab?.dataset.page && allowed.has(tab.dataset.page)) {
      localStorage.setItem(KEY, tab.dataset.page);
    }
    if (e.target.closest?.('.bigstart')) {
      localStorage.setItem(KEY, 'tour');
    }
  }, true);

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
