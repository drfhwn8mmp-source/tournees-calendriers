/* Amicale SP Volvic — protection modifications simultanées V1
   Vérifie la version serveur juste avant une écriture en ligne.
   Aucun changement de schéma Supabase. */
(function(){
  function stamp(v){ return v?.client_updated_at || v?.updated_at || v?.visited_at || null; }
  function sameStamp(a,b){ return String(stamp(a)||'')===String(stamp(b)||''); }

  async function remoteVisit(id){
    try{
      const r=await sb.from('visits').select('*')
        .eq('campaign_id',campaign.id).eq('household_id',id).maybeSingle();
      return r.error ? null : (r.data||null);
    }catch(_){ return null; }
  }

  async function conflict(id){
    if(!navigator.onLine) return false;
    const local=visitFor(id)||null, remote=await remoteVisit(id);
    if(!remote) return false;
    if(!local) return true;
    return !sameStamp(local,remote);
  }

  function refreshRemote(id){
    return remoteVisit(id).then(v=>{
      if(v){ try{applyLocal(v)}catch(_){} try{window.renderMap?.()}catch(_){} }
      return v;
    });
  }

  async function ask(id){
    if(!(await conflict(id))) return true;
    const ok=confirm("⚠️ Cette maison vient d’être modifiée sur un autre téléphone.\n\nAppuie sur OK pour recharger la dernière saisie et éviter de l’écraser.");
    await refreshRemote(id);
    if(!ok) toast('Enregistrement annulé : données actualisées');
    else toast('Données actualisées. Vérifie puis valide de nouveau.');
    return false;
  }

  function install(){
    if(typeof window.quickStatus==='function'){
      const oldQuick=window.quickStatus;
      window.quickStatus=async function(id,s){
        if(!(await ask(id))) return;
        return oldQuick.apply(this,arguments);
      };
    }

    document.addEventListener('click',async function(e){
      const b=e.target.closest?.('button[onclick^="saveVisit("]');
      if(!b || b.dataset.tcConflictOk==='1') return;
      const m=(b.getAttribute('onclick')||'').match(/saveVisit\(['"]([^'"]+)['"]/);
      if(!m) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const id=m[1];
      if(!(await ask(id))) return;
      b.dataset.tcConflictOk='1';
      try{ b.click(); } finally{ setTimeout(()=>delete b.dataset.tcConflictOk,0); }
    },true);

    if(typeof window.mapVisitAction==='function'){
      const oldMap=window.mapVisitAction;
      window.mapVisitAction=async function(id,status){
        if(!(await ask(id))) return;
        return oldMap.apply(this,arguments);
      };
      window.mapVisitActionV9=window.mapVisitAction;
    }
  }
  setTimeout(install,2200);
})();