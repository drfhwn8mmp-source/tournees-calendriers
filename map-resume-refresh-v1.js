/* Reprise carte PWA V7 — affichage complet et stable des points
   Correctif isolé : le rendu V7 d'origine effaçait tous les marqueurs puis
   ne recréait que ceux contenus dans les limites visibles de la carte.
   Ici on conserve exactement le rendu/actions existants, mais on neutralise
   uniquement ce filtrage par limites pendant renderMap.
   Aucune modification Supabase, adresse, équipe ou visite.
*/
(function(){
  let wrapped=null;

  try{
    if(window.L && L.Popup && L.Popup.prototype && L.Popup.prototype.options){
      L.Popup.prototype.options.autoPan=false;
      L.Popup.prototype.options.keepInView=false;
    }
  }catch(_){}

  function install(){
    const current=window.renderMap;
    if(typeof current!=='function') return;
    if(current.__allPointsStableV7){ wrapped=current; return; }
    if(current===wrapped) return;

    const original=current.__original || current;

    function stableRenderMap(){
      let oldGetBounds=null;
      try{
        /* Le renderMap existant fait:
           bounds = map.getBounds().pad(...)
           puis supprime les maisons hors bounds.
           Retourner null ici désactive seulement ce filtre. */
        if(typeof map!=='undefined' && map && typeof map.getBounds==='function'){
          oldGetBounds=map.getBounds;
          map.getBounds=function(){ return null; };
        }
        return original.apply(this,arguments);
      }finally{
        try{
          if(oldGetBounds && typeof map!=='undefined' && map) map.getBounds=oldGetBounds;
        }catch(_){}
      }
    }

    stableRenderMap.__allPointsStableV7=true;
    stableRenderMap.__original=original;
    window.renderMap=stableRenderMap;
    wrapped=stableRenderMap;
  }

  /* map-house-actions-v7 est chargé après ce fichier : surveiller son arrivée
     et toute éventuelle redéfinition ultérieure de renderMap. */
  setInterval(()=>{
    try{
      if(typeof window.renderMap==='function' && window.renderMap!==wrapped) install();
    }catch(_){}
  },150);

  function refresh(delay){
    setTimeout(()=>{
      try{
        install();
        if(typeof map!=='undefined' && map) map.invalidateSize({pan:false});
        if(typeof window.renderMap==='function') window.renderMap();
      }catch(e){console.warn('Carte stable V7:',e)}
    },delay);
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') refresh(120);
  });

  window.addEventListener('pageshow',()=>refresh(150),true);

  document.addEventListener('click',e=>{
    if(e.target.closest?.('[data-page="map"]')) refresh(180);
    if(e.target.closest?.('.leaflet-popup-close-button')) refresh(120);
    if(e.target.closest?.('.leaflet-popup button')) refresh(650);
  },true);
})();
