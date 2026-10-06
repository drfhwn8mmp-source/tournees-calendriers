/* Amicale SP Volvic — fin de journée V4
   Relecture serveur des visites avant calcul et validation. */
(function(){
 const E=id=>document.getElementById(id), money=n=>(+n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
 let saving=false;
 function isSharedHouse(h){const s=sectors.find(x=>x.id===h?.sector_id),c=cities.find(x=>x.id===s?.city_id);return c?.shared_round===true}
 function install(){
   const tour=E('page-tour');if(!tour)return;
   E('endDayCard')?.remove();
   const card=document.createElement('div');card.className='card';card.id='endDayCard';
   card.innerHTML='<div class="sectionTitle">🧾 Fin de journée</div><p class="muted">Contrôle la caisse et enregistre avec qui les passages ont été effectués. Cette action ne termine pas la tournée.</p><button class="btn bigstart" id="endDay">🧾 Fin de journée / contrôle caisse</button><div id="endDayPanel" class="hidden" style="margin-top:12px"></div>';
   tour.appendChild(card);E('endDay').onclick=openPanel;
 }
 function context(){
   const shared=E('teamView')?.value==='__shared__';
   const teamId=shared?null:(E('teamView')?.value||myTeamIds()[0]||null);
   const hs=households.filter(h=>h.active!==false&&h.is_visitable!==false&&h.dwelling_type!=='immeuble'&&(shared?isSharedHouse(h):teamForHouse(h)===teamId));
   return {shared,teamId,ids:new Set(hs.map(h=>h.id))};
 }
 async function latestClose(ctx){
   let q=sb.from('tour_closings').select('id,period_end,user_id,partner_user_id,partner_name_snapshot').eq('campaign_id',campaign.id).eq('closing_type','day').eq('scope',ctx.shared?'shared':'team');
   q=ctx.shared?q.is('team_id',null):q.eq('team_id',ctx.teamId);
   const {data}=await q.order('period_end',{ascending:false}).limit(1).maybeSingle();return data||null;
 }
 async function serverVisits(ctx,since){
   const ids=[...ctx.ids];if(!ids.length)return [];
   const {data,error}=await sb.from('visits').select('*').eq('campaign_id',campaign.id).eq('status','fait').in('household_id',ids).gt('visited_at',since.toISOString());
   if(error)throw error;
   return data||[];
 }
 async function openPanel(){
   const ctx=context();if(!ctx.shared&&!ctx.teamId)return toast('Choisis une équipe ou la tournée commune');
   const p=E('endDayPanel');p.classList.remove('hidden');p.innerHTML='⏳ Relecture serveur et calcul de la journée…';
   try{
     const day=new Date();day.setHours(0,0,0,0);let since=day;
     const lastClose=await latestClose(ctx);if(lastClose?.period_end&&new Date(lastClose.period_end)>since)since=new Date(lastClose.period_end);
     const vv=await serverVisits(ctx,since);
     const cal=vv.reduce((n,v)=>n+(+v.calendars_count||0),0),amt=vv.reduce((n,v)=>n+(+v.amount||0),0),pay={};
     vv.forEach(v=>{if(v.payment_method)pay[v.payment_method]=(pay[v.payment_method]||0)+(+v.amount||0)});
     const {data:profiles}=await sb.from('profiles').select('id,full_name,email').eq('active',true);
     const opts=['<option value="">— Choisir un membre —</option>'].concat((profiles||[]).filter(x=>x.id!==me.id).map(x=>'<option value="'+x.id+'">'+esc(x.full_name||x.email||'Membre')+'</option>')).join('');
     p.innerHTML='<div class="street"><b>'+(ctx.shared?'👥 Moulet-Marcenat — tournée commune':'👥 '+esc(teams.find(t=>t.id===ctx.teamId)?.name||'Équipe'))+'</b><div class="muted">'+vv.length+' foyer(s) fait(s) aujourd’hui · '+cal+' calendrier(s) · '+money(amt)+'</div><div class="muted">Espèces : '+money(pay.especes||0)+' · Chèque : '+money(pay.cheque||0)+' · Carte : '+money(pay.carte||0)+'</div></div><label>Avec qui as-tu fait les passages ?</label><select id="dayPartner">'+opts+'</select><div class="muted" style="margin:7px 0">Si la personne n’a pas de compte dans l’application :</div><input id="dayPartnerFree" placeholder="Nom et prénom de l’ancien / accompagnant"><br><br><label>Espèces réellement comptées</label><input id="dayCash" type="number" step="0.01" inputmode="decimal" value="'+(+pay.especes||0)+'"><br><br><textarea id="dayNote" placeholder="Remarque de fin de journée (facultatif)"></textarea><br><br><button class="btn green bigstart" id="saveEndDay">✅ Valider la fin de journée</button>';
     E('saveEndDay').onclick=()=>save(ctx,since,profiles||[]);
   }catch(e){p.innerHTML='⚠️ Impossible de relire les passages sur le serveur. Vérifie la connexion puis réessaie.'}
 }
 async function save(ctx,since,profiles){
   if(saving)return toast('Validation déjà en cours…');
   const uid=E('dayPartner').value,free=E('dayPartnerFree').value.trim();
   if(!uid&&!free)return toast('Choisis un membre ou saisis le nom de l’accompagnant');
   if(uid&&free)return toast('Choisis soit un membre, soit un accompagnant');
   saving=true;const btn=E('saveEndDay');if(btn){btn.disabled=true;btn.textContent='⏳ Vérification serveur…'}
   try{
     const last=await latestClose(ctx);let freshSince=since;
     if(last?.period_end&&new Date(last.period_end)>freshSince)freshSince=new Date(last.period_end);
     const fresh=await serverVisits(ctx,freshSince);
     if(!fresh.length)return toast('⚠️ Aucun nouveau passage à clôturer ou journée déjà enregistrée');
     let partner_user_id=uid||null,partner_name_snapshot=free;
     if(uid){const x=profiles.find(y=>y.id===uid);partner_name_snapshot=x?.full_name||x?.email||'Membre'}
     if(free){const {data:old}=await sb.from('external_helpers').select('id,full_name').ilike('full_name',free).limit(1).maybeSingle();if(!old)await sb.from('external_helpers').insert({full_name:free,active:true,created_by:me.id})}
     const freshPay={};fresh.forEach(v=>{if(v.payment_method)freshPay[v.payment_method]=(freshPay[v.payment_method]||0)+(+v.amount||0)});
     const freshCal=fresh.reduce((n,v)=>n+(+v.calendars_count||0),0),times=fresh.map(v=>new Date(v.visited_at||v.updated_at)).filter(d=>!isNaN(d)),now=new Date().toISOString(),start=times.length?new Date(Math.min(...times)).toISOString():now;
     const payload={campaign_id:campaign.id,team_id:ctx.teamId,user_id:me.id,expected_cash:+freshPay.especes||0,counted_cash:+E('dayCash').value||0,expected_cheque:+freshPay.cheque||0,expected_card:+freshPay.carte||0,expected_other:Object.entries(freshPay).filter(([k])=>!['especes','cheque','carte'].includes(k)).reduce((n,[,v])=>n+(+v||0),0),calendars_count:freshCal,completed_count:fresh.length,revisit_count:0,closed_at:now,note:E('dayNote').value||null,closing_type:'day',period_start:start,period_end:now,partner_user_id,partner_name_snapshot,scope:ctx.shared?'shared':'team'};
     const {error}=await sb.from('tour_closings').insert(payload);if(error)return toast('Erreur fin de journée : '+error.message);
     toast('✅ Fin de journée enregistrée');E('endDayPanel').classList.add('hidden');
   }catch(e){toast('⚠️ Connexion insuffisante : fin de journée non enregistrée',true)}
   finally{saving=false;if(btn){btn.disabled=false;btn.textContent='✅ Valider la fin de journée'}}
 }
 setTimeout(install,0);
})();