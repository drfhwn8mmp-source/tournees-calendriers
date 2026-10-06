/* Reprise carte PWA V2 — iPhone + Android
   Conserve le correctif de reprise de carte sans fermer un popup maison ouvert.
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
    }catch(_){ return false; }
  }

  function refreshMap(){
    if(!mapVisible()) return;
    try{
      if(typeof map!=='undefined' && map) map.invalidateSize();
      // renderMap supprime/recrée les marqueurs : ne pas l'appeler pendant un popup ouvert.
      if(!popupOpen() && typeof window.renderMap==='function') window.renderMap();
      if(typeof map!=='undefined' && map) map.invalidateSize();
    }catch(e){
      console.warn('Reprise carte:',e);
    }
  }

  function scheduleRefresh(){
    timers.forEach(clearTimeout);
    timers=[0,80,220,500,900].map(ms=>setTimeout(refreshMap,ms));
  }

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
