/* Correctif fin de journée — Amicale SP Volvic
   Compatible équipes + Moulet-Marcenat tournée commune.
*/
(function(){
 const E=id=>document.getElementById(id), money=n=>(+n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
 function isSharedHouse(h){const s=sectors.find(x=>x.id===h?.sector_id),c=cities.find(x=>x.id===s?.city_id);return c?.shared_round===true}
 function install(){
   const tour=E('page-tour'); if(!tour||E('endDayCard')) return;
   const card=document.createElement('div'); card.className='card'; card.id='endDayCard';
   card.innerHTML='<div class="sectionTitle">🧾 Fin de journée</div><p class="muted">Contrôle la caisse et enregistre avec qui les passages ont été effectués. Cette action ne termine pas la tournée.</p><button class="btn bigstart" id="endDay">🧾 Fin de journée / contrôle caisse</button><div id="endDayPanel" class="hidden" style="margin-top:12px"></div>';
   tour.appendChild(card); E('endDay').onclick=openPanel;
 }
 async function partnerOptions(){
   const {data:profiles}=await sb.from('profiles').select('id,full_name,email').eq('active',true);
   const {data:ext}=await sb.from('external_helpers').select('id,full_name').eq('active',true);
   return {profiles:profiles||[],ext:ext||[]};
 }
 function context(){
   const shared=E('teamView')?.value==='__shared__';
   let teamId=shared?null:(E('teamView')?.value||myTeamIds()[0]||null);
   const hs=households.filter(h=>h.active!==false&&h.is_visitable!==false&&h.dwelling_type!=='immeuble'&&(shared?isSharedHouse(h):teamForHouse(h)===teamId));
   return {shared,teamId,ids:new Set(hs.map(h=>h.id))};
 }
 async function openPanel(){
   const ctx=context(); if(!ctx.shared&&!ctx.teamId)return toast('Choisis une équipe ou la tournée commune');
   const p=E('endDayPanel'); p.classList.remove('hidden'); p.innerHTML='⏳ Calcul de la journée…';
   const day=new Date(); day.setHours(0,0,0,0);
   const vv=visits.filter(v=>ctx.ids.has(v.household_id)&&v.status==='fait'&&new Date(v.visited_at||v.updated_at)>=day);
   const cal=vv.reduce((n,v)=>n+(+v.calendars_count||0),0), amt=vv.reduce((n,v)=>n+(+v.amount||0),0);
   const pay={}; vv.forEach(v=>{if(v.payment_method)pay[v.payment_method]=(pay[v.payment_method]||0)+(+v.amount||0)});
   const partners=await partnerOptions();
   const opts=['<option value="">— Choisir —</option>']
     .concat(partners.profiles.filter(x=>x.id!==me.id).map(x=>'<option value="u:'+x.id+'">'+esc(x.full_name||x.email||'Membre')+'</option>'))
     .concat(partners.ext.map(x=>'<option value="e:'+x.id+'">'+esc(x.full_name)+'</option>')).join('');
   p.innerHTML='<div class="street"><b>'+(ctx.shared?'👥 Moulet-Marcenat — tournée commune':'👥 '+esc(teams.find(t=>t.id===ctx.teamId)?.name||'Équipe'))+'</b>'+
    '<div class="muted">'+vv.length+' foyer(s) fait(s) aujourd’hui · '+cal+' calendrier(s) · '+money(amt)+'</div>'+
    '<div class="muted">Espèces : '+money(pay.especes||0)+' · Chèque : '+money(pay.cheque||0)+' · Carte : '+money(pay.carte||0)+'</div></div>'+
    '<label>Avec qui as-tu fait les passages ?</label><select id="dayPartner">'+opts+'</select><br><br>'+
    '<label>Espèces réellement comptées</label><input id="dayCash" type="number" step="0.01" inputmode="decimal" value="'+(+pay.especes||0)+'"><br><br>'+
    '<textarea id="dayNote" placeholder="Remarque de fin de journée (facultatif)"></textarea><br><br>'+
    '<button class="btn green bigstart" id="saveEndDay">✅ Valider la fin de journée</button>';
   E('saveEndDay').onclick=()=>save(ctx,vv,cal,pay);
 }
 async function save(ctx,vv,cal,pay){
   const raw=E('dayPartner').value;if(!raw)return toast('Choisis la personne avec qui tu as fait les passages');
   const profiles=(await sb.from('profiles').select('id,full_name,email').eq('active',true)).data||[];
   const ext=(await sb.from('external_helpers').select('id,full_name').eq('active',true)).data||[];
   let partner_user_id=null,partner_name_snapshot='';
   if(raw.startsWith('u:')){partner_user_id=raw.slice(2);const x=profiles.find(y=>y.id===partner_user_id);partner_name_snapshot=x?.full_name||x?.email||'Membre'}
   else {const id=raw.slice(2),x=ext.find(y=>y.id===id);partner_name_snapshot=x?.full_name||'Accompagnant'}
   const times=vv.map(v=>new Date(v.visited_at||v.updated_at)).filter(d=>!isNaN(d));
   const now=new Date().toISOString(), start=times.length?new Date(Math.min(...times)).toISOString():now;
   const payload={campaign_id:campaign.id,team_id:ctx.teamId,user_id:me.id,expected_cash:+pay.especes||0,counted_cash:+E('dayCash').value||0,
    expected_cheque:+pay.cheque||0,expected_card:+pay.carte||0,expected_other:Object.entries(pay).filter(([k])=>!['especes','cheque','carte'].includes(k)).reduce((n,[,v])=>n+(+v||0),0),
    calendars_count:cal,completed_count:vv.length,revisit_count:0,closed_at:now,note:E('dayNote').value||null,closing_type:'day',period_start:start,period_end:now,
    partner_user_id,partner_name_snapshot,scope:ctx.shared?'shared':'team'};
   const {error}=await sb.from('tour_closings').insert(payload);if(error)return toast('Erreur fin de journée : '+error.message);
   toast('✅ Fin de journée enregistrée');E('endDayPanel').classList.add('hidden');
 }
 const old=window.renderHouses; window.renderHouses=function(){const r=typeof old==='function'?old.apply(this,arguments):undefined;install();return r};
 setTimeout(install,0);
})();