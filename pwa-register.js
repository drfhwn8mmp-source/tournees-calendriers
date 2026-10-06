/* Tournées Calendriers — mise à jour PWA protégée v5 + moteur carte V10 */
(function () {
  const APP_VERSION = '2026.10.06-2';
  function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
  function platform(){const u=navigator.userAgent||'';return /android/i.test(u)?'android':/iphone|ipad|ipod/i.test(u)?'ios':'other'}
  function installHelp(){
    const c=[...document.querySelectorAll('.card')].find(x=>{const t=(x.textContent||'').toLowerCase();return t.includes('installation')&&t.includes("écran d'accueil")});
    const p=c?.querySelector('p');if(!p)return;
    if(isStandalone())return p.textContent='✅ Application installée sur ce téléphone.';
    p.innerHTML=platform()==='ios'?'<b>iPhone / iPad :</b> Safari → Partager → Ajouter à l’écran d’accueil.':platform()==='android'?'<b>Android :</b> Chrome → menu ⋮ → Installer l’application ou Ajouter à l’écran d’accueil.':'<b>Installation :</b> ouvre le menu du navigateur puis choisis Installer l’application ou Ajouter à l’écran d’accueil.';
  }
  function has(k){try{const a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)&&a.length>0}catch(_){return false}}
  function editing(){
    if(has('visitQueue')||has('visitQueueConflicts')||has('visitQueueClosed'))return true;
    const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return true;
    return !!document.querySelector('#mapDoneOfflineV2[style*="display:flex"], #endDayPanel:not(.hidden), #offlineConflictPanel:not(.hidden), #closedOfflinePanel:not(.hidden)');
  }
  function notice(){
    const t=document.getElementById('toast');if(!t)return;
    t.textContent='⬆️ Mise à jour prête — conservée en attente tant que des saisies ou contrôles restent à traiter.';
    t.style.display='block';setTimeout(()=>t.style.display='none',5000);
  }
  async function activate(reg){if(!reg?.waiting)return;if(editing()){notice();return}reg.waiting.postMessage({type:'SKIP_WAITING'});}
  function loadMapV10(){
    if(document.querySelector('script[data-map-v10]'))return;
    const s=document.createElement('script');
    s.src='./map-house-actions-v10.js?v='+encodeURIComponent(APP_VERSION);
    s.dataset.mapV10='1';
    s.onload=()=>{try{window.renderMap?.()}catch(_){}};
    document.body.appendChild(s);
  }
  async function register(){
    loadMapV10();
    if(!('serviceWorker'in navigator))return;
    try{
      const reg=await navigator.serviceWorker.register('./sw.js?v='+encodeURIComponent(APP_VERSION),{scope:'./',updateViaCache:'none'});
      await reg.update().catch(()=>{}); await activate(reg);
      reg.addEventListener('updatefound',()=>{
        const w=reg.installing;if(!w)return;
        w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)activate(reg)});
      });
      let changed=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(changed)return;changed=true;
        const t=document.getElementById('toast');if(t){t.textContent='✅ Mise à jour installée — ferme puis rouvre l’application.';t.style.display='block';setTimeout(()=>t.style.display='none',5000)}
      });
      window.addEventListener('focus',()=>activate(reg));
      document.addEventListener('visibilitychange',()=>{if(!document.hidden){reg.update().catch(()=>{});activate(reg)}});
    }catch(e){console.error('Service Worker',e)}
  }
  addEventListener('load',()=>{installHelp();register()});
})();
