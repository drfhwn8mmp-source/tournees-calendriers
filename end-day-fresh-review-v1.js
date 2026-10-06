/* Amicale SP Volvic — fin de journée : garde bilan frais V1 */
(function(){
 let busy=false;
 const E=id=>document.getElementById(id);
 function shown(){
   const p=E('endDayPanel'); if(!p||p.classList.contains('hidden'))return null;
   const m=(p.querySelector('.street .muted')?.textContent||'').match(/(\d+)\s+foyer.*?·\s*(\d+)\s+calendrier.*?·\s*([\d\s\u202f,]+)\s*€/i);
   if(!m)return null;
   return {count:+m[1],cal:+m[2],amt:parseFloat(m[3].replace(/[\s\u202f]/g,'').replace(',','.'))||0};
 }
 function context(){
   const shared=E('teamView')?.value==='__shared__';
   const teamId=shared?null:(E('teamView')?.value||myTeamIds()[0]||null);
   const sh=h=>{const s=sectors.find(x=>x.id===h?.sector_id),c=cities.find(x=>x.id===s?.city_id);return c?.shared_round===true};
   const hs=households.filter(h=>h.active!==false&&h.is_visitable!==false&&h.dwelling_type!=='immeuble'&&(shared?sh(h):teamForHouse(h)===teamId));
   return {shared,teamId,ids:hs.map(h=>h.id)};
 }
 async function latest(c){
   let q=sb.from('tour_closings').select('period_end').eq('campaign_id',campaign.id).eq('closing_type','day').eq('scope',c.shared?'shared':'team');
   q=c.shared?q.is('team_id',null):q.eq('team_id',c.teamId);
   const {data,error}=await q.order('period_end',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data;
 }
 async function fresh(c){
   let since=new Date();since.setHours(0,0,0,0);
   const l=await latest(c);if(l?.period_end&&new Date(l.period_end)>since)since=new Date(l.period_end);
   if(!c.ids.length)return {count:0,cal:0,amt:0};
   const {data,error}=await sb.from('visits').select('calendars_count,amount').eq('campaign_id',campaign.id).eq('status','fait').in('household_id',c.ids).gt('visited_at',since.toISOString());
   if(error)throw error;const a=data||[];
   return {count:a.length,cal:a.reduce((n,v)=>n+(+v.calendars_count||0),0),amt:Math.round(a.reduce((n,v)=>n+(+v.amount||0),0)*100)/100};
 }
 function same(a,b){return a&&b&&a.count===b.count&&a.cal===b.cal&&Math.abs(a.amt-b.amt)<.005}
 function install(){
   const card=E('endDayCard');if(!card||card.__freshDayGuard)return;
   card.__freshDayGuard=true;
   card.addEventListener('click',async e=>{
     const b=e.target.closest('#saveEndDay');if(!b||busy||b.dataset.freshOk==='1')return;
     e.preventDefault();e.stopImmediatePropagation();
     if(!navigator.onLine){alert('⛔ Fin de journée impossible hors connexion.\n\nReconnecte le téléphone pour vérifier les derniers passages.');return}
     const before=shown();if(!before)return;
     busy=true;b.disabled=true;
     try{
       const after=await fresh(context());
       if(!same(before,after)){
         alert('⚠️ Le bilan de la journée a changé depuis l’ouverture de l’écran.\n\nLes derniers passages doivent être affichés avant de valider la caisse. L’écran va être actualisé.');
         E('endDayPanel')?.classList.add('hidden');
         E('endDay')?.click();
         return;
       }
       const nb=E('saveEndDay');if(!nb)return;nb.dataset.freshOk='1';nb.click();
       setTimeout(()=>{try{delete nb.dataset.freshOk}catch(_){}},0);
     }catch(_){alert('⛔ Impossible de revérifier le bilan sur le serveur.\n\nLa fin de journée n’a pas été enregistrée. Réessaie avec une connexion stable.')}
     finally{busy=false;const x=E('saveEndDay');if(x)x.disabled=false}
   },true);
 }
 setTimeout(install,700);
 addEventListener('pageshow',()=>setTimeout(install,200));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,200)});
})();
