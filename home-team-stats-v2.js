/* Accueil V2 — statistiques par équipe + tournée commune complète
   Admin : vision globale équipes + Moulet séparé.
   Utilisateur / responsable : uniquement son équipe + Moulet séparé.
   Chargé après complete-address-loader pour travailler sur la liste exhaustive.
*/
(function(){
  const E=id=>document.getElementById(id);
  const visitable=h=>h && h.active!==false && h.is_visitable!==false && h.dwelling_type!=='immeuble';
  const money=n=>(+n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});

  function sharedSectorIds(){
    const cityIds=new Set((cities||[]).filter(c=>c.shared_round===true).map(c=>c.id));
    return new Set((sectors||[]).filter(s=>cityIds.has(s.city_id)).map(s=>s.id));
  }
  function isShared(h){ return sharedSectorIds().has(h?.sector_id); }

  function stats(list){
    let fait=0, redo=0, refus=0, rest=0, cal=0, amt=0, pay={};
    for(const h of list){
      const v=visitFor(h.id), st=v?.status||'a_faire';
      if(st==='fait'){
        fait++;
        cal += +v?.calendars_count||0;
        amt += +v?.amount||0;
        if(v?.payment_method) pay[v.payment_method]=(pay[v.payment_method]||0)+(+v.amount||0);
      } else if(st==='absent'||st==='a_repasser') redo++;
      else if(st==='refus') refus++;
      else rest++;
    }
    return {total:list.length,fait,redo,refus,rest,cal,amt,pay};
  }

  function ownNormalHouses(){
    const all=(households||[]).filter(visitable).filter(h=>!isShared(h));
    if(me?.role==='admin') return all;
    const own=new Set(typeof myTeamIds==='function' ? myTeamIds() : []);
    return all.filter(h=>own.has(teamForHouse(h)));
  }
  function sharedHouses(){
    return (households||[]).filter(visitable).filter(isShared);
  }

  function ensureRefus(grid,id,label){
    if(!grid)return null;
    let b=E(id)?.closest('.stat');
    if(!b){
      b=document.createElement('div'); b.className='stat';
      b.innerHTML=`<b id="${id}">0</b>${label}`;
      grid.appendChild(b);
    }
    return E(id);
  }

  function setMain(s){
    if(E('sTotal')) E('sTotal').textContent=s.total;
    if(E('sDone')) E('sDone').textContent=s.fait;
    if(E('sRedo')) E('sRedo').textContent=s.redo;
    if(E('sRemain')) E('sRemain').textContent=s.rest;
    ensureRefus(E('sTotal')?.closest('.grid'),'sRefus','Refus');
    if(E('sRefus')) E('sRefus').textContent=s.refus;
    if(E('sCalendars')) E('sCalendars').textContent=s.cal;
    if(E('sAmount')) E('sAmount').textContent=money(s.amt);
    if(E('paymentStats')) E('paymentStats').textContent=
      Object.entries(s.pay).map(([k,v])=>`${k}: ${money(v)}`).join(' · ')||'Aucun encaissement';
  }

  function setShared(s){
    const box=E('homeSeparatedRounds');
    if(!box)return;
    const title=[...box.querySelectorAll('.sectionTitle')].find(x=>x.textContent.includes('Moulet-Marcenat'));
    const card=title?.parentElement;
    if(!card)return;
    const grids=card.querySelectorAll('.grid');
    const statGrid=grids[0], financeGrid=grids[1];
    const cells=statGrid?.querySelectorAll('.stat b')||[];
    if(cells[0])cells[0].textContent=s.total;
    if(cells[1])cells[1].textContent=s.fait;
    if(cells[2])cells[2].textContent=s.redo;
    if(cells[3])cells[3].textContent=s.rest;
    ensureRefus(statGrid,'sharedRefus','Refus');
    if(E('sharedRefus'))E('sharedRefus').textContent=s.refus;
    const fin=financeGrid?.querySelectorAll('.stat b')||[];
    if(fin[0])fin[0].textContent=s.cal;
    if(fin[1])fin[1].textContent=money(s.amt);
    const resolved=s.fait+s.refus;
    const progress=card.querySelector('.progress span');
    if(progress)progress.style.width=(s.total?Math.round(resolved/s.total*100):0)+'%';
    const muted=[...card.querySelectorAll('.muted')];
    const end=muted.find(x=>x.textContent.includes('foyer(s) terminé'));
    if(end)end.textContent=`${resolved}/${s.total} foyer(s) terminé(s)`;
  }

  function apply(){
    if(!me || !campaign || !Array.isArray(households)) return;
    // Let the existing renderers build their blocks first, then correct the scope.
    setMain(stats(ownNormalHouses()));
    setShared(stats(sharedHouses()));
  }

  const previous=window.renderStats;
  window.renderStats=function(){
    if(typeof previous==='function') previous();
    setTimeout(apply,0);
  };

  // complete-address-loader replaces households asynchronously; these delayed passes
  // ensure the home counters are based on the complete list, not the first partial load.
  [300,800,1500,2500,4000].forEach(ms=>setTimeout(apply,ms));
  E('refreshBtn')?.addEventListener('click',()=>setTimeout(apply,700));
  window.renderHomeTeamStats=apply;
})();