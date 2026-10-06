/* Amicale SP Volvic — carte complète + actions tournée V2
   Conserve les actions de map-house-actions-v7.js et affiche tous les points.
   Aucune donnée Supabase n'est modifiée.
*/
(function(){
 const owner=h=>{try{return teamForHouse(h)}catch(_){return null}};
 const mine=()=>{try{return myTeamIds()||[]}catch(_){return []}};
 const shared=h=>{try{if(typeof isSharedRoundHouse==='function')return !!isSharedRoundHouse(h);const s=(sectors||[]).find(x=>x.id===h.sector_id),c=(cities||[]).find(x=>x.id===(h.city_id||s?.city_id));return !!c?.shared_round}catch(_){return false}};
 const esc2=v=>{try{return esc(v)}catch(_){return String(v??'')}};
 const tname=id=>(teams||[]).find(t=>t.id===id)?.name||'Non affectée';
 function route(h){const s=shared(h),o=owner(h),m=mine()[0]||null;return {s,o,m,help:!s&&!!o&&!!m&&o!==m};}

 function install(){
  if(typeof L==='undefined'||typeof window.mapVisitAction!=='function')return;
  window.renderMap=function(){
   if(!map){
    map=L.map('map').setView([45.872,3.038],13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
    map.on('click',e=>map._lastClick=e.latlng);
   }
   markers.forEach(m=>m.remove());markers=[];
   const ids=mine();
   (households||[]).filter(h=>{
    const lat=Number(h.latitude),lon=Number(h.longitude);
    return h.active!==false&&h.is_visitable!==false&&Number.isFinite(lat)&&Number.isFinite(lon)&&lat!==0&&lon!==0;
   }).forEach(h=>{
    const st=visitFor(h.id)?.status||'a_faire',r=route(h),own=r.s||ids.includes(r.o),
      name=r.s?'Tournée commune Moulet–Marcenat':tname(r.o),
      color=st==='fait'?'green':(['absent','a_repasser'].includes(st)?'orange':st==='refus'?'black':'gray'),
      help=r.help;
    let html=`<b>${esc2(h.house_number||'')} ${esc2(h.street||'')}</b><br>${esc2(h.locality||'')}<br><b>🚒 ${esc2(name)}</b><br>${help?'<b>🤝 Passage pour aider cette tournée</b><br>':''}<span class="muted">${esc2(st)}</span><br><br><button onclick="mapVisitAction('${h.id}','fait')">✅ Fait</button> <button onclick="mapVisitAction('${h.id}','absent')">🚪 Absent</button> <button onclick="mapVisitAction('${h.id}','a_repasser')">🔄 À repasser</button> <button onclick="mapVisitAction('${h.id}','refus')">⛔ Refus</button>`;
    if(!r.s&&(me?.role==='admin'||!own))html+=`<br><br><button onclick="claimHousehold('${h.id}')">📍 Modifier l’équipe de cette adresse</button>`;
    const m=L.circleMarker([Number(h.latitude),Number(h.longitude)],{radius:own?7:5,color,fillOpacity:own?.8:.35})
      .addTo(map).bindPopup(html,{maxWidth:340});
    m.__houseId=h.id;markers.push(m);
   });
   setTimeout(()=>{try{map.invalidateSize()}catch(_){}},100);
  };
  try{window.renderMap()}catch(e){console.error('Carte complète actions V2',e)}
 }
 const timer=setInterval(()=>{
  if(typeof L!=='undefined'&&typeof window.mapVisitAction==='function'&&typeof households!=='undefined'){
   clearInterval(timer);install();
  }
 },250);
 setTimeout(()=>clearInterval(timer),15000);
})();
