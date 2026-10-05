/* Actions terrain depuis la carte — Amicale SP Volvic — V2 Admin */
(function(){
  function ownerOf(h){ try{return teamForHouse(h)}catch(_){return null} }
  function ownTeamIds(){ try{return myTeamIds()||[]}catch(_){return []} }

  window.claimHousehold=async function(id){
    const h=households.find(x=>x.id===id);
    if(!h)return toast('Adresse introuvable');

    let allowed=[];
    if(me?.role==='admin'){
      allowed=(teams||[]).filter(t=>t.active!==false);
    }else{
      const ids=ownTeamIds();
      allowed=(teams||[]).filter(t=>ids.includes(t.id));
    }
    if(!allowed.length)return toast('Aucune équipe disponible');

    let target=allowed[0];
    if(allowed.length>1){
      const choices=allowed.map((t,i)=>`${i+1}. ${t.name}`).join('\n');
      const n=Number(prompt('Choisir la bonne équipe pour cette adresse :\n'+choices,'1'));
      if(!n||!allowed[n-1])return;
      target=allowed[n-1];
    }

    const oldTeam=(teams||[]).find(t=>t.id===ownerOf(h));
    const oldName=oldTeam?.name||'non affectée';
    if(!confirm(
      `Confirmer la correction ?\n\n`+
      `${h.house_number||''} ${h.street||''}\n`+
      `${h.locality||''}\n\n`+
      `${oldName} → ${target.name}\n\n`+
      `Ce changement est définitif et ne sera pas compté comme de l’aide.`
    ))return;

    const {data,error}=await sb.rpc('claim_household_for_my_team',{
      p_household_id:id,
      p_team_id:target.id
    });
    if(error)return toast('Correction impossible : '+error.message);

    if(data){
      const i=households.findIndex(x=>x.id===id);
      if(i>=0)households[i]={...households[i],...data};
    }else{
      // Recharge la fiche depuis Supabase si la RPC ne renvoie rien.
      const r=await sb.from('households').select('*').eq('id',id).maybeSingle();
      if(r.data){
        const i=households.findIndex(x=>x.id===id);
        if(i>=0)households[i]={...households[i],...r.data};
      }
    }
    try{renderHouses();renderStats();window.renderMap()}catch(_){}
    toast('Adresse rattachée à '+target.name);
  };

  window.mapVisitAction=function(id,status){
    if(status==='fait'){
      try{page('tour')}catch(_){}
      setTimeout(()=>{
        try{
          document.getElementById('h-'+id)?.scrollIntoView({behavior:'smooth',block:'center'});
          openDone(id);
        }catch(_){}
      },150);
      return;
    }
    saveVisit(id,status);
  };

  window.renderMap=function(){
    if(!map){
      map=L.map('map').setView([45.872,3.038],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'© OpenStreetMap'
      }).addTo(map);
      map.on('moveend zoomend',()=>window.renderMap());
    }

    markers.forEach(m=>m.remove());
    markers=[];

    const bounds=map.getBounds()?.pad(.15);
    const ids=ownTeamIds();

    households
      .filter(h=>h.active!==false && h.latitude && h.longitude &&
        (!bounds||bounds.contains([+h.latitude,+h.longitude])))
      .forEach(h=>{
        const st=visitFor(h.id)?.status||'a_faire';
        const owner=ownerOf(h);
        const own=ids.includes(owner);
        const color=st==='fait'?'green':
          (['absent','a_repasser'].includes(st)?'orange':
          st==='refus'?'black':'gray');

        let html=
          `<b>${esc(h.house_number||'')} ${esc(h.street||'')}</b><br>`+
          `${esc(h.locality||'')}<br>`+
          `<span class="muted">${esc(st)}</span><br><br>`+
          `<button onclick="mapVisitAction('${h.id}','fait')">✅ Fait</button> `+
          `<button onclick="mapVisitAction('${h.id}','absent')">🚪 Absent</button> `+
          `<button onclick="mapVisitAction('${h.id}','a_repasser')">🔄 À repasser</button> `+
          `<button onclick="mapVisitAction('${h.id}','refus')">⛔ Refus</button>`;

        if(me?.role==='admin' || !own){
          html+=`<br><br><button onclick="claimHousehold('${h.id}')">📍 Modifier l’équipe de cette adresse</button>`;
        }

        const m=L.circleMarker([+h.latitude,+h.longitude],{
          radius:own?7:5,
          color,
          fillOpacity:own?.8:.35
        }).addTo(map).bindPopup(html);
        markers.push(m);
      });

    setTimeout(()=>map.invalidateSize(),100);
  };

  setTimeout(()=>{
    try{window.renderMap()}
    catch(e){console.error('map-house-actions V2',e)}
  },900);
})();
