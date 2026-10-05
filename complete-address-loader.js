/* Chargement complet léger V2 — Amicale SP Volvic
   Récupère tous les foyers par pages Supabase.
   N'affiche que les foyers correspondant aux filtres/recherche, avec pagination UI.
   La carte affiche les points dans la zone visible pour éviter de bloquer le mobile.
*/
(function(){
  const PAGE=1000, UI_PAGE=80;
  let uiLimit=UI_PAGE, loading=false;

  async function fetchAll(table, build){
    const out=[];
    for(let from=0;;from+=PAGE){
      let q=build(sb.from(table).select('*')).range(from,from+PAGE-1);
      const {data,error}=await q;
      if(error) throw error;
      out.push(...(data||[]));
      if(!data || data.length<PAGE) break;
    }
    return out;
  }

  function naturalCmp(a,b){
    const c=new Intl.Collator('fr',{numeric:true,sensitivity:'base',ignorePunctuation:true});
    return c.compare(String(a.street||''),String(b.street||'')) ||
           c.compare(String(a.house_number||''),String(b.house_number||'')) ||
           c.compare(String(a.locality||''),String(b.locality||'')) ||
           c.compare(String(a.id||''),String(b.id||''));
  }

  function filtered(){
    const sid=document.getElementById('sectorSelect')?.value||'';
    const tid=document.getElementById('teamView')?.value||'';
    const fs=document.getElementById('filterStatus')?.value||'';
    const q=(document.getElementById('searchHouse')?.value||'').toLowerCase();
    return visibleHouses().filter(h=>(!sid||h.sector_id===sid)&&(!tid||teamForHouse(h)===tid))
      .filter(h=>{
        const v=visitFor(h.id), st=v?.status||'a_faire';
        return (!fs||st===fs) &&
          `${h.house_number||''} ${h.street||''} ${h.locality||''} ${h.permanent_note||''}`.toLowerCase().includes(q);
      }).sort(naturalCmp);
  }

  window.renderHouses=function(){
    const box=document.getElementById('houses'); if(!box)return;
    const all=filtered(), shown=all.slice(0,uiLimit);
    box.innerHTML=shown.map(h=>houseHTML(h)).join('') ||
      '<div class="card muted">Aucun foyer correspondant.</div>';
    if(all.length>shown.length){
      const more=document.createElement('div'); more.className='card';
      more.innerHTML=`<div class="muted">${shown.length} affichées sur ${all.length}</div><br><button class="btn alt" id="showMoreHouses">Afficher les ${Math.min(UI_PAGE,all.length-shown.length)} suivantes</button>`;
      box.appendChild(more);
      document.getElementById('showMoreHouses').onclick=()=>{uiLimit+=UI_PAGE;window.renderHouses()};
    }
  };

  function resetAndRender(){uiLimit=UI_PAGE;window.renderHouses()}
  setTimeout(()=>{
    ['teamView','sectorSelect','filterStatus'].forEach(id=>document.getElementById(id)?.addEventListener('change',resetAndRender));
    document.getElementById('searchHouse')?.addEventListener('input',()=>{uiLimit=UI_PAGE});
  },500);

  window.renderMap=function(){
    if(!map){
      map=L.map('map').setView([45.872,3.038],13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
      map.on('click',e=>map._lastClick=e.latlng);
      map.on('moveend zoomend',()=>window.renderMap());
    }
    markers.forEach(m=>m.remove()); markers=[];
    const bounds=map.getBounds()?.pad(.15);
    const list=visibleHouses().filter(h=>h.latitude&&h.longitude&&(!bounds||bounds.contains([+h.latitude,+h.longitude])));
    list.forEach(h=>{
      const st=visitFor(h.id)?.status||'a_faire';
      const color=st==='fait'?'green':(['absent','a_repasser'].includes(st)?'orange':st==='refus'?'black':'gray');
      const m=L.circleMarker([+h.latitude,+h.longitude],{radius:7,color,fillOpacity:.8})
        .addTo(map).bindPopup(`<b>${esc(h.house_number||'')} ${esc(h.street||'')}</b><br>${esc(st)}`);
      markers.push(m);
    });
    setTimeout(()=>map.invalidateSize(),100);
  };

  async function loadComplete(){
    if(loading || typeof sb==='undefined' || typeof campaign==='undefined' || !campaign)return;
    loading=true;
    try{
      setSync('Chargement complet des adresses…');
      const hh=await fetchAll('households',q=>q.eq('active',true).order('id',{ascending:true}));
      households=hh;
      // Les visites peuvent elles aussi dépasser 1000 à mesure que la campagne avance.
      const vv=await fetchAll('visits',q=>q.eq('campaign_id',campaign.id).order('id',{ascending:true}));
      visits=vv;
      households.sort(naturalCmp);
      uiLimit=UI_PAGE;
      renderFilters();
      window.renderHouses();
      renderStats();
      window.renderMap();
      setSync(`${households.filter(h=>h.is_test!==true).length} adresses chargées`);
    }catch(e){
      console.error('Chargement complet léger:',e);
      setSync('Erreur chargement complet',true);
      toast('Erreur chargement complet : '+(e.message||e));
    }finally{loading=false}
  }

  const timer=setInterval(()=>{
    if(typeof sb!=='undefined' && typeof campaign!=='undefined' && campaign){
      clearInterval(timer); loadComplete();
    }
  },250);
  setTimeout(()=>clearInterval(timer),15000);
})();