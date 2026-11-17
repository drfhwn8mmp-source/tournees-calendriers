/* Amicale Volvic — chargement intégral et contrôlé, novembre 2026.
   Aucun changement en base; pagination, vérification, rechargement sans perte des visites locales. */
(function(){
 'use strict';
 const PAGE=500; let loading=false, lastGood=0, lastVisitSync=0;
 const collator=new Intl.Collator('fr',{numeric:true,sensitivity:'base'});
 const sortH=(a,b)=>collator.compare(a.street||'',b.street||'')||collator.compare(a.house_number||'',b.house_number||'')||collator.compare(a.locality||'',b.locality||'');
 async function fetchAll(table,filter){
  const result=[];let from=0;
  for(;;){
   const {data,error}=await filter(sb.from(table).select('*')).order('id',{ascending:true}).range(from,from+PAGE-1);
   if(error)throw error;
   result.push(...(data||[]));
   if(!data||data.length<PAGE)break;
   from+=PAGE;
   if(from>100000)throw new Error('Limite de sécurité de chargement');
  }
  return result;
 }
 async function countActive(){const {count,error}=await sb.from('households').select('id',{count:'exact',head:true}).eq('active',true);if(error)throw error;return count}
 async function syncAll(force){
  if(loading||typeof sb==='undefined'||typeof campaign==='undefined'||!campaign)return;
  loading=true;
  try{
   const expected=await countActive();
   if(!force&&lastGood===expected&&households.length===expected&&Date.now()-lastVisitSync<90000)return;
   const fresh=await fetchAll('households',q=>q.eq('active',true));
   if(fresh.length!==expected)throw new Error(`Adresses incomplètes (${fresh.length}/${expected})`);
   const current=new Map((households||[]).map(h=>[h.id,h]));
   const ids=new Set();
   const merged=fresh.map(h=>{if(ids.has(h.id))throw new Error('Identifiant maison dupliqué');ids.add(h.id);return {...(current.get(h.id)||{}),...h}});
   merged.sort(sortH);
   // La campagne est rechargée par pages. Ne pas effacer une saisie locale plus récente.
   const vfresh=await fetchAll('visits',q=>q.eq('campaign_id',campaign.id));
   const old=new Map((visits||[]).filter(v=>v.id||v.household_id).map(v=>[v.household_id,v]));
   const mergedVisits=new Map(vfresh.map(v=>[v.household_id,v]));
   for(const [id,v] of old){const server=mergedVisits.get(id);if(!server){if(v.id==null||v.__pending||v._pending)mergedVisits.set(id,v)}else if((v.__pending||v._pending)&&new Date(v.client_updated_at||0)>new Date(server.client_updated_at||server.updated_at||0)){mergedVisits.set(id,v)}}
   households=merged;visits=[...mergedVisits.values()];lastGood=expected;lastVisitSync=Date.now();
   try{renderFilters()}catch(e){console.warn('Filtres:',e)}
   try{renderHouses()}catch(e){console.warn('Maisons:',e)}
   try{renderStats()}catch(e){console.warn('Statistiques:',e)}
   try{window.renderMap?.()}catch(e){console.warn('Carte:',e)}
   try{setSync(`${expected} adresses chargées et vérifiées`)}catch(_){}
   window.__VOLVIC_ADDRESSES_READY=true;
  }catch(e){console.error('Chargement complet Volvic:',e);window.__VOLVIC_ADDRESSES_READY=false;
   try{setSync('Adresses incomplètes — réessayer',true)}catch(_){}
   try{toast('Chargement incomplet : '+e.message)}catch(_){}
  }finally{loading=false}
 }
 // Tableau de rattrapage : paiements sans reçu, accessible aux responsables.
 async function backlog(){
  const admin=document.getElementById('page-admin');
  if(!admin||!campaign||!me||!['admin','responsable'].includes(me.role))return;
  let panel=document.getElementById('volvicReceiptsBacklog');
  if(!panel){panel=document.createElement('div');panel.id='volvicReceiptsBacklog';panel.className='card';admin.appendChild(panel)}
  panel.textContent='Recherche des paiements sans reçu…';
  try{
   const [allReceipts,allVisits]=await Promise.all([
    fetchAll('receipts',q=>q.eq('campaign_id',campaign.id)),
    fetchAll('visits',q=>q.eq('campaign_id',campaign.id))
   ]);
   const received=new Set(allReceipts.filter(r=>!r.cancelled_at).map(r=>r.visit_id));
   const missing=allVisits.filter(v=>Number(v.amount)>0&&!received.has(v.id));
   panel.innerHTML='<h3>🧾 Reçus à régulariser</h3><p>'+missing.length+' passages payés sans reçu créé. Aucun envoi automatique : vérifier le destinataire.</p>';
   const list=document.createElement('div');panel.appendChild(list);
   for(const v of missing){
    const h=(households||[]).find(h=>h.id===v.household_id);
    const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid #ddd;padding:8px 0';
    const label=document.createElement('span');label.textContent=(h?`${h.house_number||''} ${h.street||''}`:'Maison '+v.household_id)+' — '+Number(v.amount).toFixed(2)+' €';row.appendChild(label);
    const btn=document.createElement('button');btn.className='btn alt';btn.textContent='Créer reçu';btn.onclick=()=>{if(window.volvicOpenReceiptForVisit)window.volvicOpenReceiptForVisit(v.household_id);else alert('Module reçu en cours de chargement')};row.appendChild(btn);list.appendChild(row);
   }
  }catch(e){panel.textContent='Impossible de charger les reçus à régulariser : '+e.message}
 }
 window.volvicRefreshReceipts=backlog;
 setTimeout(()=>{const t=setInterval(()=>{if(typeof campaign!=='undefined'&&campaign&&typeof me!=='undefined'&&me){clearInterval(t);setTimeout(backlog,4500)}},500);setTimeout(()=>clearInterval(t),20000)},1000);
 window.volvicReloadAddresses=()=>syncAll(true);
 const start=setInterval(()=>{if(typeof sb!=='undefined'&&typeof campaign!=='undefined'&&campaign){clearInterval(start);setTimeout(()=>syncAll(true),500)}},250);
 setTimeout(()=>clearInterval(start),20000);
 // Certains anciens scripts rechargent 1000 maisons et écrasent le jeu complet.
 // Un contrôle régulier restaure la liste sans réécrire la base.
 setInterval(()=>{if(lastGood&&typeof households!=='undefined'&&households.length<lastGood)syncAll(true)},12000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&lastGood&&households.length<lastGood)syncAll(true)});
})();
