/* Reprise carte PWA V8 — helper minimal, sans interception de renderMap */
(function(){
  function refresh(){
    try{
      const el=document.getElementById('page-map');
      if(!el||el.classList.contains('hidden'))return;
      if(typeof map!=='undefined'&&map)map.invalidateSize({pan:false});
    }catch(_){}
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refresh,100)});
  window.addEventListener('pageshow',()=>setTimeout(refresh,120),true);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="map"]'))setTimeout(refresh,150)},true);
})();
