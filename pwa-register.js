/* Correctif terrain 14/11/2026 : carte V14, chargement complet, proposition de reçus.
   Aucun changement dans les données Supabase ni dans les attributions. */
(function(){
 function load(){if(document.querySelector('script[data-map-final-v14]'))return;const s=document.createElement('script');s.src='./map-house-actions-final-v14.js?v=2026.10.06-final14';s.dataset.mapFinalV14='1';s.onload=()=>{window.__MAP_FINAL_VERSION='V14';try{window.renderMap?.()}catch(e){console.error(e)}};document.body.appendChild(s)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,50),{once:true});else setTimeout(load,50);
})();
(function(){
 function install(){const btn=document.getElementById('signupBtn'),email=document.getElementById('email'),password=document.getElementById('password'),msg=document.getElementById('authMsg');if(!btn||!email||!password||!msg||typeof sb==='undefined')return;btn.onclick=async()=>{const full=prompt('Prénom et nom');if(!full)return;msg.textContent='Envoi de la demande…';const {error}=await sb.auth.signUp({email:email.value.trim(),password:password.value,options:{data:{full_name:full}}});if(error){msg.textContent=error.message;return}msg.innerHTML='<strong>✅ Demande de création de compte enregistrée</strong><br><br>Un administrateur doit maintenant valider votre compte et vous attribuer une équipe.'}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,100),{once:true});else setTimeout(install,100);
})();
(function(){
 const E=id=>document.getElementById(id);
 function refresh(){try{renderHouses();renderStats();window.renderMap?.()}catch(e){console.error(e)}}
 function install(){const b=E('helpBtn');if(!b||b.dataset.helpV2==='1')return;b.dataset.helpV2='1';b.onclick=()=>{const mine=myTeamIds(),choices=teams.filter(t=>!mine.includes(t.id));if(!choices.length)return toast('Aucune autre équipe disponible');const n=+prompt('Quelle équipe aider ?\n'+choices.map((t,i)=>`${i+1}. ${t.name}`).join('\n'));if(!choices[n-1])return;helpTeam=choices[n-1].id;const banner=E('helpBanner');if(banner){banner.classList.remove('hidden');banner.innerHTML=`🤝 Vous aidez actuellement <b>${esc(choices[n-1].name)}</b> <button class="btn alt" onclick="stopHelp()">Revenir à mon équipe</button>`}for(const id of ['sectorSelect','filterStatus','searchHouse'])if(E(id))E(id).value='';if(E('teamView'))E('teamView').value=helpTeam;refresh()};window.stopHelp=()=>{helpTeam=null;E('helpBanner')?.classList.add('hidden');for(const id of ['sectorSelect','filterStatus','searchHouse','teamView'])if(E(id))E(id).value='';refresh()}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,250),{once:true});else setTimeout(install,250);
})();
(function(){
 const E=id=>document.getElementById(id),clean=x=>String(x??'').trim(),safe=x=>clean(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=x=>(Number(x)||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
 const payment=x=>({especes:'Espèces',carte:'Carte bancaire',cheque:'Chèque',autre:'Autre'}[x]||x||'');
 let busy=false,loading=false;
 function inform(m){try{toast(m)}catch(_){alert(m)}}
 function shared(h){try{if(typeof isSharedRoundHouse==='function')return !!isSharedRoundHouse(h);const s=sectors.find(x=>x.id===h.sector_id),c=cities.find(x=>x.id===(h.city_id||s?.city_id));return !!c?.shared_round}catch(_){return false}}
 function refresh(){try{window.renderHouses();renderStats();window.renderMap?.()}catch(e){console.error('Rafraîchissement',e)}}
 async function persist(id,status,extra={}){
  if(busy)return false;
  const h=households.find(x=>x.id===id);if(!h){inform('Adresse introuvable');return false}
  if(window.isHouseFinalLocked?.(h)){inform('Tournée clôturée');return false}
  if(!navigator.onLine){inform('Hors connexion : saisie non confirmée. Conserve une trace papier.');return false}
  busy=true;
  try{
   const old=visitFor(id)||{},s=shared(h),team=s?null:teamForHouse(h);
   const payload={campaign_id:campaign.id,household_id:id,team_id:team,original_team_id:team,helper_mode:!s&&!!helpTeam&&helpTeam===team,status,calendars_count:status==='fait'?Number(extra.calendars_count??old.calendars_count??1)||0:0,amount:status==='fait'?Number(extra.amount??old.amount??0)||0:0,payment_method:status==='fait'?(extra.payment_method??old.payment_method??null):null,visit_comment:extra.visit_comment??old.visit_comment??null,visited_by:me.id,visited_at:new Date().toISOString(),updated_at:new Date().toISOString(),client_updated_at:new Date().toISOString()};
   const {data,error}=await sb.from('visits').upsert(payload,{onConflict:'campaign_id,household_id'}).select().single();
   if(error||!data?.id){inform('❌ Passage NON enregistré : '+(error?.message||'réponse absente'));return false}
   const i=visits.findIndex(x=>x.household_id===id);if(i>=0)visits[i]={...visits[i],...data};else visits.push(data);
   try{await sb.from('visit_presence').delete().eq('household_id',id).eq('user_id',me.id)}catch(_){}
   refresh();inform('✅ Passage enregistré');
   if(status==='fait'&&Number(data.amount)>0)setTimeout(()=>offerReceipt(id,data),250);
   return true;
  }catch(e){inform('❌ Passage NON enregistré : '+(e.message||e));return false}finally{busy=false}
 }
 function offerReceipt(id,v){const h=households.find(x=>x.id===id);if(!h||!v?.id)return;
  let box=E('urgentReceiptOffer');if(!box){box=document.createElement('div');box.id='urgentReceiptOffer';document.body.appendChild(box)}
  box.style.cssText='position:fixed;inset:0;z-index:15000;background:#0009;display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px);overflow:auto';
  box.innerHTML=`<div style="background:white;color:#222;border-radius:16px;padding:18px;width:min(480px,100%);max-height:90vh;overflow:auto"><h3>🧾 Proposer un reçu de paiement ?</h3><p><b>${safe(h.house_number)} ${safe(h.street)}</b></p><p>Don : <b>${money(v.amount)}</b> — ${safe(payment(v.payment_method))}</p><p>L'adresse du logement est préremplie. Saisir seulement le nom et l'e-mail.</p><input id="urgentReceiptName" placeholder="Nom et prénom du destinataire"><input id="urgentReceiptEmail" type="email" placeholder="E-mail du destinataire" style="margin-top:8px"><p id="urgentReceiptMsg" role="status"></p><button class="btn green" id="urgentReceiptSend" style="width:100%">📧 Envoyer le reçu</button><button class="btn alt" id="urgentReceiptSkip" style="width:100%;margin-top:8px">Pas de reçu — terminer</button></div>`;
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
 // La carte V14 ouvre elle-même sa fenêtre. On conserve son affichage et on branche
 // uniquement son bouton de validation sur la sauvegarde confirmée + reçu.
 function wireMapDone(id){const btn=E('m7save');if(!btn)return;
  btn.onclick=async()=>{if(busy)return;btn.disabled=true;btn.textContent='Enregistrement…';const ok=await persist(id,'fait',{calendars_count:E('m7cal')?.value,amount:E('m7amt')?.value,payment_method:E('m7pay')?.value||null,visit_comment:E('m7com')?.value||null});if(ok){if(E('mapDoneModalV7'))E('mapDoneModalV7').style.display='none'}else{btn.disabled=false;btn.textContent='Réessayer — passage non enregistré'}};
 }
 function install(){if(window.__fieldRepair20261114)return;if(typeof window.saveMapDone!=='function'||typeof window.mapVisitAction!=='function'||typeof window.saveVisit!=='function')return;
  window.__fieldRepair20261114=true;
  const originalDone=window.saveMapDone;
  window.saveMapDone=function(id){originalDone(id);wireMapDone(id)};
  window.mapVisitAction=function(id,status){return status==='fait'?window.saveMapDone(id):persist(id,status)};
  window.mapVisitActionV9=window.mapVisitAction;
  window.saveVisit=(id,status)=>persist(id,status,{calendars_count:E('cal-'+id)?.value,amount:E('amt-'+id)?.value,payment_method:E('pay-'+id)?.value||null,visit_comment:E('com-'+id)?.value||null});
  window.quickStatus=(id,status)=>persist(id,status);
 }
 let attempts=0;const timer=setInterval(()=>{install();if(window.__fieldRepair20261114||++attempts>150)clearInterval(timer)},100);
 // Le chargeur historique est asynchrone : contrôler que les 2715 foyers ont bien été chargés.
 // Cette vérification est non destructive et répare un chargement incomplet sans écraser
 // des saisies locales qui auraient été faites pendant la synchronisation.
 async function ensureComplete(){if(loading||typeof campaign==='undefined'||!campaign||typeof households==='undefined')return;loading=true;
  try{const {count,error}=await sb.from('households').select('id',{count:'exact',head:true}).eq('active',true);if(error)throw error;
   if(households.length>=count)return;
   const all=[];for(let from=0;from<count;from+=500){const {data,error:e}=await sb.from('households').select('*').eq('active',true).order('id').range(from,from+499);if(e)throw e;all.push(...(data||[]))}
   if(all.length!==count)throw Error('Chargement incomplet : '+all.length+'/'+count);
   const current=new Map(households.map(h=>[h.id,h]));households=all.map(h=>current.has(h.id)?{...h,...current.get(h.id)}:h);
   refresh();try{setSync(count+' adresses chargées')}catch(_){}
  }catch(e){console.error('Vérification adresses',e);try{setSync('Chargement adresses incomplet',true)}catch(_){}}finally{loading=false}
 }
 setTimeout(ensureComplete,5000);
})();
