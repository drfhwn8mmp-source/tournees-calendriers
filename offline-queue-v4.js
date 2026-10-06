/* Amicale SP Volvic — file hors connexion V4
   Anti-écrasement + blocage des synchronisations après clôture définitive. */
(function () {
  const KEY='visitQueue', CONFLICTS='visitQueueConflicts', CLOSED='visitQueueClosed';
  let flushing=false;

  function read(k){try{const q=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(q)?q:[]}catch(_){return[]}}
  function key(p){return String(p?.campaign_id||'')+'|'+String(p?.household_id||'')}
  function dedupe(a){const m=new Map();for(const p of a)if(p?.household_id)m.set(key(p),p);return [...m.values()]}
  function write(k,a){const v=dedupe(a);localStorage.setItem(k,JSON.stringify(v));return v}
  function time(v){const s=v?.client_updated_at||v?.updated_at||v?.visited_at;const t=s?Date.parse(s):0;return Number.isFinite(t)?t:0}

  function sharedHouse(h){
    try{
      const s=(sectors||[]).find(x=>x.id===h?.sector_id);
      const c=(cities||[]).find(x=>x.id===(s?.city_id||h?.city_id));
      return c?.shared_round===true;
    }catch(_){return false}
  }
  function house(id){try{return (households||[]).find(x=>x.id===id)}catch(_){return null}}

  try{write(KEY,read(KEY));write(CONFLICTS,read(CONFLICTS));write(CLOSED,read(CLOSED))}catch(_){}

  window.queue=function(p){
    const q=read(KEY).filter(x=>key(x)!==key(p));q.push(p);const saved=write(KEY,q);
    try{setSync(`${saved.length} saisie(s) à synchroniser`,true)}catch(_){}
  };

  async function remoteFor(p){
    const {data,error}=await sb.from('visits').select('*')
      .eq('campaign_id',p.campaign_id).eq('household_id',p.household_id).maybeSingle();
    if(error)throw error; return data||null;
  }

  async function finalClosed(p){
    const h=house(p.household_id);
    /* Si la maison n'est pas encore chargée, on ne prend aucun risque : échec temporaire,
       la saisie reste dans la file jusqu'à ce que l'état puisse être vérifié. */
    if(!h)throw new Error('house-not-loaded');

    let q=sb.from('tour_final_states').select('is_closed')
      .eq('campaign_id',p.campaign_id);

    if(sharedHouse(h)){
      q=q.eq('scope','shared').is('team_id',null);
    }else{
      let tid=null;
      try{tid=teamForHouse(h)}catch(_){}
      tid=tid||p.original_team_id||p.team_id||null;
      if(!tid)throw new Error('team-not-known');
      q=q.eq('scope','team').eq('team_id',tid);
    }

    const {data,error}=await q.limit(1).maybeSingle();
    if(error)throw error;
    return !!data?.is_closed;
  }

  window.flushQueue=async function(){
    if(!navigator.onLine||flushing)return;
    flushing=true;
    try{
      const snapshot=dedupe(read(KEY));if(!snapshot.length)return;
      const failed=new Set(), conflicted=new Set(), closedKeys=new Set();
      let conflicts=read(CONFLICTS), closed=read(CLOSED);

      for(const p of snapshot){
        const k=key(p);
        try{
          /* Vérification PRIORITAIRE : une tournée définitivement clôturée
             ne reçoit jamais une ancienne saisie hors connexion. */
          if(await finalClosed(p)){
            closedKeys.add(k);
            closed=closed.filter(x=>key(x)!==k);
            closed.push({...p,_blocked_reason:'final_closed',_blocked_at:new Date().toISOString()});
            continue;
          }

          const remote=await remoteFor(p);
          if(remote && time(remote)>time(p)){
            conflicted.add(k);
            conflicts=conflicts.filter(x=>key(x)!==k);
            conflicts.push({...p,_server:remote,_conflict_at:new Date().toISOString()});
            continue;
          }

          const {error}=await sb.from('visits').upsert(p,{onConflict:'campaign_id,household_id'});
          if(error)failed.add(k);
        }catch(_){
          /* Si le contrôle du verrou ou le réseau échoue, aucune écriture :
             la saisie reste dans la file pour un prochain essai. */
          failed.add(k);
        }
      }

      write(CONFLICTS,conflicts);
      write(CLOSED,closed);

      const now=dedupe(read(KEY)), snap=new Map(snapshot.map(p=>[key(p),p]));
      const left=now.filter(p=>{
        const k=key(p),sent=snap.get(k);
        if(!sent)return true;
        if(failed.has(k))return true;
        if(conflicted.has(k)||closedKeys.has(k))return false;
        return JSON.stringify(p)!==JSON.stringify(sent);
      });
      const saved=write(KEY,left), nconf=read(CONFLICTS).length, nclosed=read(CLOSED).length;

      if(nclosed){
        try{setSync(`${nclosed} saisie(s) bloquée(s) après clôture`,true)}catch(_){}
        try{toast(`🔒 ${nclosed} saisie(s) hors connexion conservée(s), mais non envoyée(s) car la tournée est clôturée`,true)}catch(_){}
      }else if(nconf){
        try{setSync(`${nconf} conflit(s) à vérifier`,true)}catch(_){}
        try{toast(`⚠️ ${nconf} saisie(s) non écrasée(s) : modification plus récente sur un autre téléphone`,true)}catch(_){}
      }else if(!saved.length){
        try{setSync('Synchronisé',false)}catch(_){}
        try{toast('Saisies synchronisées')}catch(_){}
      }else{
        try{setSync(`${saved.length} saisie(s) en attente`,true)}catch(_){}
      }

      if(!saved.length){try{if(typeof loadAll==='function')await loadAll()}catch(_){}}
    }finally{flushing=false}
  };

  window.getVisitQueueConflicts=()=>read(CONFLICTS);
  window.getVisitQueueClosed=()=>read(CLOSED);
  addEventListener('online',()=>setTimeout(()=>window.flushQueue(),250));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)setTimeout(()=>window.flushQueue(),250)});
  addEventListener('focus',()=>{if(navigator.onLine)setTimeout(()=>window.flushQueue(),250)});
})();