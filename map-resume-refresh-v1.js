/* Reprise carte PWA V4 — correctif popup carte
   Cause corrigée : l'ouverture d'un popup Leaflet pouvait déplacer automatiquement
   la carte (autoPan), déclencher "moveend", puis renderMap supprimait le marqueur
   et donc le popup. Aucune modification des données.
*/
(function(){
  let timers=[];

  // Important : empêcher l'ouverture d'un popup de provoquer un moveend.
  // La carte reste déplaçable/zoomable normalement par l'utilisateur.
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
    if(typeof window.renderMap!=='function') return false;
    if(window.renderMap.__popupStableV4) return true;
    const original=window.renderMap;
    function protectedRenderMap(){
      if(popupOpen()){
        try{if(typeof map!=='undefined'&&map)map.invalidateSize()}catch(_){}
        return;
      }
      return original.apply(this,arguments);
    }
    protectedRenderMap.__popupStableV4=true;
    protectedRenderMap.__original=original;
    window.renderMap=protectedRenderMap;
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
    timers=[
      setTimeout(refreshMap,0),
      setTimeout(()=>{if(!popupOpen())refreshMap()},150),
      setTimeout(()=>{if(!popupOpen())refreshMap()},500)
    ];
  }

  // map-house-actions est chargé plus tard : protéger renderMap dès qu'il existe.
  let tries=0;
  const installTimer=setInterval(()=>{
    tries++;
    if(protectRenderMap() || tries>120) clearInterval(installTimer);
  },50);

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') scheduleRefresh();
  });
  window.addEventListener('pageshow',scheduleRefresh,true);

  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('[data-page="map"]');
    if(tab) scheduleRefresh();
  },true);
})();
