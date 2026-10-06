/* Amicale SP Volvic — Carte "Fait" : hors connexion + conflit V3 */
(function(){
 function install(){
  if(typeof window.mapVisitAction!=='function') return setTimeout(install,300);
  const previous=window.mapVisitAction;
  const getHouse=id=>{try{return (households||[]).find(x=>x.id===id)}catch(_){return null}};
  const stamp=v=>v?.client_updated_at||v?.updated_at||v?.visited_at||null;

  async function conflictOK(id){
   if(!navigator.onLine) return true;
   try{
    const local=visitFor(id)||null;
    const {data,error}=await sb.from('visits').select('*')
      .eq('campaign_id',campaign.id).eq('household_id',id).maybeSingle();
    if(error||!data) return true;
    if(local && String(stamp(local)||'')===String(stamp(data)||'')) return true;
    try{if(typeof applyLocal==='function')applyLocal(data)}catch(_){}
    try{renderStats();renderHouses();window.renderMap?.()}catch(_){}
    alert("⚠️ Cette maison vient d’être modifiée sur un autre téléphone.\n\nLa dernière saisie a été rechargée. Vérifie-la puis appuie de nouveau sur « Fait ».");
    return false;
   }catch(_){return true}
  }

  function isShared(h){
   try{
    if(typeof isSharedRoundHouse==='function') return !!isSharedRoundHouse(h);
    const s=(sectors||[]).find(x=>x.id===h.sector_id);
    const c=(cities||[]).find(x=>x.id===(h.city_id||s?.city_id));
    return !!c?.shared_round;
   }catch(_){return false}
  }

  function makePayload(id,e){
   const h=getHouse(id), shared=isShared(h);
   let owner=null,mine=null;
   try{owner=shared?null:teamForHouse(h)}catch(_){}
   try{mine=(myTeamIds()||[])[0]||null}catch(_){}
   const now=new Date().toISOString();
   return {campaign_id:campaign.id,household_id:id,team_id:owner,original_team_id:owner,
    helper_mode:!shared&&!!owner&&!!mine&&owner!==mine,status:'fait',
    calendars_count:e.calendars_count,amount:e.amount,payment_method:e.payment_method,
    visit_comment:e.visit_comment,visited_by:me.id,visited_at:now,updated_at:now,client_updated_at:now};
  }

  function keep(p,msg){
   try{window.queue?.(p)}catch(_){}
   try{if(typeof applyLocal==='function')applyLocal(p)}catch(_){}
   try{setSync('Saisie en attente',true)}catch(_){}
   try{renderStats();renderHouses();window.renderMap?.()}catch(_){}
   toast(msg,true);
  }

  async function saveDone(id,e){
   const h=getHouse(id); if(!h){toast('Adresse introuvable');return false}
   try{if(window.isHouseFinalLocked?.(h)){toast('Cette tournée est clôturée');return false}}catch(_){}
   if(!(await conflictOK(id))) return false;
   const p=makePayload(id,e);
   if(!navigator.onLine){keep(p,'Enregistré hors connexion');return true}
   try{
    const {data,error}=await sb.from('visits').upsert(p,{onConflict:'campaign_id,household_id'}).select().single();
    if(error){keep(p,'Réseau faible : saisie conservée');return true}
    try{if(typeof applyLocal==='function')applyLocal(data)}catch(_){}
    try{await sb.from('visit_presence').delete().eq('household_id',id).eq('user_id',me.id)}catch(_){}
    try{renderStats();renderHouses();window.renderMap?.()}catch(_){}
    toast('Passage enregistré',true); return true;
   }catch(_){keep(p,'Réseau faible : saisie conservée');return true}
  }

  function modal(id){
   const h=getHouse(id),v=visitFor(id)||{}; if(!h)return;
   let b=document.getElementById('mapDoneOfflineV2');
   if(!b){b=document.createElement('div');b.id='mapDoneOfflineV2';document.body.appendChild(b)}
   b.style.cssText='position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.45);padding:calc(env(safe-area-inset-top) + 8px) 12px calc(env(safe-area-inset-bottom) + 8px);overflow:auto;display:flex;align-items:flex-start;justify-content:center';
   const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
   b.innerHTML=`<div style="background:#fff;width:min(520px,100%);margin:18px auto;border-radius:16px;padding:16px"><b style="font-size:18px">✅ Passage — ${esc(h.house_number)} ${esc(h.street)}</b><br><br><label>Calendriers</label><input id="mofCal" type="number" min="0" inputmode="numeric" value="${v.calendars_count??1}"><label>Don (€)</label><input id="mofAmt" type="number" min="0" step=".01" inputmode="decimal" value="${v.amount??''}"><label>Mode de paiement</label><select id="mofPay"><option value="">— Choisir —</option>${['especes','carte','cheque','autre'].map(x=>`<option value="${x}" ${v.payment_method===x?'selected':''}>${x}</option>`).join('')}</select><label>Commentaire</label><input id="mofCom" value="${esc(v.visit_comment||'')}"><br><button class="btn green" style="width:100%;margin-top:10px" id="mofSave">✅ Valider le passage</button><button class="btn alt" style="width:100%;margin-top:8px" id="mofCancel">Annuler</button></div>`;
   document.getElementById('mofCancel').onclick=()=>b.style.display='none';
   document.getElementById('mofSave').onclick=async()=>{
    const ok=await saveDone(id,{calendars_count:+document.getElementById('mofCal').value||0,amount:+document.getElementById('mofAmt').value||0,payment_method:document.getElementById('mofPay').value||null,visit_comment:document.getElementById('mofCom').value||null});
    if(ok)b.style.display='none';
   };
  }
  window.mapVisitAction=function(id,status){if(status==='fait')return modal(id);return previous.apply(this,arguments)};
  window.mapVisitActionV9=window.mapVisitAction; window.saveMapDone=modal;
 }
 setTimeout(install,3200);
})();