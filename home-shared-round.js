/* Accueil séparé : équipes / tournée commune Moulet-Marcenat */
(function(){
  const E=id=>document.getElementById(id);
  const visitable=h=>h && h.active!==false && h.is_visitable!==false && h.dwelling_type!=='immeuble';
  const money=n=>(+n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
  const safe=s=>(typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])));

  function sharedCityIds(){
    return new Set((cities||[]).filter(c=>c.shared_round).map(c=>c.id));
  }
  function sharedSectorIds(){
    const ids=sharedCityIds();
    return new Set((sectors||[]).filter(s=>ids.has(s.city_id)).map(s=>s.id));
  }
  function isShared(h){ return sharedSectorIds().has(h.sector_id); }
  function stats(list){
    const ids=new Set(list.map(h=>h.id));
    const vv=(visits||[]).filter(v=>ids.has(v.household_id));
    let done=0,redo=0,cal=0,amt=0,pay={};
    vv.forEach(v=>{
      if(v.status==='fait'){ done++; cal+=+v.calendars_count||0; amt+=+v.amount||0; if(v.payment_method)pay[v.payment_method]=(pay[v.payment_method]||0)+(+v.amount||0); }
      if(['absent','a_repasser'].includes(v.status))redo++;
    });
    const remaining=list.filter(h=>(visitFor(h.id)?.status||'a_faire')==='a_faire').length;
    const refus=list.filter(h=>visitFor(h.id)?.status==='refus').length;
    const resolved=done+refus;
    return {total:list.length,done,redo,remaining,refus,resolved,cal,amt,pay};
  }
  function statGrid(s){
    return `<div class="grid g4">
      <div class="stat"><b>${s.total}</b>Foyers</div>
      <div class="stat"><b>${s.done}</b>Faits</div>
      <div class="stat"><b>${s.redo}</b>À repasser</div>
      <div class="stat"><b>${s.remaining}</b>Restants</div>
    </div>`;
  }
  function finance(s){
    const p=Object.entries(s.pay).map(([k,v])=>`${safe(k)}: ${money(v)}`).join(' · ')||'Aucun encaissement';
    return `<div class="grid g2"><div class="stat"><b>${s.cal}</b>Calendriers</div><div class="stat"><b>${money(s.amt)}</b>Dons</div></div><div class="muted">${p}</div>`;
  }
  function ensureBlocks(){
    const home=E('page-home'); if(!home)return null;
    let box=E('homeSeparatedRounds');
    if(!box){
      box=document.createElement('div'); box.id='homeSeparatedRounds';
      const progress=E('teamProgress')?.closest('.card');
      progress?.parentNode?.insertBefore(box,progress);
    }
    return box;
  }

  const previous=window.renderStats;
  window.renderStats=function(){
    if(typeof previous==='function') previous();

    const all=(households||[]).filter(visitable);
    const shared=all.filter(isShared);
    const normal=all.filter(h=>!isShared(h));
    const ns=stats(normal), ss=stats(shared);

    /* Les compteurs principaux représentent uniquement les tournées d'équipes. */
    if(E('sTotal'))E('sTotal').textContent=ns.total;
    if(E('sDone'))E('sDone').textContent=ns.done;
    if(E('sRedo'))E('sRedo').textContent=ns.redo;
    if(E('sRemain'))E('sRemain').textContent=ns.remaining;
    if(E('sCalendars'))E('sCalendars').textContent=ns.cal;
    if(E('sAmount'))E('sAmount').textContent=money(ns.amt);
    if(E('paymentStats'))E('paymentStats').textContent=Object.entries(ns.pay).map(([k,v])=>`${k}: ${money(v)}`).join(' · ')||'Aucun encaissement';

    const box=ensureBlocks();
    if(box){
      box.innerHTML=`<div class="card"><div class="sectionTitle">👥 Moulet-Marcenat — tournée commune</div>
        ${statGrid(ss)}
        <div style="height:10px"></div>${finance(ss)}
        <div class="progress" style="margin-top:12px"><span style="width:${ss.total?Math.round(ss.resolved/ss.total*100):0}%"></span></div>
        <div class="muted" style="margin-top:5px">${ss.resolved}/${ss.total} foyer(s) terminé(s)</div>
      </div>`;
    }

    /* Progression équipes : refus = foyer résolu, sans le compter comme "fait". */
    if(E('teamProgress')) E('teamProgress').innerHTML=(teams||[]).map(t=>{
      const hs=normal.filter(h=>teamForHouse(h)===t.id);
      const done=hs.filter(h=>visitFor(h.id)?.status==='fait').length;
      const refus=hs.filter(h=>visitFor(h.id)?.status==='refus').length;
      const resolved=done+refus;
      const p=hs.length?Math.round(resolved/hs.length*100):0;
      return `<div class="street"><b>${safe(t.name)}</b> — ${resolved}/${hs.length} (${p} %)<div class="progress"><span style="width:${p}%"></span></div></div>`;
    }).join('')||'<span class="muted">Crée les équipes pour afficher leur progression.</span>';
  };

  window.addEventListener('load',()=>setTimeout(()=>window.renderStats?.(),1200));
})();