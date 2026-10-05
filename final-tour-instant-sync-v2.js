/* Synchronisation instantanée des clôtures définitives — V2 */
(function(){
  let channel=null;

  async function syncFinalState(){
    try{
      if(!campaign?.id) return;
      if(typeof window.refreshFinalTourLocks==='function') await window.refreshFinalTourLocks();
      if(typeof window.renderFinalTour==='function') await window.renderFinalTour();
      try{window.renderMap?.()}catch(_){}
      try{window.renderHouses?.()}catch(_){}
      try{window.renderStats?.()}catch(_){}
    }catch(e){console.error('final state sync',e)}
  }

  function install(){
    if(!window.sb || !window.campaign?.id) return setTimeout(install,500);

    try{ if(channel) sb.removeChannel(channel) }catch(_){}

    channel=sb.channel('tour-final-states-'+campaign.id)
      .on('postgres_changes',{
        event:'*',
        schema:'public',
        table:'tour_final_states',
        filter:'campaign_id=eq.'+campaign.id
      },()=>syncFinalState())
      .subscribe();

    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible') syncFinalState();
    });
    window.addEventListener('focus',syncFinalState);
    syncFinalState();
  }

  setTimeout(install,2400);
})();
