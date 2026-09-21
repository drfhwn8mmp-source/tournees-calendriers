/* Contrôle approfondi v3 — appel direct fiable */
(function(){
const E=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
let hidden=[];
function bbox(list){const p=list.filter(h=>Number.isFinite(+h.latitude)&&Number.isFinite(+h.longitude));if(!p.length)return null;let w=Infinity,e=-Infinity,s=Infinity,n=-Infinity;p.forEach(h=>{w=Math.min(w,+h.longitude);e=Math.max(e,+h.longitude);s=Math.min(s,+h.latitude);n=Math.max(n,+h.latitude)});return [w-.0045,s-.0045,e+.0045,n+.0045]}
async function load(){
 try{
  const city=(window.cities||[]).find(c=>c.id===E('auditCity')?.value)||(window.cities||[]).find(c=>c.shared_round===true);if(!city)return;
  const ids=new Set((window.sectors||[]).filter(s=>s.city_id===city.id).map(s=>s.id));
  const hs=(window.households||[]).filter(h=>ids.has(h.sector_id)&&h.active!==false&&h.is_test!==true&&h.is_visitable!==false&&h.dwelling_type!=='immeuble');
  const b=bbox(hs);if(!b)return;
  const existing=hs.map(h=>({street:h.street,house_number:h.house_number,locality:h.locality,lat:h.latitude,lon:h.longitude}));
  const {data,error}=await window.sb.functions.invoke('audit-address-complements',{body:{bbox:b,existing}});
  if(error)throw error;hidden=Array.isArray(data?.hidden_review)?data.hidden_review:[];button();
 }catch(e){console.error('deep review',e)}
}
function button(){const t=E('auditTools');if(!t||E('auditDeepToggle')||!hidden.length)return;const d=document.createElement('div');d.style.marginTop='10px';d.innerHTML='<button class="btn alt" id="auditDeepToggle">🔎 Contrôle approfondi ('+hidden.length+')</button>';t.appendChild(d);E('auditDeepToggle').onclick=toggle}
function toggle(){let b=E('auditDeepResults');if(b){b.remove();return}b=document.createElement('div');b.id='auditDeepResults';b.style.marginTop='12px';const g={};hidden.forEach(x=>(g[x.street||'(sans voie)']??=[]).push(x));b.innerHTML='<div class="sectionTitle">🔎 Contrôle approfondi — candidats insuffisants</div><div class="muted">Lecture seule : aucune adresse ne peut être ajoutée depuis cette zone.</div>'+Object.entries(g).sort((a,b)=>a[0].localeCompare(b[0],'fr')).map(([s,it])=>'<div class="street"><b>'+esc(s)+'</b><div class="muted">'+it.length+' candidat(s)</div>'+it.map(x=>'<div class="house" style="margin:7px 0"><b>'+esc((x.house_number||'—')+' '+(x.street||''))+'</b><div class="muted">'+esc(x.village||'')+' · '+esc(x.source||'')+'</div>'+(x.evidence?'<div class="muted">Source : '+esc(x.evidence)+'</div>':'')+(x.reason?'<div class="muted"><b>Pourquoi masquée :</b> '+esc(x.reason)+'</div>':'')+(Number.isFinite(+x.ign_building_distance_m)?'<div class="muted">Bâtiment IGN résidentiel : '+Math.round(+x.ign_building_distance_m)+' m</div>':'')+(Number.isFinite(+x.nearest_existing_m)?'<div class="muted">Foyer existant le plus proche : '+Math.round(+x.nearest_existing_m)+' m</div>':'')+(x.lat&&x.lon?'<div class="muted">GPS '+Number(x.lat).toFixed(6)+', '+Number(x.lon).toFixed(6)+'</div>':'')+'</div>').join('')+'</div>').join('');E('auditTools').after(b)}
document.addEventListener('click',e=>{if(e.target?.id==='runAddressAudit')setTimeout(load,1500)},true);
})();
