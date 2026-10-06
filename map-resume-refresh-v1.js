/* Reprise carte PWA V6 — marqueurs stables pendant popup/déplacement
   Principe : ne plus reconstruire tous les marqueurs sur moveend/zoomend.
   On conserve le rendu complet existant et on le relance seulement après
   une vraie action ou un retour sur la carte. Aucune donnée modifiée.
*/
(function(){
  let timers=[];
  let installedOnMap=null;

  try{
    if(window.L && L.Popup && L.Popup.prototype && L.Popup.prototype.options){
      L.Popup.prototype.options.autoPan=false;
      L.Popup.prototype.options.keepInView=false;
    }
  }catch(_){}

  function mapVisible(){
    const el=document.getElementById('page-map');
    return !!el && !el.classList.contains('hidden');
  }

  function popupOpen(){
    try{
      if(typeof map!=='undefined' && map && map._popup && map._popup._map) return true;
      return !!document.querySelector('.leaflet-popup');
    }catch(_){return false}
  }

  function safeRefresh(){
    if(!mapVisible() || popupOpen()) return;
    try{
      if(typeof map!=='undefined' && map) map.invalidateSize({pan:false});
      if(typeof window.renderMap==='function') window.renderMap();
      if(typeof map!=='undefined' && map) map.invalidateSize({pan:false});
    }catch(e){console.warn('Carte V6:',e)}
  }

  function scheduleRefresh(delay=0){
    const t=setTimeout(safeRefresh,delay);
    timers.push(t);
    if(timers.length>20) timers.splice(0,10).forEach(clearTimeout);
  }

  /* Le bug venait aussi du renderMap V7 qui s'abonne à moveend/zoomend
     et supprime/recrée tous les marqueurs à chaque déplacement.
     On retire uniquement CES callbacks de rerendu et on garde Leaflet intact. */
  function stabilizeMapEvents(){
    try{
      if(typeof map==='undefined' || !map || installedOnMap===map) return;
      const ev=map._events||{};
      ['moveend','zoomend'].forEach(name=>{
        const handlers=ev[name];
        if(!handlers) return;
        const arr=Array.isArray(handlers)?handlers:[handlers];
        arr.slice().forEach(h=>{
          const fn=h&&h.fn;
          if(typeof fn!=='function') return;
          const src=Function.prototype.toString.call(fn);
          if(src.includes('renderMap')){
            try{map.off(name,fn,h.ctx)}catch(_){}
          }
        });
      });
      installedOnMap=map;

      map.on('popupclose',()=>scheduleRefresh(80));
      map.on('zoomend',()=>{ try{map.invalidateSize({pan:false})}catch(_){} });
    }catch(e){console.warn('Carte V6 événements:',e)}
  }

  /* map est créé tardivement : attendre sa création puis stabiliser une seule fois. */
  setInterval(stabilizeMapEvents,250);

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){
      stabilizeMapEvents();
      scheduleRefresh(100);
    }
  });
  window.addEventListener('pageshow',()=>{
    stabilizeMapEvents();
    scheduleRefresh(120);
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-page="map"]')){
      setTimeout(stabilizeMapEvents,100);
      scheduleRefresh(180);
      return;
    }

    /* Toute action d'un popup : laisser l'enregistrement se terminer,
       puis reconstruire une seule fois la couche complète. */
    if(e.target.closest?.('.leaflet-popup button')){
      scheduleRefresh(350);
      scheduleRefresh(900);
    }
  },true);

  /* Fermeture par la croix Leaflet / annulation d'un dialogue. */
  document.addEventListener('click',e=>{
    if(e.target.closest?.('.leaflet-popup-close-button')){
      scheduleRefresh(180);
    }
  },true);
})();
