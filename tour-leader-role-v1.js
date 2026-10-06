/* Responsable de tournée V1
   Le rôle "responsable" n'est plus un accès global :
   - il est limité aux équipes dont il est membre/chef dans team_members ;
   - il peut utiliser Aider comme un utilisateur normal ;
   - admin garde l'accès global.
   Aucun changement carte / visites / hors connexion.
*/
(function(){
  function isAdmin(){ return !!me && me.role === 'admin'; }
  function isTourLeader(){ return !!me && me.role === 'responsable'; }

  // Corrige le verrou V1 qui considérait responsable comme privilégié.
  function enforceLeaderSelector(){
    if(!isTourLeader()) return;
    const sel=document.getElementById('teamView');
    if(!sel || !Array.isArray(teams)) return;

    const own=(typeof myTeamIds==='function' ? myTeamIds() : []);
    const wanted=[{value:'',text:'Ma tournée / mes secteurs'}];

    if(helpTeam){
      const t=teams.find(x=>x.id===helpTeam);
      if(t) wanted.push({value:t.id,text:'🤝 Aide — '+t.name});
    }
    if(Array.isArray(cities) && cities.some(c=>c.shared_round===true))
      wanted.push({value:'__shared__',text:'👥 Moulet-Marcenat — tournée commune'});

    const sig=wanted.map(x=>x.value+'|'+x.text).join('||');
    if(sel.dataset.tourLeaderSig!==sig){
      const old=sel.value;
      sel.innerHTML=wanted.map(x=>`<option value="${x.value}">${x.text}</option>`).join('');
      sel.dataset.tourLeaderSig=sig;
      sel.value=wanted.some(x=>x.value===old) ? old : (helpTeam||'');
    }
    const allowed=new Set(wanted.map(x=>x.value));
    if(!allowed.has(sel.value)) sel.value=helpTeam&&allowed.has(helpTeam)?helpTeam:'';
  }

  // Pour le rendu des maisons, responsable = mêmes limites qu'utilisateur.
  function patchVisible(){
    if(typeof window.visibleHouses!=='function' || window.visibleHouses.__tourLeaderPatched) return;
    const original=window.visibleHouses;
    const wrapped=function(){
      if(!isTourLeader()) return original();
      const own=(typeof myTeamIds==='function'?myTeamIds():[]);
      return households.filter(h=>{
        const sector=sectors.find(s=>s.id===h.sector_id);
        const city=cities.find(c=>c.id===sector?.city_id);
        const shared=city?.shared_round===true;
        const owner=teamForHouse(h);
        return shared || own.includes(owner) || (!!helpTeam && owner===helpTeam);
      });
    };
    wrapped.__tourLeaderPatched=true;
    window.visibleHouses=wrapped;
  }

  setInterval(()=>{
    if(!me)return;
    patchVisible();
    enforceLeaderSelector();
  },350);
})();