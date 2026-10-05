/* Tournées Calendriers — mise à jour PWA sans rechargement en pleine tournée v3 */
(function () {
  const APP_VERSION = '2026.10.05-2';
  function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
  function platform(){const u=navigator.userAgent||'';return /android/i.test(u)?'android':/iphone|ipad|ipod/i.test(u)?'ios':'other'}
  function installHelp(){
    const c=[...document.querySelectorAll('.card')].find(x=>{const t=(x.textContent||'').toLowerCase();return t.includes('installation')&&t.includes("écran d'accueil")});
    const p=c?.querySelector('p');if(!p)return;
    if(isStandalone())return p.textContent='✅ Application installée sur ce téléphone.';
    p.innerHTML=platform()==='ios'?'<b>iPhone / iPad :</b> Safari → Partager → Ajouter à l’écran d’accueil.':platform()==='android'?'<b>Android :</b> Chrome → menu ⋮ → Installer l’application ou Ajouter à l’écran d’accueil.':'<b>Installation :</b> ouvre le menu du navigateur puis choisis Installer l’application ou Ajouter à l’écran d’accueil.';
  }
  function pending(){try{return (JSON.parse(localStorage.getItem('visitQueue')||'[]')||[]).length>0}catch(_){return false}}
  function editing(){
    if(pending())return true;
    const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return true;
    return !!document.querySelector('#mapDoneOfflineV2[style*="display:flex"], #endDayPanel:not(.hidden)');
  }
  function notice(){
    const t=document.getElementById('toast');if(!t)return;
    t.textContent='⬆️ Mise à jour prête — elle sera appliquée quand tu ne seras plus en saisie.';
    t.style.display='block';setTimeout(()=>t.style.display='none',4500);
  }
  async function activate(reg){
    if(!reg?.waiting)return;
    if(editing()){notice();return}
    reg.waiting.postMessage({type:'SKIP_WAITING'});
  }
  async function register(){
    if(!('serviceWorker'in navigator))return;
    try{
      const reg=await navigator.serviceWorker.register('./sw.js?v='+encodeURIComponent(APP_VERSION),{scope:'./',updateViaCache:'none'});
      await reg.update().catch(()=>{});
      await activate(reg);
      reg.addEventListener('updatefound',()=>{
        const w=reg.installing;if(!w)return;
        w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)activate(reg)});
      });
      let changed=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(changed)return;changed=true;
        /* Pas de reload forcé : la version prend effet au prochain lancement/rechargement naturel. */
        const t=document.getElementById('toast');if(t){t.textContent='✅ Mise à jour prête pour le prochain lancement.';t.style.display='block';setTimeout(()=>t.style.display='none',3500)}
      });
      window.addEventListener('focus',()=>activate(reg));
      document.addEventListener('visibilitychange',()=>{if(!document.hidden){reg.update().catch(()=>{});activate(reg)}});
    }catch(e){console.error('Service Worker',e)}
  }
  addEventListener('load',()=>{installHelp();register()});
})();