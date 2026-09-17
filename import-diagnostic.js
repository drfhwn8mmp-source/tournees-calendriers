/* Diagnostic Moulet-Marcenat v2 — lecture seule */
(function(){
  const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const numberOf=a=>{
    try { if(typeof importHouseNumber==='function') return String(importHouseNumber(a)||'').trim(); } catch(_){}
    const label=String(a?.label||a?.name||'').trim(), street=String(a?.street||'').trim();
    if(street && label.toLowerCase().endsWith(street.toLowerCase())) return label.slice(0,label.length-street.length).trim();
    return String(a?.house_number||a?.number||'').trim();
  };
  const key=(locality,street,num)=>[norm(locality),norm(street),norm(num)].join('|');
  const nice=x=>`${x.num||'—'} ${x.street||'—'} — ${x.locality||'—'}`;

  function selectedCity(){
    try {
      const id=document.getElementById('importCity')?.value;
      return (typeof cities!=='undefined' && Array.isArray(cities)) ? cities.find(c=>c.id===id) : null;
    } catch(_){ return null; }
  }
  function isMM(city){
    const name=norm(city?.name||document.getElementById('importCity')?.selectedOptions?.[0]?.textContent||'');
    return !!city?.shared_round || name.includes('moulet') || name.includes('marcenat');
  }
  function getPanel(){
    let el=document.getElementById('importDiagnostic');
    if(el)return el;
    el=document.createElement('div'); el.id='importDiagnostic'; el.className='card';
    el.style.cssText='margin-top:12px;border:2px solid #2563eb';
    const target=document.getElementById('streetImport');
    target?.parentNode?.insertBefore(el,target);
    return el;
  }
  function diagnose(){
    const city=selectedCity();
    if(!isMM(city)) return false;
    let src=[], db=[], secs=[];
    try { src=Array.isArray(imported)?imported:[]; } catch(_){}
    try { secs=Array.isArray(sectors)?sectors:[]; } catch(_){}
    try { db=Array.isArray(households)?households:[]; } catch(_){}
    if(!src.length) return false;

    const secIds=new Set(secs.filter(s=>s.city_id===city?.id).map(s=>s.id));
    db=db.filter(h=>secIds.has(h.sector_id) && h.active!==false && h.is_test!==true && !h.parent_building_id);

    const dbKeys=new Set(db.map(h=>key(h.locality,h.street,h.house_number)));
    const srcRows=[], sourceCounts=new Map();
    for(const a of src){
      const row={locality:String(a?.locality||a?.context||'').trim(),street:String(a?.street||'').trim(),num:numberOf(a)};
      if(!row.street)continue;
      const k=key(row.locality,row.street,row.num);
      sourceCounts.set(k,(sourceCounts.get(k)||0)+1);
      srcRows.push([k,row]);
    }
    const unique=new Map(srcRows);
    const transformedDuplicates=[...sourceCounts.entries()].filter(([,n])=>n>1);
    const missing=[...unique.entries()].filter(([k])=>!dbKeys.has(k)).map(([,v])=>v);
    const extra=db.filter(h=>!unique.has(key(h.locality,h.street,h.house_number)));

    const el=getPanel();
    el.innerHTML=`<div class="sectionTitle">🔎 Contrôle des adresses chargées</div>
      <div><b>${src.length}</b> ligne(s) source · <b>${unique.size}</b> adresse(s) après transformation · <b>${db.length}</b> enregistrée(s)</div>
      <div style="margin-top:10px"><b>${missing.length}</b> adresse(s) source absente(s) de l'application</div>
      ${missing.length?missing.map(x=>`<div class="street" style="border-left:5px solid #dc2626">⚠️ <b>${esc2(nice(x))}</b></div>`).join(''):'<div style="margin-top:8px;color:#15803d;font-weight:700">✅ Aucune adresse source manquante.</div>'}
      ${transformedDuplicates.length?`<div style="margin-top:10px"><b>⚠️ ${transformedDuplicates.length} doublon(s) après transformation</b></div>`:''}
      ${extra.length?`<details style="margin-top:10px"><summary>${extra.length} adresse(s) enregistrée(s) non retrouvée(s) exactement dans la source</summary>${extra.slice(0,40).map(h=>`<div class="muted">${esc2(`${h.house_number||'—'} ${h.street||'—'} — ${h.locality||'—'}`)}</div>`).join('')}</details>`:''}
      <div class="muted" style="margin-top:8px">Diagnostic uniquement : aucune donnée n'est modifiée.</div>`;
    return true;
  }

  const btn=document.getElementById('loadAddresses');
  if(btn){
    btn.addEventListener('click',()=>{
      let tries=0;
      const timer=setInterval(()=>{
        tries++;
        if(diagnose() || tries>=40) clearInterval(timer);
      },250);
    },true);
  }
  const target=document.getElementById('streetImport');
  if(target){
    new MutationObserver(()=>{ setTimeout(()=>{try{diagnose()}catch(e){console.warn(e)}},50); })
      .observe(target,{childList:true,subtree:true,characterData:true});
  }
  setTimeout(()=>{try{diagnose()}catch(_){}},1000);
})();