/* Export du rapport final du contrôle d'adresses — complément à address-audit.js */
(function(){
  let lastFinalReview={confirmed:[],probable:[]};

  function installExportButton(){
    const tools=document.getElementById('auditTools');
    if(!tools || document.getElementById('auditExportFinal')) return;
    const b=document.createElement('button');
    b.className='btn alt';
    b.id='auditExportFinal';
    b.style.marginTop='8px';
    b.textContent='📋 Exporter le rapport final';
    b.onclick=exportFinalReport;
    tools.appendChild(b);
  }

  function exportFinalReport(){
    const rows=[
      ...(lastFinalReview.confirmed||[]).map(x=>({...x,statut:'CONFIRMÉE'})),
      ...(lastFinalReview.probable||[]).map(x=>({...x,statut:'TRÈS PROBABLE'}))
    ];
    if(!rows.length){
      if(typeof toast==='function') toast('Relancez d’abord « Analyser les compléments »');
      return;
    }
    const cols=['statut','house_number','street','village','source','evidence',
      'ign_building_distance_m','nearest_existing_m','lat','lon','reason'];
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const csv='\ufeff'+cols.join(';')+'\n'+rows.map(x=>cols.map(k=>q(x[k])).join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='controle-adresses-moulet-marcenat.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    if(typeof toast==='function') toast(rows.length+' adresses exportées');
  }

  function hook(){
    if(!window.sb?.functions?.invoke || window.__auditExportHooked) return;
    window.__auditExportHooked=true;
    const original=window.sb.functions.invoke.bind(window.sb.functions);
    window.sb.functions.invoke=async function(name,opts){
      const res=await original(name,opts);
      if(name==='audit-address-complements' && res?.data?.final_review){
        lastFinalReview=res.data.final_review;
        setTimeout(installExportButton,0);
      }
      return res;
    };
  }

  const observer=new MutationObserver(()=>{hook();installExportButton();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  hook();
  setTimeout(()=>{hook();installExportButton()},0);
})();