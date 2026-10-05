/* Actions terrain depuis la carte — Amicale SP Volvic */
(function(){
  function ownTeamIds(){ try{return myTeamIds()||[]}catch(_){return []} }
  function ownerOf(h){ try{return teamForHouse(h)}catch(_){return null} }

  window.claimHousehold=async function(id){
    const h=households.find(x=>x.id===id); if(!h)return toast('Adresse introuvable');
    const ids=ownTeamIds(); if(!ids.length)return toast('Aucune équipe associée à votre compte');
    let tid=ids[0];
    if(ids.length>1){
      const choices=ids.map((x,i)=>`${i+1}. ${teams.find(t=>t.id===x)?.name||x}`).join('\n');
      const n=Number(prompt('Dans quelle équipe rattacher cette adresse ?\n'+choices,'1'));
      if(!n||!ids[n-1])return; tid=ids[n-1];
    }
    const tn=teams.find(t=>t.id===tid)?.name||'votre équipe';
    if(!confirm(`Confirmer que ${h.house_number||''} ${h.street||''} appartient réellement à ${tn} ?\n\nCe n’est pas une aide : l’adresse sera déplacée définitivement.`))return;
    const {data,error}=await sb.rpc('claim_household_for_my_team',{p_household_id:id,p_team_id:tid});
    if(error)return toast('Correction impossible : '+error.message);
    if(data){const i=households.findIndex(x=>x.id===id);if(i>=0)households[i]={...households[i],...data};}
    try{renderHouses();renderStats();window.renderMap()}catch(_){}
    toast('Adresse rattachée à '+tn);
  };

  window.mapVisitAction=function(id,status){
    if(status==='fait'){
      try{page('tour')}catch(_){}
      setTimeout(()=>{try{document.getElementById('h-'+id)?.scrollIntoView({behavior:'smooth',block:'center'});openDone(id)}catch(_){}},150);
      return;
    }
    saveVisit(id,status);
  };

  window.renderMap=function(){
    if(!map){
      map=L.map('map').setView([45.872,3.038],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
      map.on('moveend zoomend',()=>window.renderMap());
    }
    markers.forEach(m=>m.remove());markers=[];
    const bounds=map.getBounds()?.pad(.15),ids=ownTeamIds();
    households.filter(h=>h.active!==false&&h.latitude&&h.longitude&&(!bounds||bounds.contains([+h.latitude,+h.longitude]))).forEach(h=>{
      const st=visitFor(h.id)?.status||'a_faire',owner=ownerOf(h),own=ids.includes(owner);
      const color=st==='fait'?'green':(['absent','a_repasser'].includes(st)?'orange':st==='refus'?'black':'gray');
      let html=`<b>${esc(h.house_number||'')} ${esc(h.street||'')}</b><br>${esc(h.locality||'')}<br><span class="muted">${esc(st)}</span><br><br>`;
      html+=`<button onclick="mapVisitAction('${h.id}','fait')">✅ Fait</button> `;
      html+=`<button onclick="mapVisitAction('${h.id}','absent')">🚪 Absent</button> `;
      html+=`<button onclick="mapVisitAction('${h.id}','a_repasser')">🔄 À repasser</button> `;
      html+=`<button onclick="mapVisitAction('${h.id}','refus')">⛔ Refus</button>`;
      if(!own&&me?.role!=='admin')html+=`<br><br><button onclick="claimHousehold('${h.id}')">📍 Cette adresse appartient à ma tournée</button>`;
      const m=L.circleMarker([+h.latitude,+h.longitude],{radius:own?7:5,color,fillOpacity:own?.8:.35}).addTo(map).bindPopup(html);
      markers.push(m);
    });
    setTimeout(()=>map.invalidateSize(),100);
  };
  setTimeout(()=>{try{window.renderMap()}catch(e){console.error('map-house-actions',e)}},900);
})();
