/* Amicale SP Volvic — suppression sûre villes / équipes : désactivation avec historique conservé. */
(function(){
  const byId=x=>document.getElementById(x);
  window.disableCity=async function(cityId){
    if(me?.role!=='admin') return toast('Réservé à l’administrateur');
    const city=cities.find(c=>c.id===cityId); if(!city) return toast('Ville introuvable');
    if(!confirm(`Supprimer « ${city.name} » de l’application ?\n\nElle disparaîtra des listes mais son historique sera conservé.`)) return;
    const {error}=await sb.from('cities').update({active:false}).eq('id',cityId);
    if(error) return toast(error.message); await loadAll(); toast(`🗑️ ${city.name} supprimée des listes`);
  };
  window.disableTeam=async function(teamId){
    if(me?.role!=='admin') return toast('Réservé à l’administrateur');
    const team=teams.find(t=>t.id===teamId); if(!team) return toast('Équipe introuvable');
    if(!confirm(`Supprimer « ${team.name} » de la campagne ?\n\nElle disparaîtra des listes mais son historique sera conservé.`)) return;
    const {error}=await sb.from('teams').update({active:false}).eq('id',teamId);
    if(error) return toast(error.message); await loadAll(); toast(`🗑️ ${team.name} supprimée des listes`);
  };
  function addButtons(){
    if(me?.role!=='admin') return;
    const cb=byId('citiesAdmin');
    if(cb) cb.querySelectorAll('.street').forEach(row=>{
      if(row.querySelector('.delete-city-btn'))return;
      const txt=row.textContent.toLowerCase(), c=cities.find(x=>txt.includes(String(x.name||'').toLowerCase()));
      if(!c)return;
      const b=document.createElement('button'); b.className='btn gray delete-city-btn'; b.textContent='🗑️ Supprimer';
      b.onclick=()=>disableCity(c.id); row.appendChild(b);
    });
    const tb=byId('teamsAdmin');
    if(tb) tb.querySelectorAll('.street').forEach(row=>{
      if(row.querySelector('.delete-team-btn'))return;
      const txt=row.textContent.toLowerCase(), t=teams.find(x=>txt.includes(String(x.name||'').toLowerCase()));
      if(!t)return;
      const b=document.createElement('button'); b.className='btn gray delete-team-btn'; b.textContent='🗑️ Supprimer';
      b.onclick=()=>disableTeam(t.id); row.appendChild(b);
    });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const p=byId('page-admin');
    if(p)new MutationObserver(addButtons).observe(p,{childList:true,subtree:true});
    setTimeout(addButtons,500);
  });
  window.addEventListener('load',()=>setTimeout(addButtons,1000));
})();
