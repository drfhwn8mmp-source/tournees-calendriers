/* Fiabilisation foyers visitables + raccourcis accueil — Amicale SP Volvic */
(function(){
  const E=id=>document.getElementById(id);
  const visitable=h=>h && h.active!==false && h.is_visitable!==false && h.dwelling_type!=='immeuble';

  function scope(){
    const base=(typeof visibleHouses==='function'?visibleHouses():households).filter(visitable);
    return base;
  }

  /* Remplace les statistiques écran par des calculs uniquement sur les vrais arrêts visitables. */
  const oldRenderStats=window.renderStats;
  window.renderStats=function(){
    const list=scope();
    const ids=new Set(list.map(h=>h.id));
    const vv=visits.filter(v=>ids.has(v.household_id));
    let done=0,redo=0,cal=0,amt=0,pay={};
    vv.forEach(v=>{
      if(v.status==='fait')done++;
      if(['absent','a_repasser'].includes(v.status))redo++;
      cal+=+v.calendars_count||0;
      amt+=+v.amount||0;
      if(v.payment_method)pay[v.payment_method]=(pay[v.payment_method]||0)+(+v.amount||0);
    });
    if(E('sTotal'))E('sTotal').textContent=list.length;
    if(E('sDone'))E('sDone').textContent=done;
    if(E('sRedo'))E('sRedo').textContent=redo;
    const remaining=list.filter(h=>{const st=visitFor(h.id)?.status||'a_faire';return st==='a_faire'}).length;
    if(E('sRemain'))E('sRemain').textContent=remaining;
    if(E('sCalendars'))E('sCalendars').textContent=cal;
    if(E('sAmount'))E('sAmount').textContent=amt.toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
    if(E('paymentStats'))E('paymentStats').textContent=Object.entries(pay).map(([k,v])=>`${k}: ${v.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}`).join(' · ')||'Aucun encaissement';
    if(E('teamProgress'))E('teamProgress').innerHTML=teams.map(t=>{
      const hs=households.filter(h=>visitable(h)&&teamForHouse(h)===t.id);
      const d=hs.filter(h=>visitFor(h.id)?.status==='fait').length;
      const p=hs.length?Math.round(d/hs.length*100):0;
      return `<div class="street"><b>${esc(t.name)}</b> — ${d}/${hs.length} (${p} %)<div class="progress"><span style="width:${p}%"></span></div></div>`;
    }).join('')||'<span class="muted">Crée les équipes pour afficher leur progression.</span>';
    makeHomeStatsClickable();
  };

  /* Les immeubles parents restent visibles comme regroupement, mais ne sont jamais comptés. */
  function makeHomeStatsClickable(){
    const redo=E('sRedo')?.closest('.stat');
    const remain=E('sRemain')?.closest('.stat');
    if(redo){
      redo.style.cursor='pointer'; redo.setAttribute('role','button');
      redo.title='Voir les maisons à repasser';
      redo.onclick=()=>openHomeList('a_repasser');
    }
    if(remain){
      remain.style.cursor='pointer'; remain.setAttribute('role','button');
      remain.title='Voir ce qu’il reste à faire';
      remain.onclick=()=>openHomeList('remaining');
    }
  }

  window.openHomeList=function(kind){
    page('tour');
    const fs=E('filterStatus');
    if(kind==='a_repasser'){
      if(fs)fs.value='a_repasser';
      renderHouses();
      return;
    }
    /* "Restants" = uniquement les foyers encore "à faire". */
    if(fs)fs.value='';
    const sid=E('sectorSelect')?.value||'', tid=E('teamView')?.value||'', q=(E('searchHouse')?.value||'').toLowerCase();
    let list=scope().filter(h=>(!sid||h.sector_id===sid)&&(!tid||teamForHouse(h)===tid));
    list=list.filter(h=>(visitFor(h.id)?.status||'a_faire')==='a_faire' &&
      (`${h.house_number||''} ${h.street||''} ${h.locality||''} ${h.permanent_note||''}`.toLowerCase().includes(q)));
    if(E('houses'))E('houses').innerHTML=list.map(h=>houseHTML(h)).join('')||'<div class="card muted">Tout est terminé 🎉</div>';
  };

  /* Protège la fin de tournée : un immeuble parent ne peut plus créer un faux "restant". */
  const oldComplete=window.completeTour;
  if(typeof oldComplete==='function'){
    window.completeTour=async function(){
      const myIds=(typeof myTeamIds==='function'?myTeamIds():[]);
      const relevant=households.filter(h=>visitable(h)&&(me.role==='admin'||me.role==='responsable'||myIds.includes(teamForHouse(h))));
      const remaining=relevant.filter(h=>['a_faire','absent','a_repasser'].includes(visitFor(h.id)?.status||'a_faire'));
      if(remaining.length){
        if(!confirm(`Il reste ${remaining.length} foyer(s) visitable(s) non terminé(s). Confirmer quand même la fin de tournée ?`))return;
      }
      return oldComplete();
    };
  }

  window.addEventListener('load',()=>setTimeout(()=>{ if(typeof renderStats==='function')renderStats(); makeHomeStatsClickable(); },1000));
})();

/* Correctif import Moulet-Marcenat — chargé après help-mode.js */
(function(){
  const E=id=>document.getElementById(id);
  const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  function selectedCity(){
    return cities.find(c=>c.id===E('importCity')?.value);
  }
  function isMM(a){
    const txt=normalize([a.locality,a.context,a.name,a.label,a.street,a.city].filter(Boolean).join(' '));
    return txt.includes('moulet')||txt.includes('marcenat');
  }

  function installFix(){
    const btn=E('loadAddresses');
    if(!btn) return;
    btn.onclick=async()=>{
      const city=selectedCity();
      if(!city) return;
      toast('Recherche des adresses…');

      const searchName=city.shared_round ? 'Moulet-Marcenat' : city.name;
      const {data,error}=await sb.functions.invoke('import-ban-addresses',{
        body:{q:searchName,postcode:city.postal_code}
      });
      if(error) return toast('Import impossible : '+error.message);

      const all=data?.items||[];
      imported=city.shared_round ? all.filter(isMM) : all;
      renderImportedAddresses(city);

      if(city.shared_round && !imported.length){
        toast('Aucune adresse Moulet-Marcenat détectée dans les données reçues');
      }else{
        toast(`${imported.length} adresse(s) trouvée(s)`);
      }
    };
  }

  installFix();
  window.addEventListener('load',()=>setTimeout(installFix,300));
})();
