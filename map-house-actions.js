/* Actions terrain depuis la carte — Amicale SP Volvic — V6 aide entre tournées */
(function(){
  function ownerOf(h){ try{return teamForHouse(h)}catch(_){return null} }
  function ownTeamIds(){ try{return myTeamIds()||[]}catch(_){return []} }
  function teamName(id){ return (teams||[]).find(t=>t.id===id)?.name || 'Non affectée'; }

  window.claimHousehold=async function(id){
    const h=households.find(x=>x.id===id);
    if(!h)return toast('Adresse introuvable');

    const currentId=ownerOf(h);
    const currentName=teamName(currentId);

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
      const choices=allowed.map((t,i)=>`${i+1}. ${t.name}${t.id===currentId?'  ← ACTUELLE':''}`).join('\n');
      const n=Number(prompt(`Tournée actuelle : ${currentName}\n\nChoisir la nouvelle équipe :\n${choices}`,'1'));
      if(!n||!allowed[n-1])return;
      target=allowed[n-1];
    }

    if(target.id===currentId)return toast('Cette adresse est déjà dans '+currentName);

    if(!confirm(
      `Confirmer la correction ?\n\n`+
      `${h.house_number||''} ${h.street||''}\n${h.locality||''}\n\n`+
      `${currentName} → ${target.name}\n\n`+
      `La maison sera retirée de l’ancienne tournée et rattachée à la nouvelle. Ce n’est pas de l’aide.`
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
      const r=await sb.from('households').select('*').eq('id',id).maybeSingle();
      if(r.data){
        const i=households.findIndex(x=>x.id===id);
        if(i>=0)households[i]={...households[i],...r.data};
      }
    }
    try{renderHouses();renderStats();window.renderMap()}catch(_){}
    toast('Adresse déplacée : '+currentName+' → '+target.name);
  };

  window.mapVisitAction=function(id,status){
    if(status!=='fait'){
      saveVisit(id,status).then(()=>{try{window.renderMap()}catch(_){}});
      return;
    }
    const h=households.find(x=>x.id===id), v=visitFor(id)||{};
    if(!h)return;

    const form=
      `<div class="map-done-form">`+
      `<b>✅ Passage — ${esc(h.house_number||'')} ${esc(h.street||'')}</b><br>`+
      `<span class="muted">${esc(h.locality||'')}</span><br><br>`+
      `<label>Calendriers</label>`+
      `<input id="map-cal-${id}" type="number" min="0" value="${v.calendars_count??1}">`+
      `<label>Don (€)</label>`+
      `<input id="map-amt-${id}" type="number" min="0" step=".01" value="${v.amount??''}">`+
      `<label>Mode de paiement</label>`+
      `<select id="map-pay-${id}">`+
      `<option value="">— Choisir —</option>`+
      `${['especes','carte','cheque','autre'].map(x=>`<option value="${x}" ${v.payment_method===x?'selected':''}>${x}</option>`).join('')}`+
      `</select>`+
      `<label>Commentaire</label>`+
      `<input id="map-com-${id}" value="${esc(v.visit_comment||'')}" placeholder="Commentaire visite">`+
      `<br><button class="btn green" style="width:100%;margin-top:8px" onclick="saveMapDone('${id}')">✅ Valider le passage</button>`+
      `</div>`;

    /* On remplace le contenu du popup ACTUEL : aucun changement de page,
       aucun scroll vers la liste, aucune recherche du marqueur nécessaire. */
    const popup=map?.getPopup?.();
    if(popup){
      popup.setContent(form).update();
      return;
    }
    toast('Rouvre la maison sur la carte');
  };

  window.saveMapDone=async function(id){
    const h=households.find(x=>x.id===id); if(!h)return;
    const old=visitFor(id)||{}, owner=ownerOf(h), mine=ownTeamIds();
    const myTeam=mine[0]||null, helping=!!(owner && myTeam && owner!==myTeam);
    const payload={
      campaign_id:campaign.id, household_id:id,
      /* La visite reste comptée pour la tournée propriétaire.
         helper_mode indique qu'une autre tournée a effectué le passage. */
      team_id:owner||old.team_id||myTeam||null,
      original_team_id:owner||old.original_team_id||null,
      helper_mode:helping, status:'fait',
      calendars_count:+(document.getElementById('map-cal-'+id)?.value||0),
      amount:+(document.getElementById('map-amt-'+id)?.value||0),
      payment_method:document.getElementById('map-pay-'+id)?.value||null,
      visit_comment:document.getElementById('map-com-'+id)?.value||null,
      visited_by:me.id, visited_at:new Date().toISOString(),
      updated_at:new Date().toISOString(), client_updated_at:new Date().toISOString()
    };
    const {data,error}=await sb.from('visits').upsert(payload,{onConflict:'campaign_id,household_id'}).select().single();
    if(error)return toast('Enregistrement impossible : '+error.message);
    const i=visits.findIndex(x=>x.household_id===id);
    if(i>=0)visits[i]={...visits[i],...data}; else visits.push(data);
    try{await sb.from('visit_presence').delete().eq('household_id',id).eq('user_id',me.id)}catch(_){}
    try{renderStats();renderHouses();window.renderMap()}catch(_){}
    toast('Passage enregistré');
  };

  window.renderMap=function(){
    if(!map){
      map=L.map('map').setView([45.872,3.038],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
      map.on('moveend zoomend',()=>window.renderMap());
    }
    markers.forEach(m=>m.remove()); markers=[];
    const bounds=map.getBounds()?.pad(.15),ids=ownTeamIds();

    households.filter(h=>h.active!==false&&h.latitude&&h.longitude&&(!bounds||bounds.contains([+h.latitude,+h.longitude]))).forEach(h=>{
      const st=visitFor(h.id)?.status||'a_faire';
      const owner=ownerOf(h), own=ids.includes(owner), currentName=teamName(owner);
      const color=st==='fait'?'green':(['absent','a_repasser'].includes(st)?'orange':st==='refus'?'black':'gray');

      const helping=!!(owner && ids.length && !own);
      let html=
        `<b>${esc(h.house_number||'')} ${esc(h.street||'')}</b><br>`+
        `${esc(h.locality||'')}<br>`+
        `<b>🚒 Tournée actuelle : ${esc(currentName)}</b><br>`+
        `${helping?'<b>🤝 Passage pour aider cette tournée</b><br>':''}`+
        `<span class="muted">${esc(st)}</span><br><br>`+
        `<button onclick="mapVisitAction('${h.id}','fait')">✅ Fait</button> `+
        `<button onclick="mapVisitAction('${h.id}','absent')">🚪 Absent</button> `+
        `<button onclick="mapVisitAction('${h.id}','a_repasser')">🔄 À repasser</button> `+
        `<button onclick="mapVisitAction('${h.id}','refus')">⛔ Refus</button>`;

      if(me?.role==='admin'||!own){
        html+=`<br><br><button onclick="claimHousehold('${h.id}')">📍 Modifier l’équipe de cette adresse</button>`;
      }

      const m=L.circleMarker([+h.latitude,+h.longitude],{radius:own?7:5,color,fillOpacity:own?.8:.35}).addTo(map).bindPopup(html);
      m.__houseId=h.id; markers.push(m);
    });
    setTimeout(()=>map.invalidateSize(),100);
  };

  setTimeout(()=>{try{window.renderMap()}catch(e){console.error('map-house-actions V6',e)}},900);
})();
