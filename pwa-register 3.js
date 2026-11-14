/* Carte FINAL V14 — conservée */
(function(){
 const VERSION='2026.10.06-final14';
 function load(){
  if(document.querySelector('script[data-map-final-v14]'))return;
  const s=document.createElement('script');s.src='./map-house-actions-final-v14.js?v='+encodeURIComponent(VERSION);s.dataset.mapFinalV14='1';
  s.onload=()=>{try{window.__MAP_FINAL_VERSION='V14';window.renderMap?.()}catch(e){console.error(e)}};
  document.body.appendChild(s);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,50),{once:true});else setTimeout(load,50);
})();
/* Confirmation création de compte — conservée */
(function(){
 function installSignupConfirmation(){
  const btn=document.getElementById('signupBtn'),email=document.getElementById('email'),password=document.getElementById('password'),msg=document.getElementById('authMsg');
  if(!btn||!email||!password||!msg||typeof sb==='undefined')return;
  btn.onclick=async()=>{const full=prompt('Prénom et nom');if(!full)return;msg.textContent='Envoi de la demande…';const {error}=await sb.auth.signUp({email:email.value.trim(),password:password.value,options:{data:{full_name:full}}});if(error){msg.textContent=error.message;return}msg.innerHTML='<strong>✅ Demande de création de compte enregistrée</strong><br><br>Votre demande a bien été prise en compte.<br><strong>Un administrateur doit maintenant valider votre compte et vous attribuer une équipe.</strong><br><br>Vous pourrez ensuite vous connecter à l’application.'};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installSignupConfirmation,100),{once:true});else setTimeout(installSignupConfirmation,100);
})();
/* Aide équipe V2 — conservée */
(function(){
 const E=id=>document.getElementById(id);
 function refreshAll(){try{if(typeof renderHouses==='function')renderHouses();if(typeof renderStats==='function')renderStats();if(typeof window.renderMap==='function')window.renderMap()}catch(e){console.error('Aide équipe V2',e)}}
 function install(){const btn=E('helpBtn');if(!btn||btn.dataset.helpV2==='1')return;btn.dataset.helpV2='1';
  btn.onclick=()=>{const mine=(typeof myTeamIds==='function'?myTeamIds():[]),choices=(teams||[]).filter(t=>!mine.includes(t.id));if(!choices.length){if(typeof toast==='function')toast('Aucune autre équipe disponible');return}const names=choices.map((t,i)=>`${i+1}. ${t.name}`).join('\n');const n=+prompt('Quelle équipe aider ?\n'+names);if(!n||!choices[n-1])return;const chosen=choices[n-1];helpTeam=chosen.id;const banner=E('helpBanner');if(banner){banner.classList.remove('hidden');banner.innerHTML=`🤝 Vous aidez actuellement <b>${typeof esc==='function'?esc(chosen.name):chosen.name}</b> <button class="btn alt" onclick="stopHelp()">Revenir à mon équipe</button>`}if(E('sectorSelect'))E('sectorSelect').value='';if(E('filterStatus'))E('filterStatus').value='';if(E('searchHouse'))E('searchHouse').value='';if(E('teamView'))E('teamView').value=chosen.id;refreshAll();setTimeout(()=>{if(E('sectorSelect'))E('sectorSelect').value='';if(E('teamView'))E('teamView').value=chosen.id;refreshAll()},300)};
  window.stopHelp=()=>{helpTeam=null;const banner=E('helpBanner');if(banner)banner.classList.add('hidden');if(E('sectorSelect'))E('sectorSelect').value='';if(E('filterStatus'))E('filterStatus').value='';if(E('searchHouse'))E('searchHouse').value='';if(E('teamView'))E('teamView').value='';refreshAll()};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,250),{once:true});else setTimeout(install,250);
})();
/* Correctif terrain 14 novembre 2026 : écritures confirmées + reçus proposés */
(function(){
 const E=id=>document.getElementById(id),clean=x=>String(x??'').trim(),safe=x=>clean(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=x=>(Number(x)||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const payment=x=>({especes:'Espèces',carte:'Carte bancaire',cheque:'Chèque',autre:'Autre'}[x]||x||'');
 let busy=false;
 function inform(message){try{toast(message)}catch(_){alert(message)}}
 function teamOf(h){return teamForHouse(h)}
 function shared(h){const s=(sectors||[]).find(x=>x.id===h.sector_id),c=(cities||[]).find(x=>x.id===(h.city_id||s?.city_id));return !!c?.shared_round}
 function refresh(){try{renderHouses();renderStats();window.renderMap?.()}catch(e){console.error('Refresh',e)}}
 async function persist(id,status,extra={}){
  if(busy)return false;
  const h=households.find(x=>x.id===id);if(!h){inform('Adresse introuvable');return false}
  if(window.isHouseFinalLocked?.(h)){inform('Tournée clôturée');return false}
  if(!navigator.onLine){inform('Hors connexion : passage non confirmé. Conserve une trace papier.');return false}
  busy=true;
  try{
   const old=visitFor(id)||{},isShared=shared(h),team=isShared?null:teamOf(h);
   const payload={campaign_id:campaign.id,household_id:id,team_id:team,original_team_id:team,helper_mode:!isShared&&!!helpTeam&&helpTeam===team,status,calendars_count:status==='fait'?(Number(extra.calendars_count??old.calendars_count??1)||0):0,amount:status==='fait'?(Number(extra.amount??old.amount??0)||0):0,payment_method:status==='fait'?(extra.payment_method??old.payment_method??null):null,visit_comment:extra.visit_comment??old.visit_comment??null,visited_by:me.id,visited_at:new Date().toISOString(),updated_at:new Date().toISOString(),client_updated_at:new Date().toISOString()};
   const {data,error}=await sb.from('visits').upsert(payload,{onConflict:'campaign_id,household_id'}).select().single();
   if(error||!data?.id){inform('❌ NON ENREGISTRÉ : '+(error?.message||'réponse absente'));return false}
   const i=visits.findIndex(x=>x.household_id===id);if(i>=0)visits[i]={...visits[i],...data};else visits.push(data);
   try{await sb.from('visit_presence').delete().eq('household_id',id).eq('user_id',me.id)}catch(_){}
   refresh();inform('✅ Passage enregistré et confirmé');
   if(status==='fait'&&Number(data.amount)>0)setTimeout(()=>offerReceipt(id),180);
   return true;
  }catch(e){inform('❌ NON ENREGISTRÉ : '+(e.message||e));return false}
  finally{busy=false}
 }
 function offerReceipt(id){const v=visitFor(id),h=households.find(x=>x.id===id);if(!v?.id||!h)return;
  let box=E('urgentReceiptOffer');if(!box){box=document.createElement('div');box.id='urgentReceiptOffer';document.body.appendChild(box)}
  box.style.cssText='position:fixed;inset:0;z-index:15000;background:#0009;display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px);overflow:auto';
  box.innerHTML=`<div style="background:white;border-radius:16px;padding:18px;width:min(480px,100%);max-height:90vh;overflow:auto"><h3>🧾 Proposer un reçu de paiement ?</h3><p><b>${safe(h.house_number)} ${safe(h.street)}</b></p><p>Montant : <b>${money(v.amount)}</b> — ${safe(payment(v.payment_method))}</p><p class="muted">L’adresse est reprise automatiquement. Il suffit du nom et de l’e-mail.</p><input id="urgentReceiptName" placeholder="Nom et prénom du destinataire"><input id="urgentReceiptEmail" type="email" placeholder="E-mail du destinataire" style="margin-top:8px"><p class="muted" id="urgentReceiptMsg"></p><button class="btn green" id="urgentReceiptSend" style="width:100%">📧 Envoyer le reçu</button><button class="btn alt" id="urgentReceiptSkip" style="width:100%;margin-top:8px">Pas de reçu — terminer</button></div>`;
  E('urgentReceiptSkip').onclick=()=>box.remove();
  E('urgentReceiptSend').onclick=async()=>{
   const name=clean(E('urgentReceiptName').value),email=clean(E('urgentReceiptEmail').value),msg=E('urgentReceiptMsg'),btn=E('urgentReceiptSend');
   if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg.textContent='Indique le nom et une adresse e-mail valide.';return}
   btn.disabled=true;btn.textContent='Envoi en cours…';
   try{
    let addr=`${clean(h.house_number)} ${clean(h.street)}`.trim();if(h.unit_label)addr+=` — Logement ${clean(h.unit_label)}`;
    if(!addr)throw Error('Adresse du logement manquante');
    const pc=clean(h.postal_code)||'63530',city=clean(h.city_name)||clean(h.locality)||'Volvic';
    const {data:r,error}=await sb.rpc('create_receipt_for_visit',{p_visit_id:v.id,p_recipient_email:email,p_recipient_name:name,p_recipient_address:addr,p_recipient_postal_code:pc,p_recipient_city:city});
    if(error||!r?.id)throw Error(error?.message||'Reçu non créé');
    const date=new Date(r.issued_at||Date.now()).toLocaleDateString('fr-FR');
    const body=`Bonjour ${name},\n\nVeuillez trouver votre reçu de versement.\n\nAMICALE DES SAPEURS-POMPIERS DE VOLVIC\n31 route de Marsat, 63530 Volvic\n\nReçu n° ${r.receipt_number}\nDate : ${date}\nDestinataire : ${name}\n${addr}\n${pc} ${city}\n\nMontant versé : ${money(r.amount)}\nMode de paiement : ${payment(r.payment_method)}\nCalendrier(s) remis : ${r.calendars_count||0}\n\nCe document ne constitue pas un reçu fiscal et n'ouvre pas droit à une réduction d'impôt.\n\nMerci pour votre soutien.\nAmicale des Sapeurs-Pompiers de Volvic`;
    const sent=await sb.functions.invoke('send-receipt-email',{body:{to:email,subject:`Votre reçu ${r.receipt_number} — Amicale des Sapeurs-Pompiers de Volvic`,text:body}});
    if(sent.error||sent.data?.ok!==true){await sb.from('receipts').update({delivery_status:'failed',sent_at:null}).eq('id',r.id);throw Error(sent.error?.message||sent.data?.error||'E-mail non envoyé')}
    await sb.from('receipts').update({delivery_status:'sent',sent_at:new Date().toISOString()}).eq('id',r.id);
    box.remove();inform('✅ Reçu envoyé par e-mail');
   }catch(e){msg.textContent='❌ '+(e.message||'Erreur');btn.disabled=false;btn.textContent='Réessayer l’envoi'}
  };
 }
 function install(){if(window.__urgentVisitFix)return;if(typeof window.mapVisitAction!=='function'||typeof window.saveVisit!=='function')return;window.__urgentVisitFix=true;
  window.saveVisit=(id,status)=>persist(id,status,{calendars_count:E('cal-'+id)?.value,amount:E('amt-'+id)?.value,payment_method:E('pay-'+id)?.value||null,visit_comment:E('com-'+id)?.value||null});
  window.quickStatus=(id,status)=>persist(id,status);
  window.mapVisitAction=(id,status)=>{
   if(status!=='fait')return persist(id,status);
   const h=households.find(x=>x.id===id);if(!h)return;
   window.saveMapDone(id);
   const btn=E('m7save');if(!btn)return;
   btn.onclick=async()=>{
    btn.disabled=true;btn.textContent='Enregistrement…';
    const result=await persist(id,'fait',{calendars_count:E('m7cal')?.value,amount:E('m7amt')?.value,payment_method:E('m7pay')?.value||null,visit_comment:E('m7com')?.value||null});
    if(result){const modal=E('mapDoneModalV7');if(modal)modal.style.display='none'}else{btn.disabled=false;btn.textContent='Réessayer — passage non enregistré'}
   };
  };
  window.mapVisitActionV9=window.mapVisitAction;
  // La carte utilise saveMapDone directement à certains endroits : garder son ouverture d'origine.
 }
 let count=0;const t=setInterval(()=>{install();if(window.__urgentVisitFix||++count>100)clearInterval(t)},100);
})();
