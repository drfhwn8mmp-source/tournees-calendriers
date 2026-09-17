// Reçus Gmail — Amicale SP Volvic
(function(){
const E=id=>document.getElementById(id);
async function send(payload){
 const {data,error}=await sb.functions.invoke('send-receipt-email',{body:payload});
 if(error) throw error;
 if(!data?.ok) throw new Error(data?.error||"Échec de l'envoi");
 return data;
}
window.testReceiptEmail=async function(){
 const to=(E('receiptTestEmail')?.value||'').trim(), out=E('receiptTestResult'), btn=E('receiptTestBtn');
 if(!to){out.textContent='Entre une adresse e-mail de test.';return;}
 btn.disabled=true; out.textContent='Envoi du test…';
 try{
  await send({to,subject:'Test reçus — Amicale des Sapeurs-Pompiers de Volvic',
   text:"Bonjour,\n\nCeci est un e-mail de test envoyé automatiquement depuis l’application Tournées Calendriers.\n\nSi vous recevez ce message, la connexion Gmail de l’Amicale fonctionne correctement.\n\nAmicale des Sapeurs-Pompiers de Volvic\n31 route de Marsat\n63530 Volvic"});
  out.textContent='✅ Test envoyé. Vérifie la boîte de réception.';
 }catch(e){console.error(e);out.textContent='❌ Envoi impossible : '+(e?.message||'erreur inconnue');}
 finally{btn.disabled=false;}
};
function install(){
 const box=E('receiptConfig'); if(!box||E('receiptTestEmail'))return;
 box.innerHTML='<div class="street"><b>📧 Envoi Gmail</b><div class="muted">Expéditeur : recu.aspv63530@gmail.com</div><br><div class="row"><input id="receiptTestEmail" type="email" placeholder="Adresse e-mail pour le test"><button class="btn" id="receiptTestBtn" onclick="testReceiptEmail()">Envoyer un test</button></div><div id="receiptTestResult" class="muted" style="margin-top:8px"></div></div>';
}
document.addEventListener('DOMContentLoaded',install);
setTimeout(install,500);
new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
})();
