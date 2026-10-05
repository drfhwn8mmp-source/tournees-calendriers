/* Synchronisation temps réel maisons + visites — V1 */
(function(){
  let ch=null, timer=null, busy=false;

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(syncAll,180);
  }

  async function syncAll(){
    if(busy || !window.campaign?.id || typeof window.loadAll!=='function') return;
    busy=true;
    try{
      await window.loadAll();
      try{window.renderHouses?.()}catch(_){}
      try{window.renderMap?.()}catch(_){}
      try{window.renderStats?.()}catch(_){}
      try{window.renderHome?.()}catch(_){}
    }catch(e){console.error('live household sync',e)}
    finally{busy=false}
  }

  function install(){
    if(!window.sb || !window.campaign?.id || typeof window.loadAll!=='function')
      return setTimeout(install,500);

    try{if(ch) sb.removeChannel(ch)}catch(_){}

    ch=sb.channel('live-round-'+campaign.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'visits',
        filter:'campaign_id=eq.'+campaign.id},schedule)
      .on('postgres_changes',{event:'*',schema:'public',table:'households'},schedule)
      .subscribe();

    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible') schedule();
    });
    window.addEventListener('focus',schedule);
  }

  setTimeout(install,2700);
})();