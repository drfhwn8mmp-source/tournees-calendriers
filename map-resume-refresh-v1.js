/* Reprise carte PWA V1 — iPhone + Android
   Corrige la disparition visuelle des marqueurs après retour dans l'application.
   Ne remplace PAS renderMap et ne touche pas aux données.
*/
(function(){
  let timers=[];

  function mapVisible(){
    const el=document.getElementById('page-map');
    return !!el && !el.classList.contains('hidden');
  }

  function refreshMap(){
    if(!mapVisible()) return;
    try{
      if(typeof map!=='undefined' && map){
        map.invalidateSize();
      }
      if(typeof window.renderMap==='function'){
        window.renderMap();
      }
      if(typeof map!=='undefined' && map){
        map.invalidateSize();
      }
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

  // Quand l'utilisateur revient explicitement sur l'onglet Carte.
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('[data-page="map"]');
    if(tab) scheduleRefresh();
  },true);
})();
