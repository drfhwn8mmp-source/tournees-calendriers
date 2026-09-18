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
  async function runAudit(){
    if(!currentShared())return toast('Tournée commune introuvable');
    const existing=existingForCity(),bbox=bboxOf(existing);if(!bbox)return toast('Coordonnées existantes insuffisantes');
    E('auditSummary').innerHTML='⏳ Analyse BAN + IGN + OpenStreetMap en cours…';
    E('auditResults').innerHTML='';E('auditTools').innerHTML='';
    const ig=await sb.from('address_audit_ignored').select('candidate_key').eq('city_id',auditCity.id);ignoredKeys=new Set((ig.data||[]).map(x=>x.candidate_key));
    const payload=existing.map(h=>({street:h.street,house_number:h.house_number,locality:h.locality,lat:h.latitude,lon:h.longitude}));
    const {data,error}=await sb.functions.invoke('audit-address-complements',{body:{bbox,existing:payload}});
    if(error){E('auditSummary').textContent='Analyse impossible : '+error.message;return}
    auditCandidates=(data?.candidates||[]).filter(x=>!ignoredKeys.has(x.candidate_key));
    const addresses=auditCandidates.filter(x=>x.kind==='address'), streetsOnly=auditCandidates.filter(x=>x.kind==='street');
    const confirmed=addresses.filter(isConfirmed).length;
    const probable=addresses.filter(x=>!isConfirmed(x)&&x.review_level==='très probable').length;
    const check=addresses.filter(x=>!isConfirmed(x)&&x.review_level==='à contrôler').length;
    const legacy=addresses.filter(x=>!isConfirmed(x)&&!x.review_level).length;
    E('auditSummary').innerHTML='<b>'+existing.length+' foyers déjà enregistrés</b>'+
      '<br>🏠 <b>'+addresses.length+' maison(s) candidate(s)</b> · 🛣️ '+streetsOnly.length+' voie(s)'+
      '<br>✅ <b>'+confirmed+' confirmée(s)</b> · 🟢 <b>'+probable+' très probable(s)</b> · 🟠 <b>'+check+' à contrôler</b>'+
      (legacy?'<br>⚠️ '+legacy+' candidat(s) sans classement':'')+
      ((data?.review_hidden_insufficient_count||0)?'<br>⚪ '+data.review_hidden_insufficient_count+' candidat(s) insuffisant(s) masqué(s)':'')+
      ((data?.warnings||[]).length?'<br>⚠️ '+esc(data.warnings.join(' · ')):'');
    E('auditTools').innerHTML='<div class="row" style="margin-top:10px"><button class="btn alt" id="auditSelectAll">☑ Sélectionner les confirmées</button><button class="btn green" id="auditAddSelected">Ajouter les confirmées</button></div>'+
      '<div class="muted" style="margin-top:6px">Ajout en masse uniquement pour les adresses confirmées. Les autres restent en validation individuelle.</div>';
    E('auditSelectAll').onclick=()=>document.querySelectorAll('.auditCheck').forEach(x=>x.checked=x.dataset.confirmed==='1');
    E('auditAddSelected').onclick=addSelected;
    renderAudit();
  }
  function renderAudit(){
    const box=E('auditResults');if(!box)return;
    if(!auditCandidates.length){box.innerHTML='<div class="street">✅ Aucun complément détecté.</div>';return}
    const indexed=auditCandidates.map((x,i)=>[x,i]);
    const confirmed=indexed.filter(([x])=>isConfirmed(x));
    const veryProbable=indexed.filter(([x])=>x.kind==='address'&&!isConfirmed(x)&&x.review_level==='très probable');
    const needsCheck=indexed.filter(([x])=>x.kind==='address'&&!isConfirmed(x)&&x.review_level==='à contrôler');
    const legacy=indexed.filter(([x])=>x.kind==='address'&&!isConfirmed(x)&&!x.review_level);
    const streetsOnly=indexed.filter(([x])=>x.kind==='street');
    const renderGroups=(rows,mode)=>{
      if(!rows.length)return '';
      const groups={};rows.forEach(([x,i])=>{const g=x.street||'(sans voie)';(groups[g]??=[]).push([x,i])});
      return Object.entries(groups).sort((a,b)=>a[0].localeCompare(b[0],'fr')).map(([street,items])=>
        '<div class="street"><b>'+esc(street)+'</b><div class="muted">'+items.length+' complément(s)</div>'+
        items.map(([x,i])=>'<div class="house" style="margin:7px 0">'+
          (mode==='confirmed'?'<label><input type="checkbox" class="auditCheck" data-confirmed="1" value="'+i+'"> ':'<label>')+
          '<b>'+esc(x.kind==='street'?'Voie détectée':((x.house_number||'—')+' '+(x.street||'')))+'</b></label>'+
          '<div class="muted">'+esc(x.village||'Moulet-Marcenat')+' · '+esc(x.source||'')+' · '+esc(x.confidence||'')+'</div>'+
          (x.evidence?'<div class="muted">Source de contrôle : '+esc(x.evidence)+'</div>':'')+
          (x.review_level?'<div class="muted"><b>Niveau :</b> '+esc(x.review_level)+(x.review_reason?' — '+esc(x.review_reason):'')+'</div>':'')+
          (x.scope_match?'<div class="muted"><b>Rattachement :</b> '+esc(x.scope_match==='lieu-dit'?'lieu-dit reconnu Moulet-Marcenat':'voie déjà présente dans la tournée')+'</div>':'')+
          (Number.isFinite(+x.nearest_existing_m)?'<div class="muted"><b>Foyer existant le plus proche :</b> '+Math.round(+x.nearest_existing_m)+' m</div>':'')+
          (x.lat&&x.lon?'<div class="muted">GPS '+Number(x.lat).toFixed(6)+', '+Number(x.lon).toFixed(6)+'</div>':'')+
          '<div class="row" style="margin-top:6px"><button class="btn green" onclick="window.auditAddOne('+i+')">Ajouter</button><button class="btn alt" onclick="window.auditIgnoreOne('+i+')">Ignorer</button></div></div>').join('')+
        '</div>').join('');
    };
    const section=(title,desc,rows,mode)=>rows.length?'<div class="sectionTitle" style="margin-top:18px">'+title+'</div><div class="muted" style="margin-bottom:8px">'+desc+'</div>'+renderGroups(rows,mode):'';
    box.innerHTML=
      section('✅ Adresses confirmées','Confirmation explicite. Seules ces adresses peuvent être ajoutées en masse.',confirmed,'confirmed')+
      section('🟢 Très probables','Adresse recoupée et cohérente avec la tournée. Vérification individuelle avant ajout.',veryProbable,'probable')+
      section('🟠 À contrôler','Adresse cohérente avec le secteur mais preuve encore insuffisante pour confirmer automatiquement le numéro.',needsCheck,'check')+
      section('⚠️ À vérifier','Candidats conservés sans nouveau niveau de classement.',legacy,'legacy')+
      section('🛣️ Nouvelles voies détectées','Voies pertinentes repérées par le contrôle. Une voie seule ne crée pas une maison.',streetsOnly,'street');
  }
  async function ensureStreet(name,locality){
    if(!name)return null;let st=streets.find(x=>x.city_id===auditCity.id&&norm(x.name)===norm(name));
    if(st)return st;
    const {data,error}=await sb.from('streets').insert({city_id:auditCity.id,name,locality:locality||auditCity.name,active:true}).select().single();
    if(error)throw error;streets.push(data);return data;
  }
  const numNorm=s=>norm(s).replace(/\s+/g,'');
  function duplicate(c){return existingForCity().some(h=>norm(h.street)===norm(c.street)&&numNorm(h.house_number)===numNorm(c.house_number))}
  async function addCandidate(c,interactive=true){
    if(c.kind==='street'){if(!interactive)return {ok:false,reason:'voie à valider individuellement'};await ensureStreet(c.street,c.village);return {ok:true,streetOnly:true}}
    if(!interactive&&!isConfirmed(c))return {ok:false,reason:'non confirmée — ajout individuel obligatoire'};
    let num=String(c.house_number||'').trim(),street=String(c.street||'').trim(),locality=String(c.village||auditCity.name).trim();
    if(!street)return {ok:false,reason:'rue manquante'};if(!num)return {ok:false,reason:'numéro manquant'};
    const candidate={...c,street,house_number:num};if(duplicate(candidate))return {ok:false,reason:'doublon déjà présent'};
    const st=await ensureStreet(street,locality);
    const {error}=await sb.from('households').insert({sector_id:auditSector.id,street_id:st?.id||null,house_number:num,street,locality,postal_code:auditCity.postal_code||'63530',city_name:'Volvic',latitude:c.lat||null,longitude:c.lon||null,active:true,is_test:false,is_visitable:true,dwelling_type:'maison',source_origin:'control:'+String(c.source||'complement')});
    if(error){if(error.code==='23505')return {ok:false,reason:'doublon refusé par la base'};throw error}return {ok:true};
  }
  window.auditAddOne=async i=>{try{const c=auditCandidates[i];if(!isConfirmed(c)&&c.kind==='address'&&!confirm('Cette adresse n’est pas confirmée. L’ajouter quand même après votre vérification ?'))return;const r=await addCandidate(c,true);if(!r.ok)return toast(r.reason);toast(r.streetOnly?'Voie ajoutée':'Maison ajoutée à Moulet-Marcenat');await loadAll();await runAudit()}catch(e){toast(e.message||String(e))}};
  window.auditIgnoreOne=async i=>{const c=auditCandidates[i];if(!confirm('Ignorer ce complément lors des prochains contrôles ?'))return;const {error}=await sb.from('address_audit_ignored').upsert({city_id:auditCity.id,candidate_key:c.candidate_key,source:c.source,label:[c.house_number,c.street].filter(Boolean).join(' '),ignored_by:me.id},{onConflict:'city_id,candidate_key'});if(error)return toast(error.message);auditCandidates.splice(i,1);toast('Complément ignoré');renderAudit()};
  async function addSelected(){
    const ids=[...document.querySelectorAll('.auditCheck:checked')].map(x=>+x.value).filter(i=>isConfirmed(auditCandidates[i]));if(!ids.length)return toast('Aucune adresse confirmée sélectionnée');
    if(!confirm('Ajouter les adresses confirmées sélectionnées ?'))return;let ok=0,skip=0;
    for(const i of ids){try{const r=await addCandidate(auditCandidates[i],false);r.ok?ok++:skip++}catch{skip++}}
    toast(ok+' ajouté(s) · '+skip+' ignoré(s) / doublon(s)');await loadAll();await runAudit();
  }
  function patchManual(){}
  const oldRenderAdmin=window.renderAdmin;
  if(typeof oldRenderAdmin==='function')window.renderAdmin=async function(){const r=await oldRenderAdmin.apply(this,arguments);install();refreshAuditCities();return r};
  setTimeout(()=>{install();refreshAuditCities()},0);
})();