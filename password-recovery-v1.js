/* Récupération mot de passe Supabase V1 — iPhone + Android */
(function(){
const APP_URL='https://drfhwn8mmp-source.github.io/tournees-calendriers/';
const $r=id=>document.getElementById(id);
function c(){return (typeof sb!=='undefined'&&sb?.auth)?sb:(window.sb?.auth?window.sb:null)}
function am(t,b=false){const e=$r('authMsg');if(e){e.textContent=t;e.className='muted'+(b?' warn':'')}}
function rm(t,b=false){const e=$r('passwordResetMsg');if(e){e.textContent=t;e.className='muted'+(b?' warn':'')}}
function showReset(){$r('auth')?.classList.add('hidden');$r('app')?.classList.add('hidden');$r('tabs')?.classList.add('hidden');$r('passwordResetPanel')?.classList.remove('hidden')}
async function send(email){const x=c();if(!x)throw Error('Auth indisponible');return await x.auth.resetPasswordForEmail(email,{redirectTo:APP_URL})}
document.addEventListener('click',async e=>{
 const f=e.target.closest?.('#forgotPasswordBtn');
 if(f){const email=($r('email')?.value||'').trim();if(!email){am("Entre d'abord ton adresse e-mail.",true);return $r('email')?.focus()}f.disabled=true;am('Envoi du lien…');try{const {error}=await send(email);if(error)throw error;am("Si cette adresse correspond à un compte, un e-mail de réinitialisation vient d'être envoyé.")}catch(err){console.warn(err);am("Impossible d'envoyer le lien pour le moment. Réessaie dans quelques minutes.",true)}finally{f.disabled=false}return}
 const s=e.target.closest?.('#saveNewPassword');
 if(s){const a=$r('newPassword')?.value||'',b=$r('newPasswordConfirm')?.value||'';if(a.length<8)return rm('Le mot de passe doit contenir au moins 8 caractères.',true);if(a!==b)return rm('Les deux mots de passe ne correspondent pas.',true);s.disabled=true;rm('Enregistrement…');try{const x=c();const {error}=await x.auth.updateUser({password:a});if(error)throw error;rm('Mot de passe modifié. Reconnexion…');setTimeout(async()=>{try{await x.auth.signOut()}catch(_){ }$r('passwordResetPanel')?.classList.add('hidden');$r('auth')?.classList.remove('hidden');am('Mot de passe modifié. Reconnecte-toi avec le nouveau.');history.replaceState({},document.title,APP_URL)},900)}catch(err){console.warn(err);rm("Le lien a peut-être expiré. Redemande un e-mail de réinitialisation.",true)}finally{s.disabled=false}}
},true);
(function bind(){const x=c();if(!x)return setTimeout(bind,50);x.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')showReset()});const u=new URL(location.href),h=new URLSearchParams(location.hash.replace(/^#/,''));if(u.searchParams.get('type')==='recovery'||h.get('type')==='recovery')showReset()})();
window.sendPasswordResetForMember=async email=>{try{const {error}=await send(String(email||'').trim());if(error)throw error;if(typeof toast==='function')toast('Lien de réinitialisation envoyé');return true}catch(err){console.warn(err);if(typeof toast==='function')toast("Impossible d'envoyer le lien");return false}};
})();