/* Amicale SP Volvic
   Extension : aide sécurisée + tournée commune
*/
(function () {

  function isSharedRoundHouse(h) {
    if (!h) return false;
    const sector = sectors.find(s => s.id === h.sector_id);
    const city = cities.find(c => c.id === sector?.city_id);
    return city?.shared_round === true;
  }

  // --------------------------------------------------
  // MAISONS VISIBLES
  // --------------------------------------------------

  window.visibleHouses = function () {
    if (me.role === 'admin' || me.role === 'responsable') {
      return households;
    }

    const ownTeams = myTeamIds();

    return households.filter(h => {
      const owner = teamForHouse(h);

      return (
        isSharedRoundHouse(h) ||
        ownTeams.includes(owner) ||
        (helpTeam && owner === helpTeam)
      );
    });
  };

  // --------------------------------------------------
  // AFFICHAGE DES MAISONS
  // --------------------------------------------------

  window.renderHouses = function () {
    if (!$('houses')) return;

    const sid = $('sectorSelect').value;
    const tid = $('teamView').value;
    const fs = $('filterStatus').value;
    const q = $('searchHouse').value.toLowerCase();

    let list = visibleHouses().filter(h => {
      if (sid && h.sector_id !== sid) return false;

      if (tid === '__shared__') {
        return isSharedRoundHouse(h);
      }

      if (tid && teamForHouse(h) !== tid) {
        return false;
      }

      return true;
    });

    list = list.filter(h => {
      const v = visitFor(h.id);
      const st = v?.status || 'a_faire';

      return (
        (!fs || st === fs) &&
        `${h.house_number || ''} ${h.street || ''} ${h.locality || ''} ${h.permanent_note || ''}`
          .toLowerCase()
          .includes(q)
      );
    });

    $('houses').innerHTML =
      list.map(h => houseHTML(h)).join('') ||
      '<div class="card muted">Aucun foyer correspondant.</div>';
  };

  // --------------------------------------------------
  // TOURNÉE COMMUNE DANS LE SÉLECTEUR
  // --------------------------------------------------

  const oldRenderFilters = window.renderFilters;

  window.renderFilters = function () {
    oldRenderFilters();

    const selector = $('teamView');

    if (
      selector &&
      cities.some(c => c.shared_round) &&
      !selector.querySelector('[value="__shared__"]')
    ) {
      const option = document.createElement('option');

      option.value = '__shared__';
      option.textContent = '👥 Moulet-Marcenat — tournée commune';

      selector.appendChild(option);
    }
  };

  // --------------------------------------------------
  // BANDEAU MODE AIDE
  // --------------------------------------------------

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
       <button class="btn alt" onclick="stopHelp()">
       Revenir à mon équipe
       </button>`;
  }

  // --------------------------------------------------
  // RÉCUPÉRATION SESSION AIDE
  // --------------------------------------------------

  async function restoreHelpSession() {
    if (!me?.id) return;

    const { data, error } = await sb
      .from('team_help_sessions')
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

  // --------------------------------------------------
  // BOUTON AIDER
  // --------------------------------------------------

  const helpButton = $('helpBtn');

  if (helpButton) {

    helpButton.onclick = async function () {

      const choices = teams.filter(
        t => !myTeamIds().includes(t.id)
      );

      if (!choices.length) {
        return toast('Aucune autre équipe disponible');
      }

      const names = choices
        .map((t, i) => `${i + 1}. ${t.name}`)
        .join('\n');

      const selected = Number(
        prompt(
          'Quelle équipe voulez-vous aider ?\n\n' + names
        )
      );

      if (!selected || !choices[selected - 1]) return;

      const team = choices[selected - 1];

      const now = new Date();

      const expires = new Date(
        Date.now() + 12 * 60 * 60 * 1000
      );

      const { error } = await sb
        .from('team_help_sessions')
        .upsert(
          {
            user_id: me.id,
            team_id: team.id,
            started_at: now.toISOString(),
            expires_at: expires.toISOString()
          },
          {
            onConflict: 'user_id'
          }
        );

      if (error) {
        return toast(
          "Impossible d'activer le mode aide : " +
          error.message
        );
      }

      helpTeam = team.id;

      renderHelpBanner();

      await loadAll();

      toast(`🤝 Vous aidez maintenant ${team.name}`);
    };
  }

  // --------------------------------------------------
  // QUITTER LE MODE AIDE
  // --------------------------------------------------

  window.stopHelp = async function () {

    const { error } = await sb
      .from('team_help_sessions')
      .delete()
      .eq('user_id', me.id);

    if (error) {
      return toast(
        "Impossible de quitter le mode aide : " +
        error.message
      );
    }

    helpTeam = null;

    renderHelpBanner();

    await loadAll();

    toast('Retour à votre équipe');
  };

  // --------------------------------------------------
  // ENREGISTREMENT D'UNE MAISON
  // --------------------------------------------------

  window.saveVisit = async function (id, status) {

    const h = households.find(x => x.id === id);

    if (!h) {
      return toast('Maison introuvable');
    }

    const old = visitFor(id) || {};

    const shared = isSharedRoundHouse(h);

    // Une tournée commune n'appartient à aucune équipe.
    const owner = shared ? null : teamForHouse(h);

    // En mode aide, l'équipe officielle reste propriétaire
    // du résultat.
    const helping =
      !shared &&
      !!helpTeam &&
      helpTeam === owner;

    const payload = {

      campaign_id: campaign.id,

      household_id: id,

      team_id: owner,

      original_team_id: owner,

      helper_mode: helping,

      status,

      calendars_count:
        +($('cal-' + id)?.value || 0),

      amount:
        +($('amt-' + id)?.value || 0),

      payment_method:
        $('pay-' + id)?.value || null,

      visit_comment:
        $('com-' + id)?.value || null,

      visited_by: me.id,

      visited_at:
        new Date().toISOString(),

      updated_at:
        new Date().toISOString(),

      client_updated_at:
        new Date().toISOString()
    };

    lastAction = {
      id,
      old: { ...old }
    };

    if (!navigator.onLine) {

      queue(payload);

      applyLocal(payload);

      return toast(
        'Enregistré hors connexion',
        true
      );
    }

    const { data, error } = await sb
      .from('visits')
      .upsert(
        payload,
        {
          onConflict:
            'campaign_id,household_id'
        }
      )
      .select()
      .single();

    if (error) {

      queue(payload);

      applyLocal(payload);

      setSync(
        'Saisie en attente',
        true
      );

      return toast(
        'Réseau faible : saisie conservée',
        true
      );
    }

    applyLocal(data);

    await sb
      .from('visit_presence')
      .delete()
      .eq('household_id', id)
      .eq('user_id', me.id);

    if (shared) {

      toast(
        '👥 Passage enregistré dans la tournée commune',
        true
      );

    } else if (helping) {

      const team =
        teams.find(t => t.id === owner);

      toast(
        `🤝 Passage comptabilisé pour ${team?.name || "l'équipe aidée"}`,
        true
      );

    } else {

      toast(
        'Maison enregistrée',
        true
      );
    }
  };

  // Les boutons rapides utilisent aussi
  // le nouvel enregistrement sécurisé.

  window.quickStatus = function (id, status) {
    return window.saveVisit(id, status);
  };

  // --------------------------------------------------
  // RESTAURATION AUTOMATIQUE
  // --------------------------------------------------

  setTimeout(
    restoreHelpSession,
    1000
  );

  // Vérification périodique :
  // permet notamment de détecter l'expiration des 12 h.

  setInterval(
    restoreHelpSession,
    60000
  );

})();
