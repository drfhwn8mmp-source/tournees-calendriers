/* Carte FINAL V14 */
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

/* Confirmation création de compte */
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

/* AIDE ÉQUIPE V2 — remplace le gestionnaire d'origine.
   Corrige aussi le filtre secteur resté sur le secteur de l'équipe d'origine. */
(function(){
  const E=id=>document.getElementById(id);

  function refreshAll(){
    try{
      if(typeof renderHouses==='function') renderHouses();
      if(typeof renderStats==='function') renderStats();
      if(typeof window.renderMap==='function') window.renderMap();
    }catch(e){console.error('Aide équipe V2',e)}
  }

  function install(){
    const btn=E('helpBtn');
    if(!btn || btn.dataset.helpV2==='1') return;
    btn.dataset.helpV2='1';

    btn.onclick=()=>{
      const mine=(typeof myTeamIds==='function'?myTeamIds():[]);
      const choices=(teams||[]).filter(t=>!mine.includes(t.id));
      if(!choices.length){ if(typeof toast==='function')toast('Aucune autre équipe disponible'); return; }

      const names=choices.map((t,i)=>`${i+1}. ${t.name}`).join('\n');
      const n=+prompt('Quelle équipe aider ?\n'+names);
      if(!n || !choices[n-1]) return;

      const chosen=choices[n-1];
      helpTeam=chosen.id;

      const banner=E('helpBanner');
      if(banner){
        banner.classList.remove('hidden');
        banner.innerHTML=`🤝 Vous aidez actuellement <b>${typeof esc==='function'?esc(chosen.name):chosen.name}</b> <button class="btn alt" onclick="stopHelp()">Revenir à mon équipe</button>`;
      }

      /* Important : un ancien secteur de l'équipe d'origine masquait l'équipe aidée. */
      if(E('sectorSelect')) E('sectorSelect').value='';
      if(E('filterStatus')) E('filterStatus').value='';
      if(E('searchHouse')) E('searchHouse').value='';

      /* Sélection explicite de l'équipe aidée dans le filtre. */
      if(E('teamView')) E('teamView').value=chosen.id;

      refreshAll();
      setTimeout(()=>{
        if(E('sectorSelect')) E('sectorSelect').value='';
        if(E('teamView')) E('teamView').value=chosen.id;
        refreshAll();
      },300);
    };

    window.stopHelp=()=>{
      helpTeam=null;
      const banner=E('helpBanner');
      if(banner) banner.classList.add('hidden');
      if(E('sectorSelect')) E('sectorSelect').value='';
      if(E('filterStatus')) E('filterStatus').value='';
      if(E('searchHouse')) E('searchHouse').value='';
      if(E('teamView')) E('teamView').value='';
      refreshAll();
    };
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install,250),{once:true});
  else setTimeout(install,250);
})();
