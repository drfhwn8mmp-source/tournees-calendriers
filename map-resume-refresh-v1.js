/* Reprise carte PWA V5 — stabilisation durable des marqueurs
   Corrige le cas où map-house-actions remplace renderMap après l'installation
   du garde popup. Aucune modification des données, adresses ou équipes.
*/
(function(){
  let timers=[];
  let lastWrapped=null;

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

  function protectRenderMap(){
    const current=window.renderMap;
    if(typeof current!=='function') return false;
    if(current.__popupStableV5){ lastWrapped=current; return true; }

    const original=current.__original || current;
    function protectedRenderMap(){
      if(popupOpen()){
        try{if(typeof map!=='undefined'&&map)map.invalidateSize()}catch(_){}
        return;
      }
      return original.apply(this,arguments);
    }
    protectedRenderMap.__popupStableV5=true;
    protectedRenderMap.__original=original;
    window.renderMap=protectedRenderMap;
    lastWrapped=protectedRenderMap;
    return true;
  }

  function refreshMap(){
    if(!mapVisible()) return;
    try{
      protectRenderMap();
      if(typeof map!=='undefined' && map) map.invalidateSize();
      if(!popupOpen() && typeof window.renderMap==='function') window.renderMap();
      if(typeof map!=='undefined' && map) map.invalidateSize();
    }catch(e){console.warn('Reprise carte:',e)}
  }

  function scheduleRefresh(){
    timers.forEach(clearTimeout);
    timers=[0,120,350,800].map(ms=>setTimeout(()=>{
      protectRenderMap();
      if(!popupOpen()) refreshMap();
    },ms));
  }

  /* Important : plusieurs scripts définissent renderMap après celui-ci.
     On surveille donc les remplacements au lieu d'arrêter au premier renderMap trouvé. */
  setInterval(()=>{
    try{
      if(typeof window.renderMap==='function' && window.renderMap!==lastWrapped){
        protectRenderMap();
      }
    }catch(_){}
  },250);

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') scheduleRefresh();
  });
  window.addEventListener('pageshow',scheduleRefresh,true);

  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('[data-page="map"]');
    if(tab) scheduleRefresh();

    /* Après une action dans un popup, attendre sa fermeture puis reconstruire
       la couche complète de marqueurs. */
    if(e.target.closest?.('.leaflet-popup button')){
      setTimeout(scheduleRefresh,100);
      setTimeout(scheduleRefresh,700);
    }
  },true);

  document.addEventListener('transitionend',()=>{
    if(mapVisible() && !popupOpen()) scheduleRefresh();
  },true);
})();
