/* Amicale SP Volvic
   Extension : aide sécurisée + tournée commune + import Moulet-Marcenat
*/
(function () {
  function isSharedRoundHouse(h) {
    if (!h) return false;
    const sector = sectors.find(s => s.id === h.sector_id);
    const city = cities.find(c => c.id === sector?.city_id);
    return city?.shared_round === true;
  }

  window.visibleHouses = function () {
    if (me.role === 'admin' || me.role === 'responsable') return households;
    const ownTeams = myTeamIds();
    return households.filter(h => {
      const owner = teamForHouse(h);
      return isSharedRoundHouse(h) || ownTeams.includes(owner) || (helpTeam && owner === helpTeam);
    });
  };

  window.renderHouses = function () {
    if (!$('houses')) return;
    const sid = $('sectorSelect').value;
    const tid = $('teamView').value;
    const fs = $('filterStatus').value;
    const q = $('searchHouse').value.toLowerCase();

    let list = visibleHouses().filter(h => {
      if (sid && h.sector_id !== sid) return false;
      if (tid === '__shared__') return isSharedRoundHouse(h);
      if (tid && teamForHouse(h) !== tid) return false;
      return true;
    });

    list = list.filter(h => {
      const v = visitFor(h.id);
      const st = v?.status || 'a_faire';
      return (!fs || st === fs) &&
        `${h.house_number || ''} ${h.street || ''} ${h.locality || ''} ${h.permanent_note || ''}`
          .toLowerCase().includes(q);
    });

    $('houses').innerHTML = list.map(h => houseHTML(h)).join('') ||
      '<div class="card muted">Aucun foyer correspondant.</div>';
  };

  const oldRenderFilters = window.renderFilters;
  window.renderFilters = function () {
    oldRenderFilters();
    const selector = $('teamView');
    if (selector && cities.some(c => c.shared_round) &&
        !selector.querySelector('[value="__shared__"]')) {
      const option = document.createElement('option');
      option.value = '__shared__';
      option.textContent = '👥 Moulet-Marcenat — tournée commune';
      selector.appendChild(option);
    }
    updateSharedImportUI();
  };

  function renderHelpBanner() {
    const banner = $('helpBanner');
    if (!banner) return;
    const team = teams.find(t => t.id === helpTeam);
    if (!team) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }
    banner.classList.remove('hidden');
    banner.innerHTML =
      `🤝 Vous aidez actuellement : <b>${esc(team.name)}</b>
       <button class="btn alt" onclick="stopHelp()">Revenir à mon équipe</button>`;
  }

  async function restoreHelpSession() {
    if (!me?.id) return;
    const { data, error } = await sb.from('team_help_sessions')
      .select('team_id,expires_at')
      .eq('user_id', me.id)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) {
      console.warn('Session aide :', error.message);
      return;
    }
    const previous = helpTeam;
    helpTeam = data?.team_id || null;
    renderHelpBanner();
    if (previous !== helpTeam) {
      renderHouses();
      renderStats();
      renderMap();
    }
  }

  const helpButton = $('helpBtn');
  if (helpButton) {
    helpButton.onclick = async function () {
      const choices = teams.filter(t => !myTeamIds().includes(t.id));
      if (!choices.length) return toast('Aucune autre équipe disponible');
      const names = choices.map((t, i) => `${i + 1}. ${t.name}`).join('\n');
      const selected = Number(prompt('Quelle équipe voulez-vous aider ?\n\n' + names));
      if (!selected || !choices[selected - 1]) return;
      const team = choices[selected - 1];
      const now = new Date();
      const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
      const { error } = await sb.from('team_help_sessions').upsert({
        user_id: me.id,
        team_id: team.id,
        started_at: now.toISOString(),
        expires_at: expires.toISOString()
      }, { onConflict: 'user_id' });
      if (error) return toast("Impossible d'activer le mode aide : " + error.message);
      helpTeam = team.id;
      renderHelpBanner();
      await loadAll();
      toast(`🤝 Vous aidez maintenant ${team.name}`);
    };
  }

  window.stopHelp = async function () {
    const { error } = await sb.from('team_help_sessions').delete().eq('user_id', me.id);
    if (error) return toast("Impossible de quitter le mode aide : " + error.message);
    helpTeam = null;
    renderHelpBanner();
    await loadAll();
    toast('Retour à votre équipe');
  };

  window.saveVisit = async function (id, status) {
    const h = households.find(x => x.id === id);
    if (!h) return toast('Maison introuvable');
    const old = visitFor(id) || {};
    const shared = isSharedRoundHouse(h);
    const owner = shared ? null : teamForHouse(h);
    const helping = !shared && !!helpTeam && helpTeam === owner;

    const payload = {
      campaign_id: campaign.id,
      household_id: id,
      team_id: owner,
      original_team_id: owner,
      helper_mode: helping,
      status,
      calendars_count: +($('cal-' + id)?.value || 0),
      amount: +($('amt-' + id)?.value || 0),
      payment_method: $('pay-' + id)?.value || null,
      visit_comment: $('com-' + id)?.value || null,
      visited_by: me.id,
      visited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      client_updated_at: new Date().toISOString()
    };

    lastAction = { id, old: { ...old } };

    if (!navigator.onLine) {
      queue(payload);
      applyLocal(payload);
      return toast('Enregistré hors connexion', true);
    }

    const { data, error } = await sb.from('visits')
      .upsert(payload, { onConflict: 'campaign_id,household_id' })
      .select().single();

    if (error) {
      queue(payload);
      applyLocal(payload);
      setSync('Saisie en attente', true);
      return toast('Réseau faible : saisie conservée', true);
    }

    applyLocal(data);
    await sb.from('visit_presence').delete()
      .eq('household_id', id).eq('user_id', me.id);

    if (shared) toast('👥 Passage enregistré dans la tournée commune', true);
    else if (helping) {
      const team = teams.find(t => t.id === owner);
      toast(`🤝 Passage comptabilisé pour ${team?.name || "l'équipe aidée"}`, true);
    } else toast('Maison enregistrée', true);
  };

  window.quickStatus = function (id, status) {
    return window.saveVisit(id, status);
  };

  /* --------------------------------------------------
     IMPORT ADMIN : MOULET-MARCENAT = TOURNÉE COMMUNE
     Moulet-Marcenat est recherché dans les adresses de Volvic.
     Aucune équipe n'est attribuée aux rues importées.
  -------------------------------------------------- */

  function selectedImportCity() {
    return cities.find(c => c.id === $('importCity')?.value);
  }

  function sharedSearchText(a) {
    return [
      a.locality, a.context, a.name, a.label, a.street, a.city
    ].filter(Boolean).join(' ').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function isMouletMarcenatAddress(a) {
    const txt = sharedSearchText(a);
    return txt.includes('moulet') || txt.includes('marcenat');
  }

  function updateSharedImportUI() {
    const city = selectedImportCity();
    const shared = city?.shared_round === true;
    const teamSelect = $('assignTeam');
    const assignBtn = $('assignChecked');
    const wholeBtn = $('assignWholeCity');

    if (teamSelect) teamSelect.style.display = shared ? 'none' : '';
    if (wholeBtn) wholeBtn.style.display = shared ? 'none' : '';

    if (assignBtn) {
      assignBtn.textContent = shared
        ? '👥 Ajouter les rues cochées à la tournée commune'
        : 'Attribuer les rues cochées';
    }
  }

  if ($('importCity')) {
    $('importCity').addEventListener('change', () => {
      imported = [];
      if ($('streetImport')) $('streetImport').innerHTML = '';
      updateSharedImportUI();
    });
  }

  if ($('loadAddresses')) {
    $('loadAddresses').onclick = async () => {
      const city = selectedImportCity();
      if (!city) return;

      toast('Recherche des adresses…');

      const searchName = city.shared_round ? 'Volvic' : city.name;
      const { data, error } = await sb.functions.invoke('import-ban-addresses', {
        body: { q: searchName, postcode: city.postal_code }
      });

      if (error) return toast('Import impossible : ' + error.message);

      const all = data?.items || [];
      imported = city.shared_round
        ? all.filter(isMouletMarcenatAddress).map(a => {
            const sourceLocality = String(a.locality || a.context || '').trim();
            const streetText = String(a.street || a.name || a.label || '').normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const localityText = sourceLocality.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '').toLowerCase();

            let zone = '';
            if (streetText.includes('marcenat')) zone = 'Marcenat';
            else if (streetText.includes('moulet')) zone = 'Moulet';
            else if (localityText.includes('marcenat') && !localityText.includes('moulet')) zone = 'Marcenat';
            else if (localityText.includes('moulet') && !localityText.includes('marcenat')) zone = 'Moulet';

            return { ...a, _sourceLocality: sourceLocality, locality: zone || sourceLocality };
          })
        : all;

      renderImportedAddresses(city);

      if (city.shared_round && !imported.length) {
        toast('Aucune adresse Moulet-Marcenat détectée dans les données reçues');
      } else {
        toast(`${imported.length} adresse(s) trouvée(s)`);
      }

      updateSharedImportUI();
    };
  }

  if ($('assignChecked')) {
    $('assignChecked').onclick = async () => {
      const city = selectedImportCity();
      const checks = [...document.querySelectorAll('.streetCheck:checked')];

      if (!city || !checks.length) return toast('Coche au moins une rue');

      /* Pour une tournée normale, on conserve le fonctionnement app.js. */
      if (!city.shared_round) {
        const team = $('assignTeam').value;
        if (!team) return toast('Choisis une équipe');

        let sec = sectors.find(s => s.city_id === city.id);
        if (!sec) {
          const r = await sb.from('sectors')
            .insert({ city_id: city.id, name: city.name, active: true })
            .select().single();
          if (r.error) return toast(r.error.message);
          sec = r.data;
          sectors.push(sec);
        }

        let added = 0, skipped = 0;
        for (const check of checks) {
          const name = check.value;
          const locality = check.dataset.locality || city.name;
          let st = streets.find(s =>
            s.city_id === city.id &&
            normImport(s.name) === normImport(name) &&
            normImport(s.locality || '') === normImport(locality)
          );

          if (!st) {
            const r = await sb.from('streets')
              .insert({ city_id: city.id, name, locality, active: true })
              .select().single();
            if (r.error) { toast('Rue non créée : ' + r.error.message); continue; }
            st = r.data;
            streets.push(st);
          }

          await sb.from('team_streets').delete().eq('street_id', st.id);
          const tr = await sb.from('team_streets')
            .insert({ team_id: team, street_id: st.id });
          if (tr.error) { toast('Attribution impossible : ' + tr.error.message); continue; }

          const ads = imported.filter(a =>
            normImport(importStreetName(a)) === normImport(name) &&
            normImport(importLocality(a, city)) === normImport(locality)
          );

          const seen = new Set();
          for (const a of ads) {
            const houseNumber = importHouseNumber(a);
            const key = addressIdentity(importCityName(a, city), locality, name, houseNumber);
            if (seen.has(key)) { skipped++; continue; }
            seen.add(key);

            const exists = households.some(h =>
              addressIdentity(h.city_name || '', h.locality || '', h.street || '', h.house_number || '') === key
            );
            if (exists) { skipped++; continue; }

            const r = await sb.from('households').insert({
              sector_id: sec.id,
              street_id: st.id,
              house_number: houseNumber,
              street: name,
              locality,
              postal_code: a.postcode || city.postal_code,
              city_name: a.city || city.name,
              latitude: a.lat,
              longitude: a.lon,
              active: true
            });
            if (!r.error) added++;
          }
        }

        toast(`${added} maison(s) ajoutée(s) · ${skipped} doublon(s) évité(s)`);
        await loadAll();
        return;
      }

      /* Tournée commune : secteur Moulet-Marcenat, sans team_streets. */
      let sec = sectors.find(s => s.city_id === city.id);
      if (!sec) {
        const r = await sb.from('sectors')
          .insert({ city_id: city.id, name: 'Moulet-Marcenat', active: true })
          .select().single();
        if (r.error) return toast(r.error.message);
        sec = r.data;
        sectors.push(sec);
      }

      let added = 0, skipped = 0;

      for (const check of checks) {
        const name = check.value;
        const locality = check.dataset.locality || 'Moulet-Marcenat';

        let st = streets.find(s =>
          s.city_id === city.id &&
          normImport(s.name) === normImport(name) &&
          normImport(s.locality || '') === normImport(locality)
        );

        if (!st) {
          const r = await sb.from('streets')
            .insert({ city_id: city.id, name, locality, active: true })
            .select().single();
          if (r.error) { toast('Rue non créée : ' + r.error.message); continue; }
          st = r.data;
          streets.push(st);
        }

        /* Sécurité : une rue commune ne doit appartenir à aucune équipe. */
        await sb.from('team_streets').delete().eq('street_id', st.id);

        const ads = imported.filter(a =>
          normImport(importStreetName(a)) === normImport(name) &&
          normImport(importLocality(a, city)) === normImport(locality)
        );

        const seen = new Set();

        for (const a of ads) {
          const houseNumber = importHouseNumber(a);
          const actualCity = a.city || 'Volvic';
          const key = addressIdentity(actualCity, locality, name, houseNumber);

          if (seen.has(key)) { skipped++; continue; }
          seen.add(key);

          const exists = households.some(h =>
            addressIdentity(h.city_name || '', h.locality || '', h.street || '', h.house_number || '') === key
          );
          if (exists) { skipped++; continue; }

          const r = await sb.from('households').insert({
            sector_id: sec.id,
            street_id: st.id,
            house_number: houseNumber,
            street: name,
            locality,
            postal_code: a.postcode || city.postal_code,
            city_name: actualCity,
            latitude: a.lat,
            longitude: a.lon,
            permanent_note: (a._sourceLocality && normImport(a._sourceLocality) !== normImport(locality))
              ? `Lieu-dit : ${a._sourceLocality}`
              : null,
            active: true
          });

          if (!r.error) added++;
          else console.warn('Maison non créée :', r.error.message);
        }
      }

      toast(`👥 ${added} maison(s) ajoutée(s) à la tournée commune · ${skipped} doublon(s) évité(s)`);
      await loadAll();
    };
  }

  setTimeout(() => {
    restoreHelpSession();
    updateSharedImportUI();
  }, 1000);

  setInterval(restoreHelpSession, 60000);
})();



/* NAVIGATION PERSISTANTE V2 — iOS + Android */
(() => {
  const K='tc_last_page', F='tc_last_filters';
  const pages=['home','tour','map','admin','settings'];

  const current=()=>pages.find(n=>{
    const e=document.getElementById('page-'+n);
    return e&&!e.classList.contains('hidden');
  });

  function saveFilters(){
    const s={};
    ['teamView','sectorSelect','filterStatus','searchHouse','importCity'].forEach(id=>{
      const e=document.getElementById(id); if(e)s[id]=e.value;
    });
    localStorage.setItem(F,JSON.stringify(s));
  }

  function restoreFilters(){
    let s={}; try{s=JSON.parse(localStorage.getItem(F)||'{}')}catch(_){}
    ['teamView','sectorSelect','filterStatus','importCity'].forEach(id=>{
      const e=document.getElementById(id);
      if(e&&s[id]!=null&&Array.from(e.options||[]).some(o=>o.value===s[id]))e.value=s[id];
    });
    const q=document.getElementById('searchHouse'); if(q&&s.searchHouse!=null)q.value=s.searchHouse;
    try{renderHouses()}catch(_){}
    try{updateSharedImportUI()}catch(_){}
  }

  function install(){
    try{
      if(typeof page!=='function'||page.__persist)return;
      const original=page;
      const wrapped=function(n){if(pages.includes(n))localStorage.setItem(K,n);return original(n)};
      wrapped.__persist=true; page=wrapped; window.page=wrapped;
    }catch(_){}
  }

  function restore(){
    install();
    const n=localStorage.getItem(K);
    if(!pages.includes(n))return;
    try{
      if(typeof me!=='undefined'&&!me)return;
      if(n==='admin'&&typeof me!=='undefined'&&me?.role!=='admin')return;
      page(n); restoreFilters();
    }catch(_){}
  }

  document.addEventListener('pointerdown',e=>{
    const t=e.target.closest?.('[data-page]');
    if(t?.dataset.page)localStorage.setItem(K,t.dataset.page);
    if(e.target.closest?.('.bigstart'))localStorage.setItem(K,'tour');
  },true);

  document.addEventListener('change',e=>{
    if(['teamView','sectorSelect','filterStatus','importCity'].includes(e.target?.id))saveFilters();
  },true);
  document.addEventListener('input',e=>{if(e.target?.id==='searchHouse')saveFilters()},true);

  function save(){
    const n=current(); if(n)localStorage.setItem(K,n);
    saveFilters();
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden')save();
    else [0,100,300,700,1200,2000].forEach(ms=>setTimeout(restore,ms));
  });
  window.addEventListener('pagehide',save,true);
  window.addEventListener('pageshow',()=>[0,100,300,700,1200,2000].forEach(ms=>setTimeout(restore,ms)),true);

  [50,150,300,600,1000,1500,2200,3200,4500].forEach(ms=>setTimeout(restore,ms));
})();
