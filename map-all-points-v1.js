/* Amicale SP Volvic — carte : tous les points V1
   Remplace uniquement le rendu carte de complete-address-loader.js.
   Toutes les maisons visibles pour l'utilisateur ayant des coordonnées sont affichées,
   même hors de la zone courante de la carte. Aucune donnée Supabase n'est modifiée.
*/
(function(){
  function install(){
    if(typeof L==='undefined' || typeof visibleHouses!=='function') return;

    window.renderMap=function(){
      if(!map){
        map=L.map('map').setView([45.872,3.038],13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          attribution:'© OpenStreetMap'
        }).addTo(map);
        map.on('click',e=>map._lastClick=e.latlng);
      }

      markers.forEach(m=>m.remove());
      markers=[];

      const list=visibleHouses().filter(h=>{
        const lat=Number(h.latitude), lon=Number(h.longitude);
        return Number.isFinite(lat) && Number.isFinite(lon) && lat!==0 && lon!==0;
      });

      list.forEach(h=>{
        const st=visitFor(h.id)?.status||'a_faire';
        const color=st==='fait'?'green':
          (['absent','a_repasser'].includes(st)?'orange':
          st==='refus'?'black':'gray');

        const m=L.circleMarker([Number(h.latitude),Number(h.longitude)],{
          radius:7,color,fillOpacity:.8
        }).addTo(map).bindPopup(
          `<b>${esc(h.house_number||'')} ${esc(h.street||'')}</b><br>${esc(st)}`
        );
        markers.push(m);
      });

      setTimeout(()=>map.invalidateSize(),100);
    };

    // Réaffiche immédiatement tous les points si la carte existe déjà.
    try{ window.renderMap(); }catch(e){ console.error('Carte tous les points:',e); }
  }

  const timer=setInterval(()=>{
    if(typeof L!=='undefined' && typeof visibleHouses==='function'){
      clearInterval(timer);
      install();
    }
  },250);
  setTimeout(()=>clearInterval(timer),15000);
})();
