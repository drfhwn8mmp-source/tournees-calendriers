/* Amicale SP Volvic — file hors connexion V3 : anti-écrasement multi-téléphones */
(function () {
  const KEY='visitQueue', CONFLICTS='visitQueueConflicts';
  let flushing=false;

  function read(k){try{const q=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(q)?q:[]}catch(_){return[]}}
  function key(p){return String(p?.campaign_id||'')+'|'+String(p?.household_id||'')}
  function dedupe(a){const m=new Map();for(const p of a)if(p?.household_id)m.set(key(p),p);return [...m.values()]}
  function write(k,a){const v=dedupe(a);localStorage.setItem(k,JSON.stringify(v));return v}
  function time(v){const s=v?.client_updated_at||v?.updated_at||v?.visited_at;const t=s?Date.parse(s):0;return Number.isFinite(t)?t:0}

  try{write(KEY,read(KEY));write(CONFLICTS,read(CONFLICTS))}catch(_){}

  window.queue=function(p){
    const q=read(KEY).filter(x=>key(x)!==key(p));q.push(p);const saved=write(KEY,q);
    try{setSync(`${saved.length} saisie(s) à synchroniser`,true)}catch(_){}
  };

  async function remoteFor(p){
    try{
      const {data,error}=await sb.from('visits').select('*')
        .eq('campaign_id',p.campaign_id).eq('household_id',p.household_id).maybeSingle();
      return error?null:data;
    }catch(_){return null}
  }

  window.flushQueue=async function(){
    if(!navigator.onLine||flushing)return;
    flushing=true;
    try{
      const snapshot=dedupe(read(KEY));if(!snapshot.length)return;
      const failed=new Set(), conflicted=new Set();
      let conflicts=read(CONFLICTS);

      for(const p of snapshot){
        const k=key(p);
        try{
          const remote=await remoteFor(p);
          /* Une donnée serveur postérieure à la saisie hors-ligne ne doit jamais être écrasée silencieusement. */
          if(remote && time(remote)>time(p)){
            conflicted.add(k);
            conflicts=conflicts.filter(x=>key(x)!==k);
            conflicts.push({ ...p, _server:remote, _conflict_at:new Date().toISOString() });
            continue;
          }
          const {error}=await sb.from('visits').upsert(p,{onConflict:'campaign_id,household_id'});
          if(error)failed.add(k);
        }catch(_){failed.add(k)}
      }

      write(CONFLICTS,conflicts);
      const now=dedupe(read(KEY));
      const snap=new Map(snapshot.map(p=>[key(p),p]));
      const left=now.filter(p=>{
        const k=key(p),sent=snap.get(k);
        if(!sent)return true;
        if(failed.has(k))return true;
        if(conflicted.has(k))return false;
        return JSON.stringify(p)!==JSON.stringify(sent);
      });
      const saved=write(KEY,left);
      const nconf=read(CONFLICTS).length;

      if(nconf){
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
  addEventListener('online',()=>setTimeout(()=>window.flushQueue(),250));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&navigator.onLine)setTimeout(()=>window.flushQueue(),250)});
  addEventListener('focus',()=>{if(navigator.onLine)setTimeout(()=>window.flushQueue(),250)});
})();