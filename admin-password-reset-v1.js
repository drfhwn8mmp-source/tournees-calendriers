/* Bouton admin : envoi du lien de réinitialisation V1 */
(function(){
function add(){
 if(!document.body.classList.contains('isAdmin'))return;
 const root=document.getElementById('profiles');if(!root)return;
 [...root.querySelectorAll('.street,.house,.card,div')].forEach(box=>{
  if(box.querySelector?.(':scope > .password-reset-admin-btn'))return;
  const text=box.textContent||'',emails=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig)||[];
  if(emails.length!==1)return;
  const b=document.createElement('button');b.type='button';b.className='btn alt password-reset-admin-btn';b.style.marginTop='8px';b.textContent='🔑 Envoyer lien mot de passe';b.dataset.email=emails[0];
  b.onclick=async()=>{if(!confirm('Envoyer un lien de réinitialisation à '+b.dataset.email+' ?'))return;b.disabled=true;await window.sendPasswordResetForMember?.(b.dataset.email);b.disabled=false};box.appendChild(b);
 });
}
document.addEventListener('DOMContentLoaded',()=>{const r=document.getElementById('profiles');if(r)new MutationObserver(()=>setTimeout(add,0)).observe(r,{childList:true,subtree:true});add()});setInterval(add,1500);
})();