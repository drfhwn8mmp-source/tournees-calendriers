/* Type maison / immeuble depuis la carte — V2 — tous les utilisateurs */
(function(){
  function install(){
    if(typeof window.renderMap!=='function')return setTimeout(install,250);
    const old=window.renderMap;
    window.renderMap=function(){
      const r=old.apply(this,arguments);
      setTimeout(()=>{
        (markers||[]).forEach(m=>{
          const id=m.__houseId,p=m.getPopup?.(); if(!id||!p)return;
          const h=households.find(x=>x.id===id); if(!h)return;
          let s=p.getContent(); if(typeof s!=='string'||s.includes('mapDwellingType'))return;
          const type=h.dwelling_type==='immeuble'?'🏢 Immeuble':h.dwelling_type==='appartement'?'🏢 Appartement':'🏠 Maison';
          const control=h.dwelling_type!=='appartement'
            ? `<br><button type="button" onclick="event.stopPropagation();mapDwellingType('${id}')">🏠/🏢 Modifier Maison / Immeuble</button>`:'';
          s=s.replace(/(<span class="muted">[^<]*<\/span>)/,`<b>${type}</b><br>$1${control}`);
          p.setContent(s);
        });
      },0);
      return r;
    };
    window.mapDwellingType=async function(id){
      if(typeof configureDwelling!=='function')return toast('Gestion des immeubles indisponible');
      try{map?.closePopup?.()}catch(_){}
      await configureDwelling(id);
      try{window.renderMap();window.renderStats();window.renderHouses()}catch(_){}
    };
    try{window.renderMap()}catch(e){console.error('map dwelling type V2',e)}
  }
  setTimeout(install,1200);
})();