/* Amicale SP Volvic — reçus sans nom obligatoire, validation des ventes et envoi opt-in. */
(function(){
'use strict';
const E=id=>document.getElementById(id),clean=s=>String(s??'').trim();
const money=n=>(Number(n)||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const pay=p=>({especes:'Espèces',carte:'Carte',cheque:'Chèque',autre:'Autre'}[p]||p||'Non renseigné');
async function send(x){const {data,error}=await sb.functions.invoke('send-receipt-email',{body:x});if(error)throw error;if(!data?.ok)throw new Error(data?.error||"Échec de l'envoi");return data;}
function receiptText(r){const d=new Date(r.issued_at||Date.now()).toLocaleDateString('fr-FR');return `Bonjour,\n\nVeuillez trouver votre reçu de versement.\n\nAMICALE DES SAPEURS-POMPIERS DE VOLVIC\n31 route de Marsat\n63530 Volvic\n\nReçu n° ${r.receipt_number}\nDate : ${d}\nAdresse : ${clean(r.recipient_address)}\n${clean(r.recipient_postal_code)} ${clean(r.recipient_city)}\nMontant versé : ${money(r.amount)}\nMode de paiement : ${pay(r.payment_method)}\nCalendrier(s) remis : ${Number(r.calendars_count)||0}\n\nCe document est un reçu de versement / paiement. Il ne constitue pas un reçu fiscal et ne vaut pas attestation ouvrant droit à une réduction d’impôt.\n\nMerci pour votre soutien.\nAmicale des Sapeurs-Pompiers de Volvic\nrecu.aspv63530@gmail.com`;}
window.receiptFor=async id=>{try{
 if(!navigator.onLine)return toast('Hors connexion : synchroniser la vente avant de créer le reçu');
 const h=households.find(x=>x.id===id);if(!h)return toast('Maison introuvable');
 // Vérifier le passage côté serveur : une saisie locale hors connexion ne suffit pas.
 const {data:v,error:ve}=await sb.from('visits').select('*').eq('campaign_id',campaign.id).eq('household_id',id).maybeSingle();
 if(ve)throw ve;
 if(!v?.id||v.status!=='fait'||Number(v.calendars_count)<=0)return toast('Reçu réservé aux ventes de calendriers synchronisées');
 let addr=`${h.house_number||''} ${h.street||''}`.trim();if(h.unit_label)addr+=` — Logement ${h.unit_label}`;
 if(!addr)return toast('Adresse manquante : reçu non créé');
 const pc=clean(h.postal_code)||'63530',city=clean(h.city_name)||clean(h.locality)||'Volvic';
 const {data:r,error}=await sb.rpc('create_receipt_for_visit',{p_visit_id:v.id,p_recipient_email:null,p_recipient_name:null,p_recipient_address:addr,p_recipient_postal_code:pc,p_recipient_city:city});if(error)throw error;
 toast(`Reçu ${r.receipt_number} enregistré`,true);
 if(!confirm(`Reçu ${r.receipt_number} enregistré. Souhaites-tu l'envoyer par e-mail ?`))return;
 const raw=prompt('Adresse e-mail du destinataire (Annuler = aucun envoi)','');if(raw===null)return;
 const email=clean(raw);if(!email)return;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('Adresse e-mail invalide');
 if(!confirm(`Confirmer l'envoi du reçu ${r.receipt_number} à ${email} ?`))return;
 try{await send({to:email,subject:`Votre reçu ${r.receipt_number} — Amicale des Sapeurs-Pompiers de Volvic`,text:receiptText(r)});
 const {error:ue}=await sb.from('receipts').update({recipient_email:email,delivery_status:'sent',sent_at:new Date().toISOString()}).eq('id',r.id);if(ue)throw ue;
 toast(`Reçu ${r.receipt_number} envoyé`,true);
 }catch(e){toast(`Reçu créé, envoi non confirmé : ${e.message||'erreur'}`,true);}
}catch(e){toast('Reçu impossible : '+(e.message||'erreur'),true)}};
window.testReceiptEmail=async()=>{const to=clean(E('receiptTestEmail')?.value),o=E('receiptTestResult'),b=E('receiptTestBtn');if(!to)return o.textContent='Entre une adresse e-mail de test.';if(!confirm(`Envoyer un e-mail de test à ${to} ?`))return;b.disabled=true;o.textContent='Envoi du test…';try{await send({to,subject:'Test reçus — Amicale des Sapeurs-Pompiers de Volvic',text:'Test de l’application Tournées Calendriers.'});o.textContent='Test envoyé.'}catch(e){o.textContent='Échec : '+(e.message||'Erreur')}finally{b.disabled=false}};
function install(){const b=E('receiptConfig');if(!b||E('receiptTestEmail'))return;b.innerHTML='<div class="street"><b>📧 Envoi Gmail</b><div class="muted">Expéditeur : recu.aspv63530@gmail.com</div><div class="muted">Statut de la connexion à vérifier avant tout envoi.</div><br><div class="row"><input id="receiptTestEmail" type="email" placeholder="Adresse e-mail de test"><button class="btn" id="receiptTestBtn" onclick="testReceiptEmail()">Envoyer un test</button></div><div id="receiptTestResult" class="muted" style="margin-top:8px"></div></div>'}
document.addEventListener('DOMContentLoaded',install);setTimeout(install,500);new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();
