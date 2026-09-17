/* Correctif affichage tournée commune Moulet-Marcenat */
(function(){
  const E=id=>document.getElementById(id);
  function visitable(h){return h && h.active!==false && h.is_visitable!==false && h.dwelling_type!=='immeuble';}
  function shared(h){
    const s=(sectors||[]).find(x=>x.id===h?.sector_id);
    const c=(cities||[]).find(x=>x.id===s?.city_id);
    return c?.shared_round===true;
  }
  function renderShared(){
    const tid=E('teamView')?.value;
    if(tid!=='__shared__') return false;
    const sid=E('sectorSelect')?.value||'';
    const fs=E('filterStatus')?.value||'';
    const q=(E('searchHouse')?.value||'').trim().toLowerCase();

    let list=(households||[]).filter(h=>visitable(h)&&shared(h));
    if(sid) list=list.filter(h=>h.sector_id===sid);
    list=list.filter(h=>{
      const st=visitFor(h.id)?.status||'a_faire';
      if(fs && st!==fs)return false;
      const txt=`${h.house_number||''} ${h.street||''} ${h.locality||''} ${h.unit_label||''} ${h.building_name||''} ${h.permanent_note||''}`.toLowerCase();
      return !q||txt.includes(q);
    });
    list.sort((a,b)=>{
      const ka=`${a.locality||''}|${a.street||''}|${a.house_number||''}|${a.unit_label||''}`;
      const kb=`${b.locality||''}|${b.street||''}|${b.house_number||''}|${b.unit_label||''}`;
      return ka.localeCompare(kb,'fr',{numeric:true});
    });
    if(E('houses')) E('houses').innerHTML=list.map(h=>window.houseHTML(h)).join('')||
      '<div class="card muted">Aucun foyer correspondant.</div>';
    return true;
  }

  const previous=window.renderHouses;
  window.renderHouses=function(){
    if(renderShared()) return;
    return typeof previous==='function'?previous():undefined;
  };

  ['teamView','sectorSelect','filterStatus'].forEach(id=>{
    E(id)?.addEventListener('change',()=>setTimeout(()=>window.renderHouses(),0));
  });
  E('searchHouse')?.addEventListener('input',()=>setTimeout(()=>window.renderHouses(),0));
})();