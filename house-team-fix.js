/* Correctif affectation foyer -> équipe — Amicale SP Volvic */
(function(){
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function teamForSectorId(sectorId){
    const s=(sectors||[]).find(x=>x.id===sectorId);
    if(!s)return null;
    const sn=norm(s.name);
    if(sn.includes('moulet')&&sn.includes('marcenat'))return null;
    const direct=(teams||[]).find(t=>norm(t.name)===sn);
    if(direct)return direct.id;
    const m=sn.match(/equipe\s*(\d+)/);
    if(m){
      const t=(teams||[]).find(x=>norm(x.name).match(new RegExp('equipe\\s*'+m[1]+'(?:\\D|$)')));
      if(t)return t.id;
    }
    return null;
  }
  window.teamForHouse=function(h){
    if(!h)return null;
    const bySector=teamForSectorId(h.sector_id);
    if(bySector)return bySector;
    const s=(sectors||[]).find(x=>x.id===h.sector_id);
    const sn=norm(s?.name);
    if(sn.includes('moulet')&&sn.includes('marcenat'))return null;
    const links=(teamStreets||[]).filter(ts=>ts.street_id===h.street_id);
    if(links.length===1)return links[0].team_id;
    return null;
  };
  setTimeout(()=>{try{window.renderHouses?.();window.renderStats?.();window.renderMap?.();}catch(_){}},300);
})();
