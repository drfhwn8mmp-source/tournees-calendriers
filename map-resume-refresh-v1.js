/* Reprise carte PWA V3 — iPhone + Android
   + protection globale des popups maison contre les reconstructions de renderMap.
   Ne touche pas aux données.
*/
(function(){
  let timers=[];

  function mapVisible(){
    const el=document.getElementById('page-map');
    return !!el && !el.classList.contains('hidden');
  }

  function popupOpen(){
    try{
      if(typeof map!=='undefined' && map && typeof map.getPopup==='function' && map.getPopup()) return true;
      return !!document.querySelector('.leaflet-popup');
    }catch(_){return false}
  }

  function protectRenderMap(){
    if(typeof window.renderMap!=='function') return false;
    if(window.renderMap.__popupStableV3) return true;
    const original=window.renderMap;
    function protectedRenderMap(){
      if(popupOpen()){
        try{if(typeof map!=='undefined'&&map)map.invalidateSize()}catch(_){}
        return;
      }
      return original.apply(this,arguments);
    }
    protectedRenderMap.__popupStableV3=true;
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
    timers=[0,80,220,500,900].map(ms=>setTimeout(refreshMap,ms));
  }

  // map-house-actions-v7 charge après ce fichier : attendre son renderMap puis l'envelopper.
  let tries=0;
  const installTimer=setInterval(()=>{
    tries++;
    if(protectRenderMap() || tries>100) clearInterval(installTimer);
  },100);

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') scheduleRefresh();
  });
  window.addEventListener('pageshow',scheduleRefresh,true);
  window.addEventListener('focus',scheduleRefresh,true);
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('[data-page="map"]');
    if(tab) scheduleRefresh();
  },true);
})();
