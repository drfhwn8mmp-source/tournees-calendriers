/* Contrôle automatique des adresses manquantes — Moulet-Marcenat */
(function(){
  const E=id=>document.getElementById(id);
  const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
  let auditCandidates=[],ignoredKeys=new Set(),auditCity=null,auditSector=null;

  function install(){
    const admin=E('page-admin'); if(!admin||E('addressAuditCard'))return;
    const cards=[...admin.querySelectorAll('.card')], anchor=cards.find(x=>x.textContent.includes('Découpage des tournées'));
    const card=document.createElement('div'); card.className='card'; card.id='addressAuditCard';
    card.innerHTML='<div class="sectionTitle">🔍 Contrôle des adresses</div>'+
      '<p class="muted">Compare les foyers déjà enregistrés avec les voies et bâtiments IGN BD TOPO et les adresses OpenStreetMap. Les foyers existants ne sont pas modifiés.</p>'+
      '<div class="row"><select id="auditCity"></select><button class="btn" id="runAddressAudit">Analyser les compléments</button></div>'+
      '<div id="auditSummary" class="muted" style="margin-top:10px"></div><div id="auditTools"></div><div id="auditResults"></div>';
    if(anchor)anchor.after(card);else admin.appendChild(card);
    E('runAddressAudit').onclick=runAudit;
    refreshAuditCities();
  }
  function refreshAuditCities(){
    const s=E('auditCity');if(!s||typeof cities==='undefined')return;
    const cs=cities.filter(c=>c.shared_round===true);
    s.innerHTML=cs.map(c=>'<option value="'+c.id+'">👥 '+esc(c.name)+' — tournée commune</option>').join('');
  }
  function currentShared(){
    auditCity=cities.find(c=>c.id===E('auditCity')?.value)||cities.find(c=>c.shared_round===true);
    auditSector=sectors.find(s=>s.city_id===auditCity?.id&&s.active!==false);
    return !!(auditCity&&auditSector);
  }
  function existingForCity(){
    const secIds=new Set(sectors.filter(s=>s.city_id===auditCity.id).map(s=>s.id));
    return households.filter(h=>secIds.has(h.sector_id)&&h.active!==false&&h.is_test!==true&&h.is_visitable!==false&&h.dwelling_type!=='immeuble');
  }
  function bboxOf(list){
    const pts=list.filter(h=>Number.isFinite(+h.latitude)&&Number.isFinite(+h.longitude));
    if(!pts.length)return null;let w=Infinity,e=-Infinity,s=Infinity,n=-Infinity;
    pts.forEach(h=>{w=Math.min(w,+h.longitude);e=Math.max(e,+h.longitude);s=Math.min(s,+h.latitude);n=Math.max(n,+h.latitude)});
    const pad=.0045;return [w-pad,s-pad,e+pad,n+pad];
  }
  function isConfirmed(c){return c.kind==='address'&&c.validation_status==='confirmée'}
  function isCrossChecked(c){return c.kind==='address'&&c.validation_status==='recoupée'}
  function isUnverified(c){return c.kind==='address'&&!isConfirmed(c)&&!isCrossChecked(c)}
  async function runAudit(){
    if(!currentShared())return toast('Tournée commune introuvable');
    const existing=existingForCity(),bbox=bboxOf(existing);if(!bbox)return toast('Coordonnées existantes insuffisantes');
    E('auditSummary').innerHTML='⏳ Analyse IGN + OpenStreetMap en cours…';
    E('auditResults').innerHTML='';E('auditTools').innerHTML='';
    const ig=await sb.from('address_audit_ignored').select('candidate_key').eq('city_id',auditCity.id);ignoredKeys=new Set((ig.data||[]).map(x=>x.candidate_key));
    const payload=existing.map(h=>({street:h.street,house_number:h.house_number,lat:h.latitude,lon:h.longitude}));
    const {data,error}=await sb.functions.invoke('audit-address-complements',{body:{bbox,existing:payload}});
    if(error){E('auditSummary').textContent='Analyse impossible : '+error.message;return}
    auditCandidates=(data?.candidates||[]).filter(x=>!ignoredKeys.has(x.candidate_key));
    const streets=auditCandidates.filter(x=>x.kind==='street').length,addresses=auditCandidates.filter(x=>x.kind==='address').length,buildings=auditCandidates.filter(x=>x.kind==='building').length;
    const confirmed=auditCandidates.filter(isConfirmed).length,cross=auditCandidates.filter(isCrossChecked).length,unverified=auditCandidates.filter(isUnverified).length;
    E('auditSummary').innerHTML='<b>'+existing.length+' foyers déjà enregistrés</b><br>⚠️ <b>'+auditCandidates.length+' complément(s) potentiel(s)</b> — '+addresses+' adresse(s), '+streets+' voie(s), 🏠 <b>'+buildings+' bâtiment(s) à identifier</b>.'+
      '<br>✅ <b>'+confirmed+' confirmée(s)</b> · 🔎 <b>'+cross+' recoupée(s) à valider</b> · ⚠️ <b>'+unverified+' adresse(s) OSM à vérifier</b>'+
      ((data?.warnings||[]).length?'<br>⚠️ '+esc(data.warnings.join(' · ')):'');
    E('auditTools').innerHTML='<div class="row" style="margin-top:10px"><button class="btn alt" id="auditSelectAll">☑ Sélectionner les confirmées</button><button class="btn green" id="auditAddSelected">Ajouter les confirmées</button></div>'+
      '<div class="muted" style="margin-top:6px">Sécurité : l’ajout en masse est réservé aux adresses confirmées. Les autres doivent être vérifiées individuellement.</div>';
    E('auditSelectAll').onclick=()=>document.querySelectorAll('.auditCheck').forEach(x=>x.checked=x.dataset.confirmed==='1');
    E('auditAddSelected').onclick=addSelected;
    renderAudit();
  }
  function renderAudit(){
    const box=E('auditResults');if(!box)return;
    if(!auditCandidates.length){box.innerHTML='<div class="street">✅ Aucun complément non ignoré détecté.</div>';return}
    const indexed=auditCandidates.map((x,i)=>[x,i]);
    const confirmed=indexed.filter(([x])=>isConfirmed(x));
    const cross=indexed.filter(([x])=>isCrossChecked(x));
    const unverified=indexed.filter(([x])=>isUnverified(x));
    const streetsOnly=indexed.filter(([x])=>x.kind==='street');
    const buildingOnly=indexed.filter(([x])=>x.kind==='building');
    const renderGroups=(rows,mode)=>{
      if(!rows.length)return '';
      const groups={};rows.forEach(([x,i])=>{const g=x.street||'(bâtiments sans rue identifiée)';(groups[g]??=[]).push([x,i])});
      return Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0],'fr')).map(([street,items])=>
        '<div class="street"><b>'+esc(street)+'</b><div class="muted">'+items.length+' complément(s)</div>'+
        items.map(([x,i])=>'<div class="house" style="margin:7px 0">'+
          (mode==='confirmed'?'<label><input type="checkbox" class="auditCheck" data-confirmed="1" value="'+i+'"> ':'<label>')+
          '<b>'+esc(mode==='building'?'Bâtiment à identifier':(x.kind==='street'?'Voie détectée':((x.house_number||'—')+' '+(x.street||'Bâtiment sans rue'))))+'</b></label>'+
          '<div class="muted">'+esc(x.village||'Moulet-Marcenat')+' · '+esc(x.source||'')+' · '+esc(x.confidence||'')+
          (x.distance_existing_m?' · '+x.distance_existing_m+' m du foyer enregistré le plus proche':'')+'</div>'+
          (x.evidence?'<div class="muted">Source de contrôle : '+esc(x.evidence)+'</div>':'')+
          (x.scope_match?'<div class="muted"><b>Rattachement :</b> '+esc(x.scope_match==='lieu-dit'?'lieu-dit reconnu Moulet-Marcenat':'voie déjà présente dans la tournée')+'</div>':'')+
          (Number.isFinite(+x.nearest_existing_m)?'<div class="muted"><b>Foyer existant le plus proche :</b> '+Math.round(+x.nearest_existing_m)+' m</div>':'')+
          (x.lat&&x.lon?'<div class="muted">GPS '+Number(x.lat).toFixed(6)+', '+Number(x.lon).toFixed(6)+'</div>':'')+
          '<div class="row" style="margin-top:6px"><button class="btn green" onclick="window.auditAddOne('+i+')">Ajouter</button><button class="btn alt" onclick="window.auditIgnoreOne('+i+')">Ignorer</button></div></div>').join('')+
        '</div>').join('');
    };
    const section=(title,desc,rows,mode)=>rows.length?'<div class="sectionTitle" style="margin-top:18px">'+title+'</div><div class="muted" style="margin-bottom:8px">'+desc+'</div>'+renderGroups(rows,mode):'';
    box.innerHTML=
      section('✅ Adresses confirmées','Adresses disposant d’une confirmation explicite. Elles seules peuvent être ajoutées en masse.',confirmed,'confirmed')+
      section('🔎 Adresses recoupées — validation nécessaire','Adresse OSM située près d’un bâtiment IGN. Le bâtiment est recoupé, mais le numéro doit encore être validé.',cross,'cross')+
      section('⚠️ Adresses OSM à vérifier','Une seule source exploitable pour le moment. Ajout uniquement après vérification individuelle.',unverified,'unverified')+
      section('🛣️ Voies détectées','Voies repérées par le contrôle. Elles ne constituent pas à elles seules une adresse de maison.',streetsOnly,'street')+
      section('🏠 Bâtiments sans numéro à identifier','Bâtiments IGN proches des voies détectées mais sans numéro fiable. À vérifier individuellement avant ajout.',buildingOnly,'building');
  }
  async function ensureStreet(name,locality){
    if(!name)return null;let st=streets.find(x=>x.city_id===auditCity.id&&norm(x.name)===norm(name));
    if(st)return st;
    const {data,error}=await sb.from('streets').insert({city_id:auditCity.id,name,locality:locality||auditCity.name,active:true}).select().single();
    if(error)throw error;streets.push(data);return data;
  }
  const numNorm=s=>norm(s).replace(/\s+/g,'');
  function duplicate(c){
    return existingForCity().some(h=>norm(h.street)===norm(c.street)&&numNorm(h.house_number)===numNorm(c.house_number));
  }
  async function addCandidate(c,interactive=true){
    if(c.kind==='street'){if(!interactive)return {ok:false,reason:'voie à valider individuellement'};await ensureStreet(c.street,c.village);return {ok:true,streetOnly:true}}
    if(!interactive&&!isConfirmed(c))return {ok:false,reason:'non confirmée — ajout individuel obligatoire'};
    let num=String(c.house_number||'').trim(),street=String(c.street||'').trim(),locality=String(c.village||auditCity.name).trim();
    if(!street&&interactive){street=prompt('Rue / lieu-dit pour ce bâtiment','')||''} if(!street)return {ok:false,reason:'rue manquante'};
    if(!num&&interactive){num=prompt('Numéro de maison pour '+street,'')||''} if(!num)return {ok:false,reason:'numéro à valider individuellement'};
    const candidate={...c,street,house_number:num};if(duplicate(candidate))return {ok:false,reason:'doublon déjà présent'};
    const st=await ensureStreet(street,locality);
    const {error}=await sb.from('households').insert({sector_id:auditSector.id,street_id:st?.id||null,house_number:num,street,locality,postal_code:auditCity.postal_code||'63530',city_name:'Volvic',latitude:c.lat||null,longitude:c.lon||null,active:true,is_test:false,is_visitable:true,dwelling_type:'maison',source_origin:'control:'+String(c.source||'complement')});
    if(error){if(error.code==='23505')return {ok:false,reason:'doublon refusé par la base'};throw error}
    return {ok:true};
  }
  window.auditAddOne=async i=>{try{const c=auditCandidates[i];if(!isConfirmed(c)&&c.kind==='address'&&!confirm('Cette adresse n’est pas confirmée. L’ajouter quand même après votre vérification ?'))return;const r=await addCandidate(c,true);if(!r.ok)return toast(r.reason);toast(r.streetOnly?'Voie ajoutée':'Maison ajoutée à Moulet-Marcenat');await loadAll();await runAudit()}catch(e){toast(e.message||String(e))}};
  window.auditIgnoreOne=async i=>{const c=auditCandidates[i];if(!confirm('Ignorer ce complément lors des prochains contrôles ?'))return;const {error}=await sb.from('address_audit_ignored').upsert({city_id:auditCity.id,candidate_key:c.candidate_key,source:c.source,label:[c.house_number,c.street].filter(Boolean).join(' '),ignored_by:me.id},{onConflict:'city_id,candidate_key'});if(error)return toast(error.message);auditCandidates.splice(i,1);toast('Complément ignoré');renderAudit()};
  async function addSelected(){
    const ids=[...document.querySelectorAll('.auditCheck:checked')].map(x=>+x.value).filter(i=>isConfirmed(auditCandidates[i]));if(!ids.length)return toast('Aucune adresse confirmée sélectionnée');
    if(!confirm('Ajouter les adresses confirmées sélectionnées ? Un contrôle anti-doublon sera refait avant chaque insertion.'))return;
    let ok=0,skip=0;for(const i of ids){try{const r=await addCandidate(auditCandidates[i],false);r.ok?ok++:skip++}catch{skip++}}
    toast(ok+' ajouté(s) · '+skip+' ignoré(s) / doublon(s)');await loadAll();await runAudit();
  }

  function patchManual(){
    const b=E('addHere');if(!b||b.dataset.auditPatched)return;b.dataset.auditPatched='1';
    b.onclick=async()=>{const ll=map?._lastClick;if(!ll)return toast("Touchez d'abord l'endroit sur la carte");
      const choices=cities.filter(c=>c.active!==false),txt=choices.map((c,i)=>(i+1)+'. '+c.name).join('\n'),pick=Number(prompt('Dans quel village ajouter cette maison ?\n'+txt,'1'));const city=choices[pick-1];if(!city)return toast('Village invalide');
      const sec=sectors.find(s=>s.city_id===city.id&&s.active!==false);if(!sec)return toast('Aucun secteur pour ce village');
      const street=(prompt('Rue / lieu-dit')||'').trim();if(!street)return;const num=(prompt('Numéro')||'').trim();
      const dup=households.some(h=>h.sector_id===sec.id&&norm(h.street)===norm(street)&&numNorm(h.house_number)===numNorm(num));if(dup)return toast('Cette maison existe déjà');
      let st=streets.find(x=>x.city_id===city.id&&norm(x.name)===norm(street));if(!st){const ins=await sb.from('streets').insert({city_id:city.id,name:street,locality:city.name,active:true}).select().single();if(ins.error)return toast(ins.error.message);st=ins.data}
      const {error}=await sb.from('households').insert({sector_id:sec.id,street_id:st.id,house_number:num,street,locality:city.name,postal_code:city.postal_code||'',city_name:'Volvic',latitude:ll.lat,longitude:ll.lng,active:true,is_test:false,is_visitable:true,dwelling_type:'maison',source_origin:'manual'});
      error?toast(error.message):(toast('Maison ajoutée manuellement'),loadAll());
    };
  }
  const oldRenderAdmin=window.renderAdmin;
  if(typeof oldRenderAdmin==='function')window.renderAdmin=async function(){const r=await oldRenderAdmin.apply(this,arguments);install();refreshAuditCities();patchManual();return r};
  setTimeout(()=>{install();refreshAuditCities();patchManual()},0);
})();