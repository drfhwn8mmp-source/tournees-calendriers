/* Carte FINAL V14 — charge le moteur final APRES tous les anciens scripts carte */
(function(){
  const VERSION='2026.10.06-final14';
  function load(){
    if(document.querySelector('script[data-map-final-v14]'))return;
    const s=document.createElement('script');
    s.src='./map-house-actions-final-v14.js?v='+encodeURIComponent(VERSION);
    s.dataset.mapFinalV14='1';
    s.onload=()=>{try{window.__MAP_FINAL_VERSION='V14';window.renderMap?.()}catch(e){console.error(e)}};
    document.body.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,50),{once:true});
  else setTimeout(load,50);
})();
