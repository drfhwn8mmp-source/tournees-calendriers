/* Amicale SP Volvic — Passage carte V4, recherche fiable + reçu PDF par courriel.
   Préserve la queue hors ligne et les passages existants. */
(function(){
 'use strict';
 const EMAIL_AMICALE='recu.aspv63530@gmail.com';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>Number(n||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const pay=p=>({especes:'Espèces',carte:'Carte',cheque:'Chèque',autre:'Autre'}[p]||p||'Non renseigné');
 const findLocal=id=>{try{return (households||[]).find(h=>h.id===id)||null}catch(_){return null}};
 async function getHouse(id){
  const local=findLocal(id);if(local)return local;
  if(!navigator.onLine)return null;
  const {data,error}=await sb.from('households').select('*').eq('id',id).eq('active',true).maybeSingle();
  if(error)throw error;
  if(data){if(typeof households!=='undefined'&&!households.some(h=>h.id===data.id))households.push(data);return data}
  return null;
 }
 function isShared(h){try{if(typeof isSharedRoundHouse==='function')return !!isSharedRoundHouse(h);const s=(sectors||[]).find(x=>x.id===h.sector_id);const c=(cities||[]).find(x=>x.id===(h.city_id||s?.city_id));return !!c?.shared_round}catch(_){return false}}
 function makePayload(id,h,e){const shared=isShared(h);let owner=null,mine=null;try{owner=shared?null:teamForHouse(h)}catch(_){}try{mine=(myTeamIds()||[])[0]||null}catch(_){}const now=new Date().toISOString();return {campaign_id:campaign.id,household_id:id,team_id:owner,original_team_id:owner,helper_mode:!shared&&!!owner&&!!mine&&owner!==mine,status:'fait',calendars_count:e.calendars_count,amount:e.amount,payment_method:e.payment_method,visit_comment:e.visit_comment,visited_by:me.id,visited_at:now,updated_at:now,client_updated_at:now}}
 function pending(p){try{window.queue?.(p)}catch(e){console.error('Queue:',e)}try{if(typeof applyLocal==='function')applyLocal(p)}catch(_){}try{setSync('Passage en attente de synchronisation',true)}catch(_){}try{renderStats();renderHouses();window.renderMap?.()}catch(_){}toast('Passage conservé hors connexion — reçu après synchronisation',true)}
 function stamp(v){return v?.client_updated_at||v?.updated_at||v?.visited_at||null}
 async function conflictOK(id){if(!navigator.onLine)return true;try{const local=visitFor(id)||null;const {data,error}=await sb.from('visits').select('*').eq('campaign_id',campaign.id).eq('household_id',id).maybeSingle();if(error)throw error;if(!data)return true;if(local&&String(stamp(local)||'')===String(stamp(data)||''))return true;if(local&&local.id===data.id&&String(stamp(local)||'')!==String(stamp(data)||'')){try{applyLocal(data)}catch(_){}alert('Cette maison a été modifiée sur un autre téléphone. Vérifie le passage actualisé avant de recommencer.');return false}return true}catch(e){console.warn('Vérification conflit impossible',e);return !navigator.onLine}}
 async function saveDone(id,h,e){
  if(!h){toast('Adresse introuvable — réessayez après synchronisation');return {ok:false}}
  try{if(window.isHouseFinalLocked?.(h)){toast('Cette tournée est clôturée');return {ok:false}}}catch(_){}
  if(!(await conflictOK(id)))return {ok:false};
  const p=makePayload(id,h,e);
  if(!navigator.onLine){pending(p);return {ok:true,offline:true}}
  try{
   const {data,error}=await sb.from('visits').upsert(p,{onConflict:'campaign_id,household_id'}).select().single();
   if(error)throw error;
   try{if(typeof applyLocal==='function')applyLocal(data)}catch(_){}
   try{await sb.from('visit_presence').delete().eq('household_id',id).eq('user_id',me.id)}catch(_){}
   try{renderStats();renderHouses();window.renderMap?.()}catch(_){}
   toast('Passage enregistré sur le serveur',true);
   return {ok:true,visit:data};
  }catch(e){console.error('Enregistrement du passage:',e);pending(p);return {ok:true,offline:true}}
 }
 function receiptText(r,h){return `Bonjour ${r.recipient_name||''},\n\nVeuillez trouver en pièce jointe votre reçu de paiement.\n\nAMICALE DES SAPEURS-POMPIERS DE VOLVIC\n31 route de Marsat\n63530 Volvic\n\nReçu n° ${r.receipt_number}\nDate : ${new Date(r.issued_at||Date.now()).toLocaleDateString('fr-FR')}\n\nDestinataire : ${r.recipient_name||'Non renseigné'}\n${r.recipient_address||''}\n${r.recipient_postal_code||''} ${r.recipient_city||''}\nLogement : ${h.house_number||''} ${h.street||''}\n\nMontant versé : ${money(r.amount)}\nMode de paiement : ${pay(r.payment_method)}\nCalendrier(s) remis : ${r.calendars_count||0}\n\nCe document atteste du paiement. Il ne constitue pas un reçu fiscal et ne donne pas droit à une réduction d'impôt.\n\nMerci pour votre soutien.\nAmicale des Sapeurs-Pompiers de Volvic`}
 async function receiptModal(h,v){
  if(!v?.id||Number(v.amount)<=0)return;
  const prior=await sb.from('receipts').select('*').eq('visit_id',v.id).maybeSingle();
  if(prior.error)console.warn('Recherche reçu:',prior.error);
  const existing=prior.data;
  let b=document.getElementById('volvicReceiptV4');if(!b){b=document.createElement('div');b.id='volvicReceiptV4';document.body.appendChild(b)}
  b.style.cssText='position:fixed;inset:0;z-index:16000;background:rgba(0,0,0,.55);padding:24px 12px;overflow:auto;display:flex;justify-content:center;align-items:flex-start';
  b.innerHTML=`<div style="background:white;color:#17202b;border-radius:16px;padding:20px;width:min(520px,100%);margin:auto"><h3>🧾 Reçu de paiement — ${money(v.amount)}</h3><p>${esc(h.house_number)} ${esc(h.street)}</p>${existing?`<p>Reçu existant : <b>${esc(existing.receipt_number)}</b> — ${esc(existing.delivery_status||'créé')}</p>`:''}<label>Nom du destinataire</label><input id="vrName" placeholder="Nom et prénom" value="${esc(existing?.recipient_name||'')}"><label>Destination</label><select id="vrMode"><option value="habitant">Envoyer à l'habitant</option><option value="amicale">Envoyer à l'Amicale pour impression</option><option value="aucun">Pas de reçu demandé</option></select><div id="vrEmailArea"><label>Adresse e-mail de l'habitant</label><input id="vrEmail" type="email" inputmode="email" value="${esc(existing?.recipient_email&&existing.recipient_email!==EMAIL_AMICALE?existing.recipient_email:'')}"></div><p id="vrHelp" style="font-size:13px"></p><button class="btn green" id="vrSend" style="width:100%">Créer et envoyer le reçu PDF</button><button class="btn alt" id="vrLater" style="width:100%;margin-top:8px">Plus tard / Fermer</button><p id="vrResult" role="status"></p></div>`;
  const E=id=>document.getElementById(id), mode=E('vrMode'),btn=E('vrSend');
  if(existing?.recipient_email===EMAIL_AMICALE)mode.value='amicale';
  function update(){E('vrEmailArea').style.display=mode.value==='habitant'?'block':'none';E('vrHelp').textContent=mode.value==='amicale'?'Le reçu PDF sera envoyé à '+EMAIL_AMICALE+' pour impression et remise à l’habitant.':mode.value==='aucun'?'Aucun courriel ne sera envoyé.':'';btn.style.display=mode.value==='aucun'?'none':'block'}
  mode.onchange=update;update();E('vrLater').onclick=()=>b.style.display='none';
  btn.onclick=async()=>{
   const name=E('vrName').value.trim(),to=mode.value==='amicale'?EMAIL_AMICALE:E('vrEmail').value.trim();
   if(!name){E('vrResult').textContent='Indiquez le nom du destinataire.';return}
   if(!/^\S+@\S+\.\S+$/.test(to)){E('vrResult').textContent='Adresse e-mail invalide.';return}
   btn.disabled=true;E('vrResult').textContent='Création du reçu…';
   try{
    const {data:r,error:re}=await sb.rpc('create_receipt_for_visit',{p_visit_id:v.id,p_recipient_email:to,p_recipient_name:name,p_recipient_address:`${h.house_number||''} ${h.street||''}`,p_recipient_postal_code:'63530',p_recipient_city:'Volvic'});
    if(re)throw re;
    const receipt=Array.isArray(r)?r[0]:r;
    const {data:sent,error:se}=await sb.functions.invoke('send-receipt-email',{body:{to,subject:`Votre reçu ${receipt.receipt_number} — Amicale SP Volvic`,text:receiptText(receipt,h)}});
    if(se||!sent?.ok)throw new Error(sent?.error||se?.message||'Échec envoi');
    const {error:ue}=await sb.from('receipts').update({delivery_status:mode.value==='amicale'?'a_imprimer':'sent',sent_at:new Date().toISOString(),gmail_message_id:sent.message_id||null}).eq('id',receipt.id);
    if(ue)console.warn('Suivi du reçu:',ue);
    E('vrResult').textContent=mode.value==='amicale'?'PDF envoyé à l’Amicale — à imprimer.':'Reçu PDF envoyé.';
    btn.textContent='Renvoyer le reçu';
   }catch(e){console.error('Reçu:',e);E('vrResult').textContent='Reçu non confirmé : '+(e.message||e)+'. Vous pourrez réessayer.'}
   finally{btn.disabled=false}
  };
 }
 async function modal(id){
  let h;try{h=await getHouse(id)}catch(e){console.error(e)}
  if(!h){toast('Adresse non chargée : vérifiez la connexion puis réessayez');return}
  const v=visitFor(id)||{};let b=document.getElementById('mapDoneOfflineV2');if(!b){b=document.createElement('div');b.id='mapDoneOfflineV2';document.body.appendChild(b)}
  b.style.cssText='position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.45);padding:calc(env(safe-area-inset-top) + 8px) 12px calc(env(safe-area-inset-bottom) + 8px);overflow:auto;display:flex;align-items:flex-start;justify-content:center';
  b.innerHTML=`<div style="background:#fff;width:min(520px,100%);margin:18px auto;border-radius:16px;padding:16px"><b style="font-size:18px">✅ Passage — ${esc(h.house_number)} ${esc(h.street)}</b><br><br><label>Calendriers</label><input id="mofCal" type="number" min="0" inputmode="numeric" value="${Number(v.calendars_count??1)}"><label>Don (€)</label><input id="mofAmt" type="number" min="0" step=".01" inputmode="decimal" value="${Number(v.amount??0)||''}"><label>Mode de paiement</label><select id="mofPay"><option value="">— Choisir —</option>${['especes','carte','cheque','autre'].map(x=>`<option value="${x}" ${v.payment_method===x?'selected':''}>${pay(x)}</option>`).join('')}</select><label>Commentaire</label><input id="mofCom" value="${esc(v.visit_comment||'')}"><br><button class="btn green" style="width:100%;margin-top:10px" id="mofSave">✅ Valider le passage</button><button class="btn alt" style="width:100%;margin-top:8px" id="mofCancel">Annuler</button></div>`;
  document.getElementById('mofCancel').onclick=()=>b.style.display='none';
  document.getElementById('mofSave').onclick=async()=>{
   const button=document.getElementById('mofSave');button.disabled=true;
   try{const e={calendars_count:+document.getElementById('mofCal').value||0,amount:+document.getElementById('mofAmt').value||0,payment_method:document.getElementById('mofPay').value||null,visit_comment:document.getElementById('mofCom').value||null};
    if(e.amount>0&&!e.payment_method){toast('Choisissez le mode de paiement');return}
    const res=await saveDone(id,h,e);
    if(res.ok){b.style.display='none';if(!res.offline&&res.visit&&e.amount>0)await receiptModal(h,res.visit)}
   }finally{button.disabled=false}
  };
 }
 function install(){if(typeof window.mapVisitAction!=='function')return setTimeout(install,300);const previous=window.mapVisitAction;
  window.mapVisitAction=function(id,status){if(status==='fait')return modal(id);return previous.apply(this,arguments)};
  window.mapVisitActionV9=window.mapVisitAction;window.saveMapDone=modal;
  window.volvicOpenReceiptForVisit=async id=>{const v=visitFor(id),h=await getHouse(id);if(v&&h&&Number(v.amount)>0)return receiptModal(h,v);toast('Aucun paiement enregistré pour cette maison')};
 }
 setTimeout(install,3600);
})();
