/* Correctif UX immeubles + gestion villes/équipes — Amicale SP Volvic */
(function(){
  const E=id=>document.getElementById(id);

  function childrenOf(h){
    return households.filter(x=>x.active!==false && x.parent_building_id===h.id && x.dwelling_type==='appartement');
  }

  /* Enrichit la carte immeuble : pas de saisie sur le parent + progression des logements. */
  const prevHouseHTML = window.houseHTML;
  if (typeof prevHouseHTML === 'function') {
    window.houseHTML = function(h){
      let html = prevHouseHTML(h);
      if(h.dwelling_type==='immeuble' && !h.unit_label){
        const kids=childrenOf(h);
        const done=kids.filter(x=>visitFor(x.id)?.status==='fait').length;
        const redo=kids.filter(x=>['absent','a_repasser'].includes(visitFor(x.id)?.status)).length;
        const remain=Math.max(0,kids.length-done);
        html=html.replace('class="house ', 'class="house building-parent ');
        const info=`<div class="card" style="margin:10px 0;padding:10px">
          <b>🏢 Suivi des logements</b><br>
          <span class="pill">Total : ${kids.length}</span>
          <span class="pill">✅ Faits : ${done}</span>
          <span class="pill">🔄 À revoir : ${redo}</span>
          <span class="pill">⏳ Restants : ${remain}</span>
          <div class="muted" style="margin-top:6px">Les saisies se font sur les appartements affichés juste dessous.</div>
        </div>`;
        html=html.replace('<div class="muted">Cette ligne représente l\'immeuble.', info+'<div class="muted">Cette ligne représente l\'immeuble.');
        /* Un ancien passage de la maison peut exister : on masque toute saisie financière du parent. */
        html=html.replace(/<div id="done-[^"]+" class="[^"]*">[\s\S]*?<\/div><\/div>$/, '</div>');
      }
      return html;
    };
  }

  /* Boutons de suppression explicites, indépendants du rendu en "pastilles" de app.js. */
  window.renderDeleteManagement = function(){
    if(me?.role!=='admin') return;

    const cb=E('citiesAdmin');
    if(cb){
      let box=E('cityDeleteManagement');
      if(!box){ box=document.createElement('div'); box.id='cityDeleteManagement'; cb.after(box); }
      box.innerHTML=cities.map(c=>`
        <div class="street row">
          <div><b>${esc(c.name)}</b> <span class="muted">${esc(c.postal_code||'')}</span></div>
          <button class="btn gray" onclick="disableCity('${c.id}')">🗑️ Supprimer</button>
        </div>`).join('');
    }

    const tb=E('teamsAdmin');
    if(tb){
      let box=E('teamDeleteManagement');
      if(!box){ box=document.createElement('div'); box.id='teamDeleteManagement'; tb.after(box); }
      box.innerHTML=teams.map(t=>`
        <div class="street row">
          <div><b>${esc(t.name)}</b></div>
          <button class="btn gray" onclick="disableTeam('${t.id}')">🗑️ Supprimer</button>
        </div>`).join('');
    }
  };

  const oldDisableCity=window.disableCity;
  if(typeof oldDisableCity==='function') window.disableCity=async function(id){ await oldDisableCity(id); setTimeout(renderDeleteManagement,100); };
  const oldDisableTeam=window.disableTeam;
  if(typeof oldDisableTeam==='function') window.disableTeam=async function(id){ await oldDisableTeam(id); setTimeout(renderDeleteManagement,100); };

  /* Rafraîchit les panneaux quand on ouvre l'admin ou après chargement des données. */
  document.addEventListener('click',e=>{
    if(e.target?.dataset?.page==='admin') setTimeout(renderDeleteManagement,200);
  });
  window.addEventListener('load',()=>setTimeout(renderDeleteManagement,1200));
  setInterval(()=>{ if(me?.role==='admin' && !E('page-admin')?.classList.contains('hidden')) renderDeleteManagement(); },2500);
})();
