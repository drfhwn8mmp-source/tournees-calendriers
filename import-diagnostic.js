/* Diagnostic import BAN -> base existante. Aucun ajout/suppression automatique. */
(function(){
  const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const numberOf=a=>{
    if(typeof window.importHouseNumber==='function') return String(window.importHouseNumber(a)||'').trim();
    const label=String(a?.label||a?.name||'').trim();
    const street=String(a?.street||'').trim();
    if(street && label.toLowerCase().endsWith(street.toLowerCase())) return label.slice(0,label.length-street.length).trim();
    return String(a?.house_number||a?.number||'').trim();
  };
  const key=(locality,street,num)=>[norm(locality),norm(street),norm(num)].join('|');
  const nice=(locality,street,num)=>`${num||'—'} ${street||'—'} — ${locality||'—'}`;
  function panel(){
    let el=document.getElementById('importDiagnostic');
    if(el) return el;
    el=document.createElement('div'); el.id='importDiagnostic'; el.className='card'; el.style.marginTop='12px';
    const target=document.getElementById('streetImport'); target?.parentNode?.insertBefore(el,target); return el;
  }
  function diagnose(){
    const city=cities.find(c=>c.id===document.getElementById('importCity')?.value);
    if(!city?.shared_round) return;
    const src=Array.isArray(imported)?imported:[];
    const secIds=sectors.filter(s=>s.city_id===city.id).map(s=>s.id);
    const db=households.filter(h=>secIds.includes(h.sector_id) && h.active!==false && h.is_test!==true);
    const dbKeys=new Set(db.map(h=>key(h.locality,h.street,h.house_number)));
    const srcMap=new Map();
    for(const a of src){ const locality=String(a.locality||a.context||'').trim(), street=String(a.street||'').trim(), num=numberOf(a); if(street) srcMap.set(key(locality,street,num),{locality,street,num}); }
    const missing=[...srcMap.entries()].filter(([k])=>!dbKeys.has(k)).map(([,v])=>v);
    const extra=db.filter(h=>!srcMap.has(key(h.locality,h.street,h.house_number)));
    const el=panel();
    el.innerHTML=`<div class="sectionTitle">🔎 Contrôle des adresses chargées</div><div><b>${srcMap.size}</b> adresse(s) dans la source · <b>${db.length}</b> actuellement enregistrée(s)</div><div style="margin-top:8px"><b>${missing.length}</b> adresse(s) source absente(s) de l'application</div>${missing.length?`<div style="margin-top:8px">${missing.map(x=>`<div class="street">⚠️ <b>${esc(nice(x.locality,x.street,x.num))}</b></div>`).join('')}</div>`:'<div style="margin-top:8px;color:#15803d;font-weight:700">✅ Aucune adresse source manquante détectée.</div>'}${extra.length?`<details style="margin-top:8px"><summary>${extra.length} adresse(s) enregistrée(s) non retrouvée(s) exactement dans la source</summary>${extra.slice(0,30).map(h=>`<div class="muted">${esc(nice(h.locality,h.street,h.house_number))}</div>`).join('')}</details>`:''}<div class="muted" style="margin-top:8px">Ce contrôle ne modifie aucune maison.</div>`;
    if(missing.length===1) toast(`Adresse manquante identifiée : ${nice(missing[0].locality,missing[0].street,missing[0].num)}`);
  }
  const btn=document.getElementById('loadAddresses'); if(!btn)return;
  const previous=btn.onclick;
  btn.onclick=async function(e){ const result=previous?await previous.call(this,e):undefined; try{diagnose()}catch(err){console.warn('Diagnostic import',err)} return result; };
})();
