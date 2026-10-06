/* Accueil V3 — statistiques autoritaires directement depuis Supabase
   Une seule source de vérité pour les totaux d'équipes et Moulet-Marcenat.
   Aucun changement de données : lecture uniquement.
*/
(function(){
 const E=id=>document.getElementById(id);
 const money=n=>(+n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

 async function allRows(table, select='*', apply=q=>q){
   const out=[], PAGE=1000;
   for(let from=0;;from+=PAGE){
     let q=apply(sb.from(table).select(select)).range(from,from+PAGE-1);
     const {data,error}=await q;
     if(error) throw error;
     out.push(...(data||[]));
     if(!data || data.length<PAGE) break;
   }
   return out;
 }
 function summarize(list, visitMap){
   let fait=0,redo=0,refus=0,rest=0,cal=0,amt=0,pay={};
   for(const h of list){
     const v=visitMap.get(h.id), st=v?.status||'a_faire';
     if(st==='fait'){
       fait++; cal+=+v?.calendars_count||0; amt+=+v?.amount||0;
       if(v?.payment_method) pay[v.payment_method]=(pay[v.payment_method]||0)+(+v.amount||0);
     } else if(st==='absent'||st==='a_repasser') redo++;
     else if(st==='refus') refus++;
     else rest++;
   }
   return {total:list.length,fait,redo,refus,rest,cal,amt,pay};
 }
 function setMain(s){
   [['sTotal',s.total],['sDone',s.fait],['sRedo',s.redo],['sRemain',s.rest],
    ['sCalendars',s.cal],['sAmount',money(s.amt)]].forEach(([id,v])=>{if(E(id))E(id).textContent=v});
   let grid=E('sTotal')?.closest('.grid'), r=E('sRefus');
   if(grid&&!r){const d=document.createElement('div');d.className='stat';d.innerHTML='<b id="sRefus">0</b>Refus';grid.appendChild(d);r=E('sRefus')}
   if(r)r.textContent=s.refus;
   if(E('paymentStats'))E('paymentStats').textContent=
     Object.entries(s.pay).map(([k,v])=>`${k}: ${money(v)}`).join(' · ')||'Aucun encaissement';
 }
 function sharedCard(s){
   let box=E('homeSeparatedRounds');
   if(!box){box=document.createElement('div');box.id='homeSeparatedRounds';E('teamProgress')?.closest('.card')?.before(box)}
   if(!box)return;
   box.innerHTML=`<div class="card"><div class="sectionTitle">👥 Moulet-Marcenat — tournée commune</div>
   <div class="grid g4">
    <div class="stat"><b>${s.total}</b>Foyers</div><div class="stat"><b>${s.fait}</b>Faits</div>
    <div class="stat"><b>${s.redo}</b>À repasser</div><div class="stat"><b>${s.rest}</b>Restants</div>
    <div class="stat"><b>${s.refus}</b>Refus</div>
   </div><br><div class="grid g2">
    <div class="stat"><b>${s.cal}</b>Calendriers</div><div class="stat"><b>${money(s.amt)}</b>Dons</div>
   </div><div class="muted">${Object.entries(s.pay).map(([k,v])=>`${esc(k)}: ${money(v)}`).join(' · ')||'Aucun encaissement'}</div>
   <br><div class="progress"><span style="width:${s.total?Math.round((s.fait+s.refus)/s.total*100):0}%"></span></div>
   <div class="muted">${s.fait+s.refus}/${s.total} foyer(s) terminé(s)</div></div>`;
 }
 function progress(rows){
   if(!E('teamProgress'))return;
   E('teamProgress').innerHTML=rows.map(x=>{
     const done=x.s.fait+x.s.refus, pct=x.s.total?Math.round(done/x.s.total*100):0;
     return `<div class="street"><b>${esc(x.name)} — ${done}/${x.s.total} (${pct} %)</b>
       <div class="progress"><span style="width:${pct}%"></span></div></div>`;
   }).join('');
 }

 async function refresh(){
   if(typeof sb==='undefined'||!campaign)return;
   try{
     // Read the complete active dataset directly, independent of UI/RLS-side partial local arrays.
     const [hh, vv, ss, cc, tt, ts, tm]=await Promise.all([
       allRows('households','*',q=>q.eq('active',true)),
       allRows('visits','*',q=>q.eq('campaign_id',campaign.id)),
       allRows('sectors'), allRows('cities'), allRows('teams'), allRows('team_streets'), allRows('team_members')
     ]);
     const sectorCity=new Map(ss.map(x=>[x.id,x.city_id]));
     const sharedCities=new Set(cc.filter(x=>x.shared_round===true).map(x=>x.id));
     const shared=h=>sharedCities.has(sectorCity.get(h.sector_id));
     const visitable=h=>h.active!==false&&h.is_visitable!==false&&h.dwelling_type!=='immeuble';
     const normal=hh.filter(h=>visitable(h)&&!shared(h));
     const sharedHH=hh.filter(h=>visitable(h)&&shared(h));
     const vm=new Map(vv.map(v=>[v.household_id,v]));
     const streetTeam=new Map(ts.map(x=>[x.street_id,x.team_id]));
     const teamStats=tt.map(t=>({id:t.id,name:t.name,s:summarize(normal.filter(h=>streetTeam.get(h.street_id)===t.id),vm)}));
     const sharedStats=summarize(sharedHH,vm);

     let main;
     if(me?.role==='admin') main=summarize(normal,vm);
     else{
       const own=new Set(tm.filter(x=>x.user_id===me?.id).map(x=>x.team_id));
       main=summarize(normal.filter(h=>own.has(streetTeam.get(h.street_id))),vm);
     }
     setMain(main);
     sharedCard(sharedStats);
     progress([...teamStats,{name:'👥 Moulet-Marcenat',s:sharedStats}]);
     window.__homeAuthoritativeStats={teamStats,sharedStats,main};
   }catch(e){console.error('Accueil V3:',e)}
 }
 const old=window.renderStats;
 window.renderStats=function(){if(typeof old==='function')old();setTimeout(refresh,50)};
 [400,1000,2500,5000].forEach(ms=>setTimeout(refresh,ms));
 E('refreshBtn')?.addEventListener('click',()=>setTimeout(refresh,500));
 window.refreshAuthoritativeHomeStats=refresh;
})();