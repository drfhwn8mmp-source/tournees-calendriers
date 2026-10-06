/* Amicale SP Volvic — verrou serveur immédiat avant action terrain V2 */
(function(){
  function sharedHouse(h){
    try{
      const s=(sectors||[]).find(x=>x.id===h?.sector_id);
      const c=(cities||[]).find(x=>x.id===(s?.city_id||h?.city_id));
      return c?.shared_round===true;
    }catch(_){return false}
  }
  function house(id){try{return (households||[]).find(x=>x.id===id)}catch(_){return null}}
  async function serverLocked(id){
    const h=house(id); if(!h||!campaign?.id)return false;
    let q=sb.from('tour_final_states').select('is_closed').eq('campaign_id',campaign.id);
    if(sharedHouse(h)) q=q.eq('scope','shared').is('team_id',null);
    else{
      let tid=null;try{tid=teamForHouse(h)}catch(_){}
      if(!tid)return false;
      q=q.eq('scope','team').eq('team_id',tid);
    }
    const {data,error}=await q.limit(1).maybeSingle();
    if(error) throw error;
    return !!data?.is_closed;
  }
  function deny(){try{toast('🔒 Cette tournée vient d’être clôturée. Aucune nouvelle saisie n’est autorisée.',true)}catch(_){alert('Cette tournée est clôturée.')}}

  function wrap(name,idArg=0){
    const old=window[name]; if(typeof old!=='function'||old.__serverFinalGuard)return;
    const guarded=async function(){
      const id=arguments[idArg];
      if(!navigator.onLine){
        /* Le verrou serveur ne peut pas être vérifié hors connexion.
           On laisse la file hors-ligne gérer la saisie; elle sera contrôlée au retour réseau. */
        return old.apply(this,arguments);
      }
      try{
        if(await serverLocked(id)){deny();try{window.renderFinalTour?.()}catch(_){};return false}
      }catch(_){
        try{toast('⚠️ Impossible de vérifier l’état de la tournée. Réessaie dans un instant.',true)}catch(_){}
        return false;
      }
      return old.apply(this,arguments);
    };
    guarded.__serverFinalGuard=true;
    window[name]=guarded;
  }

  function install(){
    ['saveVisit','saveMapDone','mapVisitAction','mapVisitActionV9'].forEach(n=>wrap(n));
  }
  setTimeout(install,3800);
  addEventListener('pageshow',()=>setTimeout(install,300));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,300)});
})();