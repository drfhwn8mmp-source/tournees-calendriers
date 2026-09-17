/* Import propre Moulet-Marcenat : dédoublonnage avant affichage/sélection */
(function(){
  const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const streetOf=a=>(typeof importStreetName==='function'?importStreetName(a):(a?.street||a?.name||a?.label||''));
  const localityOf=(a,c)=>(typeof importLocality==='function'?importLocality(a,c):(a?.locality||c?.name||''));
  const numberOf=a=>(typeof importHouseNumber==='function'?importHouseNumber(a):(a?.housenumber||a?.house_number||a?.number||''));
  const key=(a,c)=>[norm(localityOf(a,c)),norm(streetOf(a)),norm(numberOf(a))].join('|');

  function dedupe(c){
    if(!Array.isArray(imported)||!imported.length)return 0;
    const seen=new Set(), clean=[];
    for(const a of imported){
      const k=key(a,c);
      if(seen.has(k))continue;
      seen.add(k); clean.push(a);
    }
    const removed=imported.length-clean.length;
    if(removed) imported=clean;
    return removed;
  }

  const oldRender=window.renderImportedAddresses;
  if(typeof oldRender==='function'){
    window.renderImportedAddresses=function(c){
      dedupe(c);
      return oldRender(c);
    };
  }

  const btn=document.getElementById('loadAddresses');
  if(btn){
    btn.addEventListener('click',()=>{
      let tries=0;
      const timer=setInterval(()=>{
        tries++;
        const c=(typeof cities!=='undefined'&&Array.isArray(cities))?cities.find(x=>x.id===document.getElementById('importCity')?.value):null;
        if(Array.isArray(imported)&&imported.length){
          const removed=dedupe(c);
          if(removed && typeof window.renderImportedAddresses==='function') window.renderImportedAddresses(c);
          clearInterval(timer);
        } else if(tries>=40) clearInterval(timer);
      },250);
    },true);
  }
})();