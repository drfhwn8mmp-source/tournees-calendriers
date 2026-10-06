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
      const full=prompt('Prénom et nom');
      if(!full)return;
      msg.textContent='Envoi de la demande…';
      const {error}=await sb.auth.signUp({email:email.value.trim(),password:password.value,options:{data:{full_name:full}}});
      if(error){msg.textContent=error.message;return;}
      msg.innerHTML='<strong>✅ Demande de création de compte enregistrée</strong><br><br>Votre demande a bien été prise en compte.<br><strong>Un administrateur doit maintenant valider votre compte et vous attribuer une équipe.</strong><br><br>Vous pourrez ensuite vous connecter à l’application.';
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installSignupConfirmation,100),{once:true});
  else setTimeout(installSignupConfirmation,100);
})();
