/* Menu équipes V3 — Amicale SP Volvic
But : les autres équipes ne doivent même pas apparaître tant que 🤝 Aider n'est pas activé.
Admin : accès libre.
Responsable/utilisateur : Ma tournée + tournée commune ; en aide : équipe aidée.
Aucune modification des données ou de la carte.
*/
(function(){
  function isAdmin(){ return !!window.me && me.role === 'admin'; }

  function allowedOptions(){
    const out=[{value:'',text:'Mon équipe / mes secteurs'}];
    if(window.helpTeam){
      const t=(window.teams||[]).find(x=>x.id===helpTeam);
      if(t) out.push({value:t.id,text:'🤝 Aide — '+t.name});
    }
    if((window.cities||[]).some(c=>c.shared_round===true)){
      out.push({value:'__shared__',text:'👥 Moulet-Marcenat — tournée commune'});
    }
    return out;
  }

  function lockMenu(){
    const sel=document.getElementById('teamView');
    if(!sel || !window.me || !Array.isArray(window.teams)) return;
    if(isAdmin()) return;

    const opts=allowedOptions();
    const allowed=new Set(opts.map(o=>o.value));
    const old=sel.value;
    const sig=opts.map(o=>o.value+'|'+o.text).join('||');

    // Important: renderFilters() peut recréer les 4 équipes.
    // On compare donc aussi le contenu réel du select, pas seulement notre signature.
    const current=[...sel.options].map(o=>o.value+'|'+o.textContent).join('||');
    if(current!==sig){
      sel.innerHTML=opts.map(o=>`<option value="${o.value}">${o.text}</option>`).join('');
      sel.value=allowed.has(old) ? old : (helpTeam && allowed.has(helpTeam) ? helpTeam : '');
    }

    if(!allowed.has(sel.value)){
      sel.value=helpTeam && allowed.has(helpTeam) ? helpTeam : '';
      if(typeof window.renderHouses==='function') window.renderHouses();
    }
  }

  document.addEventListener('change',function(e){
    if(e.target?.id!=='teamView' || isAdmin()) return;
    lockMenu();
  },true);

  // Après loadAll/renderFilters, changement de page, retour d'arrière-plan et mode Aider.
  setInterval(lockMenu,250);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) setTimeout(lockMenu,0); });
  window.addEventListener('pageshow',()=>setTimeout(lockMenu,0));
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#helpBtn,[data-page="tour"]')){
      setTimeout(lockMenu,0); setTimeout(lockMenu,250); setTimeout(lockMenu,700);
    }
  });
})();