/* Amicale SP Volvic — gestion Maisons / Immeubles / Appartements
   À charger après help-mode.js.
*/
(function () {
  const $id = id => document.getElementById(id);

  function typeLabel(h) {
    if (h.dwelling_type === 'appartement') return `🏢 ${h.unit_label || 'Appartement'}`;
    if (h.dwelling_type === 'immeuble') return `🏢 Immeuble${h.apartment_count ? ` · ${h.apartment_count} logements` : ''}`;
    return '🏠 Maison';
  }

  function isParentBuilding(h) {
    return h && h.dwelling_type === 'immeuble' && !h.unit_label;
  }

  function sameBuilding(a,b) {
    return a && b &&
      a.sector_id === b.sector_id &&
      (a.street_id || '') === (b.street_id || '') &&
      String(a.house_number || '').trim().toLowerCase() === String(b.house_number || '').trim().toLowerCase() &&
      String(a.street || '').trim().toLowerCase() === String(b.street || '').trim().toLowerCase() &&
      String(a.locality || '').trim().toLowerCase() === String(b.locality || '').trim().toLowerCase();
  }

  window.configureDwelling = async function(id) {
    const h = households.find(x => x.id === id);
    if (!h) return toast('Adresse introuvable');

    const current = h.dwelling_type === 'immeuble' ? '2' : '1';
    const choice = prompt(
      "Type d'adresse :\n1. 🏠 Maison\n2. 🏢 Immeuble / plusieurs logements",
      current
    );
    if (choice === null) return;

    if (String(choice).trim() === '1') {
      const children = households.filter(x => x.id !== h.id && sameBuilding(x,h) && x.dwelling_type === 'appartement');
      if (children.length && !confirm(`Cette adresse possède ${children.length} appartement(s) créés. Les désactiver et repasser l'adresse en maison ?`)) return;

      if (children.length) {
        const ids = children.map(x => x.id);
        const r0 = await sb.from('households').update({active:false}).in('id', ids);
        if (r0.error) return toast(r0.error.message);
      }
      const r = await sb.from('households').update({
        dwelling_type:'maison', apartment_count:null, unit_label:null
      }).eq('id',id);
      if (r.error) return toast(r.error.message);
      await loadAll();
      return toast('🏠 Adresse définie comme maison');
    }

    if (String(choice).trim() !== '2') return toast('Choisis 1 ou 2');

    let count = Number(prompt("Combien d'appartements / logements y a-t-il dans l'immeuble ?", h.apartment_count || 2));
    if (!Number.isInteger(count) || count < 1 || count > 500) return toast('Nombre de logements incorrect');

    const buildingName = prompt("Nom de résidence / bâtiment (facultatif)", h.building_name || '');
    if (buildingName === null) return;

    const existing = households.filter(x => x.id !== h.id && sameBuilding(x,h) && x.dwelling_type === 'appartement' && x.active !== false);

    const parentUpdate = await sb.from('households').update({
      dwelling_type:'immeuble',
      apartment_count:count,
      building_name:buildingName || null,
      unit_label:null
    }).eq('id',id);
    if (parentUpdate.error) return toast(parentUpdate.error.message);

    for (let i=1; i<=count; i++) {
      const label = `Appartement ${i}`;
      const already = existing.find(x => String(x.unit_label||'').toLowerCase() === label.toLowerCase());
      if (already) continue;
      const payload = {
        sector_id:h.sector_id, street_id:h.street_id || null,
        house_number:h.house_number || null, street:h.street,
        locality:h.locality || null, postal_code:h.postal_code || null,
        city_name:h.city_name || null, latitude:h.latitude, longitude:h.longitude,
        active:true, is_test:h.is_test || false,
        dwelling_type:'appartement', apartment_count:null,
        building_name:buildingName || null, unit_label:label
      };
      const r = await sb.from('households').insert(payload);
      if (r.error) return toast(`Appartement ${i} : ${r.error.message}`);
    }

    /* Si on réduit le nombre, on ne supprime jamais silencieusement un logement ayant pu avoir un historique.
       Les logements supplémentaires restent présents et peuvent être gérés manuellement. */
    await loadAll();
    toast(`🏢 Immeuble configuré : ${count} logements`);
  };

  window.renameUnit = async function(id) {
    const h = households.find(x => x.id === id);
    if (!h || h.dwelling_type !== 'appartement') return;
    const label = prompt("Nom / numéro du logement", h.unit_label || '');
    if (label === null || !label.trim()) return;
    const r = await sb.from('households').update({unit_label:label.trim()}).eq('id',id);
    if (r.error) return toast(r.error.message);
    h.unit_label = label.trim();
    renderHouses();
    toast('Nom du logement modifié');
  };

  const originalHouseHTML = window.houseHTML || (typeof houseHTML === 'function' ? houseHTML : null);
  if (originalHouseHTML) {
    window.houseHTML = function(h) {
      let html = originalHouseHTML(h);
      const tag = `<div class="pill">${typeLabel(h)}</div>`;
      const controls = me?.role === 'admin'
        ? (h.dwelling_type === 'appartement'
            ? `<button class="btn alt" onclick="renameUnit('${h.id}')">✏️ Renommer logement</button>`
            : `<button class="btn alt" onclick="configureDwelling('${h.id}')">🏠/🏢 Type de logement</button>`)
        : '';

      html = html.replace('<div class="address">', tag + '<div class="address">');

      if (isParentBuilding(h)) {
        html = html.replace(
          '<div class="status">',
          `<div class="muted">Cette ligne représente l'immeuble. Les passages se saisissent appartement par appartement.</div>
           <div class="row">${controls}</div>
           <div class="status hidden">`
        );
      } else if (controls) {
        html = html.replace('<div class="status">', `<div class="row">${controls}</div><div class="status">`);
      }
      return html;
    };
  }

  /* help-mode.js remplace renderHouses et appelle houseHTML par son nom global.
     On redéfinit donc le rendu pour garantir l'utilisation de la version enrichie. */
  window.renderHouses = function () {
    if (!$id('houses')) return;
    const sid = $id('sectorSelect').value;
    const tid = $id('teamView').value;
    const fs = $id('filterStatus').value;
    const q = $id('searchHouse').value.toLowerCase();

    let list = visibleHouses().filter(h => {
      if (sid && h.sector_id !== sid) return false;
      if (tid === '__shared__') {
        const sector = sectors.find(s => s.id === h.sector_id);
        const city = cities.find(c => c.id === sector?.city_id);
        if (city?.shared_round !== true) return false;
      } else if (tid && teamForHouse(h) !== tid) return false;
      return true;
    });

    list = list.filter(h => {
      const v = visitFor(h.id);
      const st = v?.status || 'a_faire';
      const text = `${h.house_number||''} ${h.street||''} ${h.locality||''} ${h.unit_label||''} ${h.building_name||''} ${h.permanent_note||''}`.toLowerCase();
      return (!fs || st === fs) && text.includes(q);
    });

    list.sort((a,b) => {
      const ka = `${a.locality||''}|${a.street||''}|${a.house_number||''}`;
      const kb = `${b.locality||''}|${b.street||''}|${b.house_number||''}`;
      if (ka !== kb) return ka.localeCompare(kb,'fr',{numeric:true});
      if (a.dwelling_type === 'immeuble' && b.dwelling_type !== 'immeuble') return -1;
      if (b.dwelling_type === 'immeuble' && a.dwelling_type !== 'immeuble') return 1;
      return String(a.unit_label||'').localeCompare(String(b.unit_label||''),'fr',{numeric:true});
    });

    $id('houses').innerHTML = list.map(h => window.houseHTML(h)).join('') ||
      '<div class="card muted">Aucun foyer correspondant.</div>';
  };

  const oldLoadAll = window.loadAll;
  /* Les fonctions déclarées avec function dans app.js restent accessibles globalement,
     donc le prochain rendu utilisera automatiquement les nouvelles colonnes déjà sélectionnées par select('*'). */

  document.addEventListener('DOMContentLoaded', () => {
    const s = document.getElementById('searchHouse');
    if (s) s.placeholder = '🔎 Rue, numéro, village, appartement ou remarque';
  });
})();
