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


/* Sélection import : hameau complet + rues + adresses individuelles */
(function(){
  const E=id=>document.getElementById(id);
  const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const streetOf=a=>(typeof importStreetName==='function'?importStreetName(a):(a.street||a.name||a.label||'Adresse sans voie'));
  const localityOf=(a,city)=>(typeof importLocality==='function'?importLocality(a,city):(a.locality||city?.name||'Sans hameau'));
  const numberOf=a=>(typeof importHouseNumber==='function'?importHouseNumber(a):(a.housenumber||a.house_number||a.number||''));
  const safe=s=>(typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])));

  function city(){
    return cities.find(c=>c.id===E('importCity')?.value);
  }

  window.renderImportedAddresses=function(c){
    const box=E('streetImport');
    if(!box)return;
    if(!imported?.length){
      box.innerHTML='<p class="muted">Aucune voie trouvée.</p>';
      return;
    }

    const groups=new Map();
    imported.forEach((a,i)=>{
      const loc=localityOf(a,c)||c?.name||'Sans hameau';
      const st=streetOf(a)||'Adresse sans voie';
      if(!groups.has(loc))groups.set(loc,new Map());
      const streetsMap=groups.get(loc);
      if(!streetsMap.has(st))streetsMap.set(st,[]);
      streetsMap.get(st).push({a,i});
    });

    const importSummary=document.createElement('div');
    importSummary.id='importSelectionSummary';
    importSummary.className='muted';
    importSummary.style.cssText='font-size:17px;margin:12px 0 14px;font-weight:600';
    box.innerHTML='';
    box.appendChild(importSummary);
    const listWrap=document.createElement('div');
    box.appendChild(listWrap);

    listWrap.innerHTML=[...groups.entries()].map(([loc,sm],gi)=>{
      const total=[...sm.values()].reduce((n,x)=>n+x.length,0);
      const gid='ham-'+gi;
      const streetsHtml=[...sm.entries()].map(([st,rows],si)=>{
        const sid=gid+'-st-'+si;
        const addresses=rows.map(({a,i})=>{
          const num=numberOf(a);
          const label=[num,st].filter(Boolean).join(' ');
          return `<label style="display:flex;align-items:center;gap:10px;padding:9px 6px 9px 34px;border-top:1px solid #f0f1f3">
            <input type="checkbox" class="addressImportCheck" data-import-index="${i}" data-group="${gid}" data-street-group="${sid}" checked style="width:24px;height:24px;flex:0 0 24px">
            <span><b>${safe(label||'Adresse')}</b>${a.label&&norm(a.label)!==norm(label)?`<div class="muted">${safe(a.label)}</div>`:''}</span>
          </label>`;
        }).join('');
        return `<div class="street" style="margin-left:14px">
          <label style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" class="streetCheck streetMasterCheck" value="${safe(st)}" data-locality="${safe(loc)}" data-group="${gid}" data-street-group="${sid}" checked style="width:26px;height:26px;flex:0 0 26px">
            <span style="font-size:17px"><b>${safe(st)}</b><div class="muted">${rows.length} adresse(s)</div></span>
          </label>
          <div>${addresses}</div>
        </div>`;
      }).join('');

      return `<div class="card importHamlet" data-group="${gid}" style="padding:10px;margin-top:10px">
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <input type="checkbox" class="hamletMasterCheck" data-group="${gid}" checked style="width:28px;height:28px;flex:0 0 28px">
          <span style="font-size:18px"><b>🏘️ ${safe(loc)}</b><div class="muted">Tout le hameau · ${total} adresse(s)</div></span>
        </label>
        ${streetsHtml}
      </div>`;
    }).join('');

    updateImportSummary();
  };

  function updateImportSummary(){
    const summary=E('importSelectionSummary');
    if(!summary)return;
    const total=imported?.length||0;
    const checks=[...document.querySelectorAll('.addressImportCheck')];
    const selected=checks.filter(x=>x.checked).length;
    summary.textContent=`${total} adresse(s) trouvée(s) • ${selected} sélectionnée(s)`;
  }

  function syncParents(target){
    const gid=target.dataset.group, sid=target.dataset.streetGroup;
    if(sid){
      const ads=[...document.querySelectorAll(`.addressImportCheck[data-street-group="${sid}"]`)];
      const st=document.querySelector(`.streetMasterCheck[data-street-group="${sid}"]`);
      if(st){
        st.checked=ads.some(x=>x.checked);
        st.indeterminate=ads.some(x=>x.checked)&&!ads.every(x=>x.checked);
      }
    }
    if(gid){
      const ads=[...document.querySelectorAll(`.addressImportCheck[data-group="${gid}"]`)];
      const ham=document.querySelector(`.hamletMasterCheck[data-group="${gid}"]`);
      if(ham){
        ham.checked=ads.some(x=>x.checked);
        ham.indeterminate=ads.some(x=>x.checked)&&!ads.every(x=>x.checked);
      }
    }
  }

  document.addEventListener('change',e=>{
    const t=e.target;
    if(t.classList.contains('hamletMasterCheck')){
      const gid=t.dataset.group;
      document.querySelectorAll(`.streetMasterCheck[data-group="${gid}"],.addressImportCheck[data-group="${gid}"]`).forEach(x=>{
        x.checked=t.checked; x.indeterminate=false;
      });
    }else if(t.classList.contains('streetMasterCheck')){
      const sid=t.dataset.streetGroup;
      document.querySelectorAll(`.addressImportCheck[data-street-group="${sid}"]`).forEach(x=>x.checked=t.checked);
      syncParents(t);
    }else if(t.classList.contains('addressImportCheck')){
      syncParents(t);
    }
    if(t.classList.contains('hamletMasterCheck')||t.classList.contains('streetMasterCheck')||t.classList.contains('addressImportCheck')){
      updateImportSummary();
    }
  });

  function wrapAssign(){
    const btn=E('assignChecked');
    if(!btn || btn.dataset.addressSelectionWrapped==='1')return;
    const original=btn.onclick;
    if(typeof original!=='function')return;
    btn.dataset.addressSelectionWrapped='1';
    btn.onclick=async function(ev){
      const checks=[...document.querySelectorAll('.addressImportCheck')];
      if(!checks.length)return original.call(this,ev);
      const selected=new Set(checks.filter(x=>x.checked).map(x=>Number(x.dataset.importIndex)));
      if(!selected.size)return toast('Coche au moins une adresse');
      const full=imported;
      imported=full.filter((_,i)=>selected.has(i));
      try{
        return await original.call(this,ev);
      }finally{
        imported=full;
      }
    };
  }

  wrapAssign();
  window.addEventListener('load',()=>setTimeout(wrapAssign,500));
})();
