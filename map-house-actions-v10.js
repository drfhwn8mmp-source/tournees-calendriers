/* Actions carte unifiées V13 — rendu carte stable : tous les points restent chargés */
(function(){
 const owner=h=>{try{return teamForHouse(h)}catch(_){return null}};
 const mine=()=>{try{return myTeamIds()||[]}catch(_){return []}};
 const shared=h=>{try{if(typeof isSharedRoundHouse==='function')return !!isSharedRoundHouse(h);const s=(sectors||[]).find(x=>x.id===h.sector_id),c=(cities||[]).find(x=>x.id===(h.city_id||s?.city_id));return !!c?.shared_round}catch(_){return false}};
 const esc7=v=>{try{return esc(v)}catch(_){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
 const tname=id=>(teams||[]).find(t=>t.id===id)?.name||'Non affectée';
 function route(h){const s=shared(h),o=owner(h),m=mine()[0]||null;return {s,o,m,help:!s&&!!o&&!!m&&o!==m,team:s?null:o,original:s?null:o};}
 function locked(h){try{return !!window.isHouseFinalLocked?.(h)}catch(_){return false}}
 async function saveStatus(id,status,extra={}){const h=households.find(x=>x.id===id);if(!h)return toast('Adresse introuvable');if(locked(h))return toast('Cette tournée est clôturée');const r=route(h),old=visitFor(id)||{};const p={campaign_id:campaign.id,household_id:id,team_id:r.team,original_team_id:r.original,helper_mode:r.help,status,calendars_count:extra.calendars_count??(status==='fait'?(old.calendars_count??1):0),amount:extra.amount??(status==='fait'?(old.amount??0):0),payment_method:extra.payment_method??(status==='fait'?(old.payment_method||null):null),visit_comment:extra.visit_comment??old.visit_comment??null,visited_by:me.id,visited_at:new Date().toISOString(),updated_at:new Date().toISOString(),client_updated_at:new Date().toISOString()};const {data,error}=await sb.from('visits').upsert(p,{onConflict:'campaign_id,household_id'}).select().single();if(error)return toast('Enregistrement impossible : '+error.message);const i=visits.findIndex(x=>x.household_id===id);if(i>=0)visits[i]={...visits[i],...data};else visits.push(data);try{await sb.from('visit_presence').delete().eq('household_id',id).eq('user_id',me.id)}catch(_){}try{renderStats();renderHouses();window.renderMap()}catch(_){}toast(r.s?'Passage enregistré — tournée commune':r.help?'Passage enregistré pour '+tname(r.o):'Passage enregistré');}
 function doneModal(id){const h=households.find(x=>x.id===id),v=visitFor(id)||{};if(!h)return;if(locked(h))return toast('Cette tournée est clôturée');let box=document.getElementById('mapDoneModalV7');if(!box){box=document.createElement('div');box.id='mapDoneModalV7';box.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);padding:calc(env(safe-area-inset-top) + 8px) 12px calc(env(safe-area-inset-bottom) + 8px);overflow:auto;display:flex;align-items:flex-start;justify-content:center;-webkit-overflow-scrolling:touch';document.body.appendChild(box)}box.innerHTML=`<div style="background:#fff;width:min(520px,100%);margin:18px auto;border-radius:16px;padding:16px;box-shadow:0 8px 30px #0005"><div style="display:flex;gap:8px"><div style="flex:1"><b style="font-size:18px">✅ Passage — ${esc7(h.house_number||'')} ${esc7(h.street||'')}</b><div class="muted">${esc7(h.locality||'')}</div></div><button class="btn alt" id="m7close">✕</button></div><br><label>Calendriers</label><input id="m7cal" inputmode="numeric" type="number" min="0" value="${v.calendars_count??1}"><label>Don (€)</label><input id="m7amt" inputmode="decimal" type="number" min="0" step=".01" value="${v.amount??''}"><label>Mode de paiement</label><select id="m7pay"><option value="">— Choisir —</option>${['especes','carte','cheque','autre'].map(x=>`<option value="${x}" ${v.payment_method===x?'selected':''}>${x}</option>`).join('')}</select><label>Commentaire</label><input id="m7com" value="${esc7(v.visit_comment||'')}"><br><button class="btn green" style="width:100%;margin-top:10px" id="m7save">✅ Valider le passage</button></div>`;box.style.display='flex';document.getElementById('m7close').onclick=()=>box.style.display='none';box.onclick=e=>{if(e.target===box)box.style.display='none'};document.getElementById('m7save').onclick=async()=>{await saveStatus(id,'fait',{calendars_count:+document.getElementById('m7cal').value||0,amount:+document.getElementById('m7amt').value||0,payment_method:document.getElementById('m7pay').value||null,visit_comment:document.getElementById('m7com').value||null});box.style.display='none'};}
 window.mapVisitAction=function(id,status){if(status==='fait')return doneModal(id);return saveStatus(id,status)};
 window.mapVisitActionV9=window.mapVisitAction;
 window.saveMapDone=function(id){return doneModal(id)};
 window.claimHousehold=function(id){
   const h=households.find(x=>x.id===id);
   if(!h)return toast('Adresse introuvable');
   if(shared(h))return toast('La tournée commune Moulet–Marcenat ne doit pas être rattachée à une équipe');
   if(locked(h))return toast('Cette tournée est clôturée : rouvre-la avant de déplacer cette adresse');

   const current=owner(h);
   const allowed=me?.role==='admin'
     ?(teams||[]).filter(t=>t.active!==false)
     :(teams||[]).filter(t=>mine().includes(t.id));
   if(!allowed.length)return toast('Aucune équipe disponible');

   /* V13 : plus aucun prompt()/confirm() natif.
      Sur iOS PWA ces boîtes système peuvent provoquer un repaint Leaflet/SVG
      et faire disparaître visuellement des marqueurs. On reste 100 % dans le DOM. */
   try{map?.closePopup?.()}catch(_){}

   let box=document.getElementById('mapTeamModalV13');
   if(!box){box=document.createElement('div');box.id='mapTeamModalV13';document.body.appendChild(box)}
   box.style.cssText='position:fixed;inset:0;z-index:13000;background:rgba(0,0,0,.45);padding:calc(env(safe-area-inset-top) + 8px) 12px calc(env(safe-area-inset-bottom) + 8px);overflow:auto;display:flex;align-items:flex-start;justify-content:center;-webkit-overflow-scrolling:touch';

   const opts=allowed.map(t=>`<option value="${esc7(t.id)}" ${t.id===current?'selected':''}>${esc7(t.name)}${t.id===current?' — actuelle':''}</option>`).join('');
   box.innerHTML=`<div style="background:#fff;width:min(520px,100%);margin:18px auto;border-radius:16px;padding:16px;box-shadow:0 8px 30px #0005">
     <b style="font-size:18px">📍 Modifier l’équipe</b>
     <div style="margin-top:8px"><b>${esc7(h.house_number||'')} ${esc7(h.street||'')}</b><br><span class="muted">${esc7(h.locality||'')}</span></div>
     <br><label>Équipe</label><select id="mapTeamSelectV13">${opts}</select>
     <button class="btn green" id="mapTeamSaveV13" style="width:100%;margin-top:12px">Valider le changement</button>
     <button class="btn alt" id="mapTeamCancelV13" style="width:100%;margin-top:8px">Annuler</button>
   </div>`;

   const close=()=>{box.style.display='none';try{map?.invalidateSize?.({pan:false})}catch(_){}};
   document.getElementById('mapTeamCancelV13').onclick=close;
   box.onclick=e=>{if(e.target===box)close()};

   document.getElementById('mapTeamSaveV13').onclick=async()=>{
     const targetId=document.getElementById('mapTeamSelectV13').value;
     const target=allowed.find(t=>String(t.id)===String(targetId));
     if(!target)return;
     if(target.id===current){close();return toast('Cette adresse est déjà dans '+tname(current))}
     const btn=document.getElementById('mapTeamSaveV13');btn.disabled=true;btn.textContent='Enregistrement…';
     const {data,error}=await sb.rpc('claim_household_for_my_team',{p_household_id:id,p_team_id:target.id});
     if(error){btn.disabled=false;btn.textContent='Valider le changement';return toast('Correction impossible : '+error.message)}
     if(data){
       const i=households.findIndex(x=>x.id===id);if(i>=0)households[i]={...households[i],...data};
     }else{
       const r=await sb.from('households').select('*').eq('id',id).maybeSingle();
       if(r.data){const i=households.findIndex(x=>x.id===id);if(i>=0)households[i]={...households[i],...r.data}}
     }
     close();
     try{renderHouses();renderStats();window.renderMap()}catch(_){}
     toast('Adresse déplacée : '+tname(current)+' → '+target.name);
   };
 };

 /* V8: aucun filtrage par getBounds et aucun rerender lors d'un déplacement.
    Les marqueurs sont tous créés et restent dans la couche Leaflet. */
 window.renderMap=function(){
   if(!map){
     map=L.map('map').setView([45.872,3.038],13);
     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
     try{window.__mapCanvasV13=L.canvas({padding:.5})}catch(_){}
   }
   markers.forEach(m=>{try{m.remove()}catch(_){}});
   markers=[];
   const ids=mine();
   (households||[])
    .filter(h=>h.active!==false&&h.is_visitable!==false&&h.latitude&&h.longitude)
    .forEach(h=>{
      const st=visitFor(h.id)?.status||'a_faire',r=route(h),own=r.s||ids.includes(r.o),name=r.s?'Tournée commune Moulet–Marcenat':tname(r.o),color=st==='fait'?'green':(['absent','a_repasser'].includes(st)?'orange':st==='refus'?'black':'gray'),help=r.help;
      let html=`<b>${esc7(h.house_number||'')} ${esc7(h.street||'')}</b><br>${esc7(h.locality||'')}<br><b>🚒 ${esc7(name)}</b><br>${help?'<b>🤝 Passage pour aider cette tournée</b><br>':''}<span class="muted">${esc7(st)}</span><br><br><button onclick="mapVisitAction('${h.id}','fait')">✅ Fait</button> <button onclick="mapVisitAction('${h.id}','absent')">🚪 Absent</button> <button onclick="mapVisitAction('${h.id}','a_repasser')">🔄 À repasser</button> <button onclick="mapVisitAction('${h.id}','refus')">⛔ Refus</button>`;
      if(!r.s&&(me?.role==='admin'||!own))html+=`<br><br><button onclick="event.preventDefault();event.stopPropagation();claimHousehold('${h.id}')">📍 Modifier l’équipe de cette adresse</button>`;
      const m=L.circleMarker([+h.latitude,+h.longitude],{radius:own?7:5,color,fillOpacity:own?.8:.35,renderer:window.__mapCanvasV13||undefined}).addTo(map).bindPopup(html,{maxWidth:340,autoPan:false,keepInView:false});
      m.__houseId=h.id;markers.push(m);
    });
   setTimeout(()=>{try{map.invalidateSize({pan:false})}catch(_){}},100);
 };
 setTimeout(()=>{try{window.renderMap()}catch(e){console.error('map-house-actions V10',e)}},900);
})();
