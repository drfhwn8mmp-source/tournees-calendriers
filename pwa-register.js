/* Carte FINAL V14 — charge le moteur final APRES tous les anciens scripts carte */
(function(){
  const VERSION='2026.10.06-final14';
  function load(){
    if(document.querySelector('script[data-map-final-v14]'))return;
    const s=document.createElement('script');
    s.src='./map-house-actions-final-v14.js?v='+encodeURIComponent(VERSION);
    s.dataset.mapFinalV14='1';
    s.onload=()=>{try{window.__MAP_FINAL_VERSION='V14';window.renderMap?.()}catch(e){console.error(e)}};
    document.body.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,50),{once:true});
  else setTimeout(load,50);
})();

/* Confirmation claire après demande de création de compte */
(function(){
  function installSignupConfirmation(){
    const btn=document.getElementById('signupBtn'), email=document.getElementById('email'),
          password=document.getElementById('password'), msg=document.getElementById('authMsg');
    if(!btn||!email||!password||!msg||typeof sb==='undefined')return;
    btn.onclick=async()=>{
      const full=prompt('Prénom et nom'); if(!full)return;
      msg.textContent='Envoi de la demande…';
      const {error}=await sb.auth.signUp({email:email.value.trim(),password:password.value,options:{data:{full_name:full}}});
      if(error){msg.textContent=error.message;return;}
      msg.innerHTML='<strong>✅ Demande de création de compte enregistrée</strong><br><br>Votre demande a bien été prise en compte.<br><strong>Un administrateur doit maintenant valider votre compte et vous attribuer une équipe.</strong><br><br>Vous pourrez ensuite vous connecter à l’application.';
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installSignupConfirmation,100),{once:true});
  else setTimeout(installSignupConfirmation,100);
})();

/* Correctif Aide autre équipe V1 — bascule liste + carte sur l'équipe aidée */
(function(){
 const E=id=>document.getElementById(id);
 function refresh(){
  try{
   const s=E('teamView');
   if(helpTeam&&s)s.value=helpTeam;
   else if(s&&!helpTeam&&s.value&&s.value!=='__shared__')s.value='';
   if(typeof renderHouses==='function')renderHouses();
   if(typeof renderStats==='function')renderStats();
   if(typeof renderMap==='function')renderMap();
  }catch(e){console.error('help-team-fix',e)}
 }
 function install(){
  const b=E('helpBtn'); if(!b||b.dataset.helpFix)return; b.dataset.helpFix='1';
  b.addEventListener('click',()=>{setTimeout(refresh,0);setTimeout(refresh,150);setTimeout(refresh,400)});
  const old=window.stopHelp;
  if(typeof old==='function'&&!old.__hf){
   const w=function(){const r=old.apply(this,arguments);setTimeout(refresh,0);setTimeout(refresh,150);return r};w.__hf=1;window.stopHelp=w;
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,150),{once:true});else setTimeout(install,150);
})();
