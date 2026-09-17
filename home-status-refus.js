/* Accueil : compteurs exhaustifs avec Refus visible */
(function(){
  const E=id=>document.getElementById(id);
  const visitable=h=>h && h.active!==false && h.is_visitable!==false && h.dwelling_type!=='immeuble';

  function sharedSectorIds(){
    const cityIds=new Set((cities||[]).filter(c=>c.shared_round).map(c=>c.id));
    return new Set((sectors||[]).filter(s=>cityIds.has(s.city_id)).map(s=>s.id));
  }
  function counts(list){
    let fait=0, redo=0, refus=0, rest=0;
    for(const h of list){
      const st=visitFor(h.id)?.status || 'a_faire';
      if(st==='fait') fait++;
      else if(st==='absent' || st==='a_repasser') redo++;
      else if(st==='refus') refus++;
      else rest++;
    }
    return {total:list.length,fait,redo,refus,rest};
  }
  function addRefusMain(c){
    const grid=E('sTotal')?.closest('.grid');
    if(!grid)return;
    let box=E('sRefus')?.closest('.stat');
    if(!box){
      box=document.createElement('div');
      box.className='stat';
      box.innerHTML='<b id="sRefus">0</b>Refus';
      grid.appendChild(box);
    }
    E('sRefus').textContent=c.refus;
  }
  function addRefusShared(c){
    const block=E('homeSeparatedRounds');
    if(!block)return;
    const title=[...block.querySelectorAll('.sectionTitle')].find(x=>x.textContent.includes('Moulet-Marcenat'));
    const grid=title?.parentElement?.querySelector('.grid.g4');
    if(!grid)return;
    let box=E('sharedRefus')?.closest('.stat');
    if(!box){
      box=document.createElement('div');
      box.className='stat';
      box.innerHTML='<b id="sharedRefus">0</b>Refus';
      grid.appendChild(box);
    }
    E('sharedRefus').textContent=c.refus;
  }

  const previous=window.renderStats;
  window.renderStats=function(){
    if(typeof previous==='function') previous();

    const sharedIds=sharedSectorIds();
    const all=(households||[]).filter(visitable);
    const normal=all.filter(h=>!sharedIds.has(h.sector_id));
    const shared=all.filter(h=>sharedIds.has(h.sector_id));
    const n=counts(normal), s=counts(shared);

    if(E('sTotal'))E('sTotal').textContent=n.total;
    if(E('sDone'))E('sDone').textContent=n.fait;
    if(E('sRedo'))E('sRedo').textContent=n.redo;
    if(E('sRemain'))E('sRemain').textContent=n.rest;
    addRefusMain(n);

    /* home-shared-round.js vient de recréer le bloc partagé : on complète son compteur. */
    addRefusShared(s);
  };

  setTimeout(()=>window.renderStats?.(),1200);
})();