// Reçus Gmail — Amicale SP Volvic — saisie simplifiée V2
(function(){
const E=id=>document.getElementById(id),clean=s=>String(s??'').trim();
const money=n=>(Number(n)||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const pay=p=>({especes:'Espèces',carte:'Carte',cheque:'Chèque',autre:'Autre'}[p]||p||'Non renseigné');
async function send(x){const {data,error}=await sb.functions.invoke('send-receipt-email',{body:x});if(error)throw error;if(!data?.ok)throw new Error(data?.error||"Échec de l'envoi");return data;}
function receiptText(r,h){const d=new Date(r.issued_at||Date.now()).toLocaleDateString('fr-FR');return `Bonjour ${clean(r.recipient_name)},

Veuillez trouver ci-dessous votre reçu de versement.

AMICALE DES SAPEURS-POMPIERS DE VOLVIC
31 route de Marsat
63530 Volvic

Reçu n° ${r.receipt_number}
Date : ${d}

Destinataire : ${clean(r.recipient_name)||'Non renseigné'}
${clean(r.recipient_address)}
${clean(r.recipient_postal_code)} ${clean(r.recipient_city)}

Montant versé : ${money(r.amount)}
Mode de paiement : ${pay(r.payment_method)}
Calendrier(s) remis : ${Number(r.calendars_count)||0}

Ce document est un reçu de versement / paiement. Il ne constitue pas un reçu fiscal et ne vaut pas attestation ouvrant droit à une réduction d’impôt.

Merci pour votre soutien.

Amicale des Sapeurs-Pompiers de Volvic
recu.aspv63530@gmail.com`;}
window.testReceiptEmail=async()=>{const to=clean(E('receiptTestEmail')?.value),o=E('receiptTestResult'),b=E('receiptTestBtn');if(!to)return o.textContent='Entre une adresse e-mail de test.';b.disabled=true;o.textContent='Envoi du test…';try{await send({to,subject:'Test reçus — Amicale des Sapeurs-Pompiers de Volvic',text:"Bonjour,\n\nTest automatique de l’application Tournées Calendriers.\n\nAmicale des Sapeurs-Pompiers de Volvic\n31 route de Marsat\n63530 Volvic"});o.textContent='✅ Test envoyé.'}catch(e){o.textContent='❌ '+(e.message||'Erreur')}finally{b.disabled=false}};
window.receiptFor=async id=>{try{
 const v=visitFor(id),h=households.find(x=>x.id===id);if(!v?.id||!h)return toast("Valide d'abord le passage");
 const nameInput=prompt('Nom et prénom de la personne pour le reçu','');if(nameInput===null)return;const name=clean(nameInput);if(!name)return toast('Renseigne le nom et le prénom');
 const emailInput=prompt('E-mail du destinataire (laisser vide pour créer sans envoyer)','');if(emailInput===null)return;const email=clean(emailInput);
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('Adresse e-mail invalide');
 let addr=`${h.house_number||''} ${h.street||''}`.trim();if(h.unit_label)addr+=` — Logement ${h.unit_label}`;
 const pc=clean(h.postal_code)||'63530',city=clean(h.city_name)||clean(h.locality)||'Volvic';
 if(!addr)return toast('Adresse du logement manquante : reçu non créé');
 const {data:r,error}=await sb.rpc('create_receipt_for_visit',{p_visit_id:v.id,p_recipient_email:email||null,p_recipient_name:name,p_recipient_address:addr,p_recipient_postal_code:pc,p_recipient_city:city});if(error)throw error;
 if(!email)return toast(`Reçu ${r.receipt_number} créé`);
 toast(`Envoi du reçu ${r.receipt_number}…`);
 try{await send({to:email,subject:`Votre reçu ${r.receipt_number} — Amicale des Sapeurs-Pompiers de Volvic`,text:receiptText(r,h)});await sb.from('receipts').update({delivery_status:'sent',sent_at:new Date().toISOString()}).eq('id',r.id);toast(`✅ Reçu ${r.receipt_number} envoyé`)}
 catch(e){await sb.from('receipts').update({delivery_status:'failed',sent_at:null}).eq('id',r.id);toast(`❌ Reçu créé mais e-mail non envoyé : ${e.message||'erreur'}`)}
}catch(e){toast('Reçu impossible : '+(e.message||'erreur'))}};
function install(){const b=E('receiptConfig');if(!b||E('receiptTestEmail'))return;b.innerHTML='<div class="street"><b>📧 Envoi Gmail</b><div class="muted">Expéditeur : recu.aspv63530@gmail.com</div><div class="muted">✅ Connexion configurée — envoi direct des reçus actif.</div><br><div class="row"><input id="receiptTestEmail" type="email" placeholder="Adresse e-mail pour le test"><button class="btn" id="receiptTestBtn" onclick="testReceiptEmail()">Envoyer un test</button></div><div id="receiptTestResult" class="muted" style="margin-top:8px"></div></div>'}
document.addEventListener('DOMContentLoaded',install);setTimeout(install,500);new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();
