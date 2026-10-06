/* Responsable de tournée V2 — séparation stricte tournée / tournée commune
   - Responsable : uniquement son équipe officielle en mode normal
   - Aider : uniquement équipe aidée
   - Moulet-Marcenat : uniquement via l'option tournée commune
   - Admin : inchangé
*/
(function(){
  function isTourLeader(){ return !!me && me.role === 'responsable'; }

  function isSharedHouse(h){
    const sector=(sectors||[]).find(s=>s.id===h?.sector_id);
    const city=(cities||[]).find(c=>c.id===sector?.city_id);
    return city?.shared_round===true;
  }

  function enforceLeaderSelector(){
    if(!isTourLeader()) return;
    const sel=document.getElementById('teamView');
    if(!sel || !Array.isArray(teams)) return;

    const wanted=[{value:'',text:'Mon équipe / mes secteurs'}];
    if(helpTeam){
      const t=teams.find(x=>x.id===helpTeam);
      if(t) wanted.push({value:t.id,text:'🤝 Aide — '+t.name});
    }
    if(Array.isArray(cities) && cities.some(c=>c.shared_round===true)){
      wanted.push({value:'__shared__',text:'👥 Moulet-Marcenat — tournée commune'});
    }

    const expected=wanted.map(x=>x.value+'|'+x.text).join('||');
    const current=[...sel.options].map(x=>x.value+'|'+x.textContent).join('||');
    if(current!==expected){
      const old=sel.value;
      sel.innerHTML=wanted.map(x=>`<option value="${x.value}">${x.text}</option>`).join('');
      sel.value=wanted.some(x=>x.value===old) ? old : (helpTeam||'');
    }
  }

  function patchVisible(){
    if(typeof window.visibleHouses!=='function' || window.visibleHouses.__tourLeaderV2) return;
    const original=window.visibleHouses;

    const wrapped=function(){
      if(!isTourLeader()) return original();

      // Tournée commune est rendue séparément par shared-tour-display-fix-v2.
      // visibleHouses ne doit donc jamais mélanger ses foyers avec l'équipe officielle.
      const own=(typeof myTeamIds==='function' ? myTeamIds() : []);
      const selected=document.getElementById('teamView')?.value||'';

      if(selected==='__shared__') return [];

      if(helpTeam && selected===helpTeam){
        return households.filter(h=>!isSharedHouse(h) && teamForHouse(h)===helpTeam);
      }

      return households.filter(h=>!isSharedHouse(h) && own.includes(teamForHouse(h)));
    };
    wrapped.__tourLeaderV2=true;
    window.visibleHouses=wrapped;
  }

  setInterval(()=>{
    if(!me) return;
    patchVisible();
    enforceLeaderSelector();
  },250);
})();