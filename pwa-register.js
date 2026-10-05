/* Enregistrement PWA — iOS / Android */
(function(){
  if(!('serviceWorker' in navigator)) return;
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('./sw.js',{scope:'./'})
      .catch(err=>console.error('Service Worker',err));
  });
})();
