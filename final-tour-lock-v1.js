/* Verrouillage réel après clôture définitive — Amicale SP Volvic — V1
   Couche UI : empêche les actions terrain sur une tournée clôturée.
   La réouverture reste gérée par final-tour-ui.js et réservée à l'admin. */
(function(){
  let states=[], loadedFor=null;
  const E=id=>document.getElementById(id);

  function sharedHouse(h){
    try{const s=sectors.find(x=>x.id===h?.sector_id),c=cities.find(x=>x.id===s?.city_id);return c?.shared_round===true}catch(_){return false}
  }
  async function refresh(){
    if(!campaign?.id)return;
    const {data,error}=await sb.from('tour_final_states').select('id,scope,team_id,is_closed').eq('campaign_id',campaign.id);
    if(!error){states=data||[];loadedFor=campaign.id}
  }
  function closedForHouse(h){
    if(!h)return false;
    if(sharedHouse(h))return states.some(s=>s.scope==='shared'&&s.is_closed);
    let tid=null; try{tid=teamForHouse(h)}catch(_){}
    return !!tid && states.some(s=>s.scope==='team'&&s.team_id===tid&&s.is_closed);
  }
  function deny(){toast('🔒 Cette tournée est clôturée. Seul l’administrateur peut la rouvrir.')}
  window.isHouseFinalLocked=closedForHouse;

  function wrap(name,idArg=0){
    const old=window[name]; if(typeof old!=='function')return;
    window[name]=function(){
      const id=arguments[idArg],h=(households||[]).find(x=>x.id===id);
      if(closedForHouse(h)){deny();return Promise.resolve(false)}
      return old.apply(this,arguments);
    };
  }

  async function install(){
    await refresh();
    /* Visites liste + carte, validation Fait, changement Maison/Immeuble,
       réaffectation permanente si la fonction est présente. */
    wrap('saveVisit');
    wrap('saveMapDone');
    wrap('mapVisitAction');
    wrap('mapVisitActionV9');
    wrap('configureDwelling');
    wrap('mapDwellingType');
    wrap('claimHouseholdForTeam');
    wrap('claimHousehold');
    wrap('reassignHousehold');
    wrap('moveHouseholdToTeam');

    const oldMap=window.renderMap;
    if(typeof oldMap==='function')window.renderMap=function(){
      const r=oldMap.apply(this,arguments);
      setTimeout(()=>{
        (markers||[]).forEach(m=>{
          const id=m.__houseId,h=(households||[]).find(x=>x.id===id),p=m.getPopup?.();
          if(!h||!p||!closedForHouse(h))return;
          let s=p.getContent(); if(typeof s!=='string')return;
          /* En tournée verrouillée, on garde l'adresse visible mais aucune action terrain. */
          s=s.replace(/<button[\s\S]*?<\/button>/g,'');
          s += '<br><div class="pill">🔒 Tournée clôturée — consultation uniquement</div>';
          p.setContent(s);
        });
      },0);
      return r;
    };

    /* Après clôture/réouverture, recharge immédiatement l'état des verrous. */
    const oldFinal=window.renderFinalTour;
    if(typeof oldFinal==='function')window.renderFinalTour=async function(){
      await refresh();
      return oldFinal.apply(this,arguments);
    };

    /* Sécurité supplémentaire : intercepte les clics de boutons d'une maison verrouillée
       dans la liste si un ancien rendu conserve encore des commandes. */
    document.addEventListener('click',e=>{
      const b=e.target.closest?.('button'); if(!b)return;
      const oc=b.getAttribute('onclick')||'';
      const m=oc.match(/['"]([0-9a-fA-F-]{30,})['"]/); if(!m)return;
      const h=(households||[]).find(x=>x.id===m[1]);
      if(h&&closedForHouse(h)){
        e.preventDefault();e.stopImmediatePropagation();deny();
      }
    },true);

    setInterval(()=>{ if(campaign?.id && loadedFor===campaign.id) refresh() },30000);
    try{window.renderMap?.()}catch(_){}
  }
  setTimeout(install,1600);
})();