/* Chargement complet Supabase — Amicale SP Volvic
   Recharge toutes les maisons/visites par pages de 1000, puis rafraîchit l'interface.
   Aucune donnée n'est modifiée. */
(function(){
  const PAGE=1000;

  async function allHouseholds(){
    const out=[];
    for(let from=0;;from+=PAGE){
      const {data,error}=await sb.from('households')
        .select('*').eq('active',true)
        .order('street',{ascending:true})
        .order('house_number',{ascending:true})
        .order('id',{ascending:true})
        .range(from,from+PAGE-1);
      if(error) throw error;
      out.push(...(data||[]));
      if(!data || data.length<PAGE) break;
    }
    return out;
  }

  async function allVisits(){
    if(!campaign?.id) return [];
    const out=[];
    for(let from=0;;from+=PAGE){
      const {data,error}=await sb.from('visits')
        .select('*').eq('campaign_id',campaign.id)
        .order('id',{ascending:true})
        .range(from,from+PAGE-1);
      if(error) throw error;
      out.push(...(data||[]));
      if(!data || data.length<PAGE) break;
    }
    return out;
  }

  async function reloadCompleteData(){
    try{
      setSync('Chargement complet des adresses…');
      const [hh,vv]=await Promise.all([allHouseholds(),allVisits()]);
      households=hh;
      visits=vv;
      window.__FULL_DATA_LOADED__={households:hh.length,visits:vv.length,at:new Date().toISOString()};
      renderFilters();
      renderHouses();
      renderStats();
      renderMap();
      setSync(`Synchronisé — ${hh.length} foyers chargés`);
    }catch(e){
      console.error('Chargement complet:',e);
      setSync('Erreur chargement complet',true);
      toast('Erreur pendant le chargement complet des adresses');
    }
  }

  // app.js a déjà terminé son premier chargement à ce stade.
  // On remplace immédiatement ce jeu partiel par toutes les pages.
  setTimeout(reloadCompleteData,50);

  // Le bouton ↻ doit aussi refaire un chargement complet après son loadAll normal.
  const refresh=document.getElementById('refreshBtn');
  if(refresh) refresh.addEventListener('click',()=>setTimeout(reloadCompleteData,250));

  window.reloadCompleteData=reloadCompleteData;
})();
