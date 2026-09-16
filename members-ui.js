// Interface simplifiée des comptes — Amicale SP Volvic
(() => {
  function initMemberUI() {
    const auth = document.getElementById('auth');
    if (auth && !document.getElementById('signupName')) {
      const email = document.getElementById('email');
      const name = document.createElement('input');
      name.id = 'signupName';
      name.placeholder = 'Prénom et nom';
      name.autocomplete = 'name';
      name.style.marginBottom = '10px';
      email.parentNode.insertBefore(name, email);

      const info = document.createElement('p');
      info.className = 'muted';
      info.innerHTML = 'Première connexion ? Renseignez votre nom, votre e-mail et choisissez un mot de passe, puis appuyez sur <b>Créer mon compte</b>.';
      auth.insertBefore(info, document.getElementById('authMsg'));
    }

    const signup = document.getElementById('signupBtn');
    if (signup) {
      signup.onclick = async () => {
        const fullName = document.getElementById('signupName')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value || '';
        const msg = document.getElementById('authMsg');

        if (!fullName) {
          msg.textContent = 'Indique ton prénom et ton nom.';
          return;
        }
        if (!email) {
          msg.textContent = 'Indique ton adresse e-mail.';
          return;
        }
        if (password.length < 6) {
          msg.textContent = 'Choisis un mot de passe d’au moins 6 caractères.';
          return;
        }

        msg.textContent = 'Création du compte…';

        const { error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (error) {
          msg.textContent = error.message;
          return;
        }

        msg.innerHTML =
          '✅ <b>Compte créé.</b><br>Ton compte est maintenant en attente de validation par un administrateur.';
      };
    }
  }

  const oldRenderAdmin = window.renderAdmin;

  async function renderSimpleMembers() {
    if (!me || me.role !== 'admin' || !document.getElementById('profiles')) return;

    const { data: profiles, error } = await sb
      .from('profiles')
      .select('*')
      .order('active', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return;

    const box = document.getElementById('profiles');

    box.innerHTML = (profiles || []).map(p => {
      const membership = members.find(m => m.user_id === p.id);
      const team = teams.find(t => t.id === membership?.team_id);

      const state = !p.active
        ? '🟠 En attente d’activation'
        : `🟢 Actif${team ? ' — ' + esc(team.name) : ''}`;

      return `
        <div class="street">
          <b>${esc(p.full_name || p.email || 'Nouveau membre')}</b>
          <div class="muted">${esc(p.email || '')}</div>
          <div style="margin:7px 0"><b>${state}</b></div>

          ${p.id === me.id ? '<span class="pill">Administrateur actuel</span>' : `
            <div class="grid g2">
              <select id="role-${p.id}">
                <option value="amicaliste" ${p.role === 'amicaliste' ? 'selected' : ''}>Amicaliste</option>
                <option value="responsable" ${p.role === 'responsable' ? 'selected' : ''}>Responsable d’équipe</option>
              </select>

              <select id="team-${p.id}">
                <option value="">Choisir une équipe</option>
                ${teams.map(t =>
                  `<option value="${t.id}" ${membership?.team_id === t.id ? 'selected' : ''}>${esc(t.name)}</option>`
                ).join('')}
              </select>
            </div>

            <br>

            <div class="row">
              <button class="btn green"
                onclick="activateMemberSimple('${p.id}')">
                ${p.active ? '💾 Enregistrer' : '✅ Affecter et activer'}
              </button>

              ${p.active
                ? `<button class="btn gray" onclick="disableMemberSimple('${p.id}')">Désactiver</button>`
                : ''}
            </div>
          `}
        </div>
      `;
    }).join('') || '<p class="muted">Aucun membre.</p>';
  }

  window.activateMemberSimple = async userId => {
    const role = document.getElementById('role-' + userId)?.value || 'amicaliste';
    const teamId = document.getElementById('team-' + userId)?.value;

    if (!teamId) {
      toast('Choisis d’abord une équipe.');
      return;
    }

    const { error: profileError } = await sb
      .from('profiles')
      .update({ role, active: true })
      .eq('id', userId);

    if (profileError) {
      toast(profileError.message);
      return;
    }

    const { error: teamError } = await sb.rpc('assign_member_to_team', {
      p_user_id: userId,
      p_team_id: teamId
    });

    if (teamError) {
      toast(teamError.message);
      return;
    }

    toast('✅ Membre affecté et activé');
    await loadAll();
  };

  window.disableMemberSimple = async userId => {
    if (!confirm('Désactiver ce membre ? Il ne pourra plus accéder aux tournées.')) return;

    const { error } = await sb
      .from('profiles')
      .update({ active: false })
      .eq('id', userId);

    if (error) {
      toast(error.message);
      return;
    }

    toast('Membre désactivé');
    await loadAll();
  };

  if (typeof oldRenderAdmin === 'function') {
    window.renderAdmin = async function(...args) {
      const result = await oldRenderAdmin.apply(this, args);
      await renderSimpleMembers();
      return result;
    };
  }

  setTimeout(initMemberUI, 300);
  setTimeout(renderSimpleMembers, 1200);
})();
