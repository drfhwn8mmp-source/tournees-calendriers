/* Amicale SP Volvic — affectation et ajout sécurisé d'adresses, 2026-11-19 */
(function(){
'use strict';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
let sectorLinks=[];
function sectorTeam(id){
 const s=(typeof sectors!=='undefined'?sectors:[]).find(x=>x.id===id);if(!s)return {known:false,team:null};
 const n=norm(s.name);const linked=sectorLinks.filter(x=>x.sector_id===id);if(linked.length===1)return {known:true,team:linked[0].team_id};if((n.includes('moulet')&&n.includes('marcenat'))||n.includes('test'))return {known:true,team:null};
 const m=n.match(/equipe\s*(\d+)/),t=(typeof teams!=='undefined'?teams:[]).find(x=>m?new RegExp('equipe\\s*'+m[1]+'(?:\\D|$)').test(norm(x.name)):norm(x.name)===n);
 return {known:true,team:t?.id||null};
}
window.teamForHouse=function(h){if(!h)return null;const s=sectorTeam(h.sector_id);if(s.known)return s.team;const links=(typeof teamStreets!=='undefined'?teamStreets:[]).filter(ts=>ts.street_id===h.street_id);return links.length===1?links[0].team_id:null};
const el=(tag,props={},txt)=>{const e=document.createElement(tag);Object.assign(e,props);if(txt!==undefined)e.textContent=txt;return e};
function addControl(){
 if(document.getElementById('volvicAddAddressButton'))return;
 const host=document.getElementById('page-tour')||document.getElementById('houses')?.parentElement;
 if(!host)return;
 const wrap=el('div',{id:'volvicAddAddressPanel',style:'margin:12px 0;padding:12px;border:1px solid #aaa;border-radius:10px'});
 const btn=el('button',{id:'volvicAddAddressButton',type:'button',className:'btn alt'},'➕ Ajouter une maison manquante');
 wrap.appendChild(btn);host.insertBefore(wrap,host.firstChild);
 btn.onclick=async()=>{
  if(typeof me==='undefined'||me?.role!=='admin'){alert('L’ajout direct est réservé à un administrateur. Signale l’adresse manquante au responsable.');return}
  if(!navigator.onLine){alert('Connexion nécessaire pour éviter les doublons.');return}
  const sectorsAvailable=(typeof sectors!=='undefined'?sectors:[]).filter(s=>s.active!==false&&!norm(s.name).includes('test'));
  if(!sectorsAvailable.length){alert('Aucun secteur chargé.');return}
  const old=document.getElementById('volvicAddAddressForm');if(old){old.remove();return}
  const form=el('form',{id:'volvicAddAddressForm',style:'display:grid;gap:8px;margin-top:10px'});
  const select=el('select',{required:true});select.appendChild(el('option',{value:''},'Choisir la tournée / le secteur'));
  for(const s of sectorsAvailable)select.appendChild(el('option',{value:s.id},s.name));
  const street=el('input',{placeholder:'Nom exact de la rue ou du lieu-dit',required:true,maxLength:180});
  const number=el('input',{placeholder:'Numéro (ex. 12 bis)',required:true,maxLength:30});
  const locality=el('input',{placeholder:'Lieu-dit (facultatif)',maxLength:150});
  const status=el('div',{role:'status'});
  const submit=el('button',{type:'submit',className:'btn'},'Enregistrer cette maison');
  for(const x of [select,street,number,locality,submit,status])form.appendChild(x);wrap.appendChild(form);
  form.onsubmit=async ev=>{
   ev.preventDefault();const sector_id=select.value,st=street.value.trim(),num=number.value.trim(),loc=locality.value.trim();
   if(!sector_id||!st||!num)return;
   submit.disabled=true;status.textContent='Vérification de l’adresse…';
   try{
    const {data:found,error:fe}=await sb.from('households').select('id,house_number,street,sector_id,active').ilike('street',st).limit(300);
    if(fe)throw fe;
    const duplicate=(found||[]).find(h=>norm(h.street)===norm(st)&&norm(h.house_number).replace(/\s+/g,'')===norm(num).replace(/\s+/g,''));
    if(duplicate){status.textContent='Cette adresse existe déjà dans la base (active ou inactive). Ne pas créer de doublon. Contacte un administrateur pour sa réactivation ou son affectation.';return}
    const s=sectorsAvailable.find(x=>x.id===sector_id);
    if(!confirm(`Créer ${num} ${st} dans le secteur « ${s.name} » ?`))return;
    const city=(typeof cities!=='undefined'?cities:[]).find(c=>c.id===s.city_id)||null;
    const row={sector_id,house_number:num,street:st,locality:loc||null,postal_code:city?.postal_code||'63530',city_name:city?.name||'Volvic',active:true,is_visitable:true,dwelling_type:'maison',source_origin:'saisie_manuelle'};
    const {data,error}=await sb.from('households').insert(row).select('id').single();if(error)throw error;
    status.textContent='Maison ajoutée. Actualisation des tournées…';
    if(typeof window.volvicReloadAddresses==='function')await window.volvicReloadAddresses();else if(typeof loadAll==='function')await loadAll();
    alert('Maison enregistrée. Vérifie son apparition dans la tournée choisie.');form.remove();
   }catch(e){status.textContent='Ajout non effectué : '+(e.message||'erreur inconnue')}finally{submit.disabled=false}
  };
 };
}
document.addEventListener('DOMContentLoaded',addControl);
setTimeout(addControl,900);setTimeout(addControl,3500);

// Les maisons de la tournée commune doivent rester visibles même sans équipe propriétaire.
// Ne jamais changer les données de passage ou d'affectation dans cette correction.
function sharedHouse(h){const s=(typeof sectors!=='undefined'?sectors:[]).find(x=>x.id===h.sector_id);const n=norm(s?.name);return n.includes('moulet')&&n.includes('marcenat')}
window.visibleHouses=function(){
 if(typeof me==='undefined'||!me)return [];
 const hs=typeof households!=='undefined'?households:[];
 if(['admin','responsable'].includes(me.role))return hs;
 const ids=(typeof members!=='undefined'?members:[]).filter(x=>x.user_id===me.id).map(x=>x.team_id);
 return hs.filter(h=>sharedHouse(h)||ids.includes(window.teamForHouse(h))||(typeof helpTeam!=='undefined'&&helpTeam&&window.teamForHouse(h)===helpTeam));
};
async function reloadSectorLinks(){
 if(typeof sb==='undefined'||typeof campaign==='undefined'||!campaign)return;
 const {data,error}=await sb.from('team_sectors').select('team_id,sector_id');
 if(error){console.warn('Liens secteurs non chargés',error);return}
 sectorLinks=data||[];
 try{window.renderHouses?.();window.renderStats?.();window.renderMap?.()}catch(e){console.warn(e)}
}
function addAddressDiagnostics(){
 if(document.getElementById('volvicAddressDiagnostics'))return;
 const host=document.getElementById('page-tour')||document.getElementById('houses')?.parentElement;
 if(!host)return;
 const wrap=el('div',{id:'volvicAddressDiagnostics',style:'margin:8px 0;display:flex;flex-wrap:wrap;gap:8px'});
 const reset=el('button',{type:'button',className:'btn alt'},'Afficher toutes les maisons de ma tournée');
 const refresh=el('button',{type:'button',className:'btn alt'},'Actualiser les adresses');
 const info=el('span',{role:'status',style:'width:100%;font-size:12px'});
 reset.onclick=()=>{for(const id of ['sectorSelect','teamView','filterStatus','searchHouse']){const node=document.getElementById(id);if(node){node.value='';node.dispatchEvent(new Event('change',{bubbles:true}))}}try{window.renderHouses?.()}catch(e){console.warn(e)}info.textContent='Filtres effacés : affichage de la tournée et de Moulet-Marcenat.'};
 refresh.onclick=async()=>{refresh.disabled=true;info.textContent='Synchronisation…';try{await reloadSectorLinks();if(window.volvicReloadAddresses)await window.volvicReloadAddresses();else if(typeof loadAll==='function')await loadAll();info.textContent='Actualisation demandée. Vérifier le nombre de maisons et les filtres.'}catch(e){info.textContent='Erreur : '+(e.message||e)}finally{refresh.disabled=false}};
 wrap.append(reset,refresh,info);host.insertBefore(wrap,host.firstChild);
}
function initialize(){addControl();addAddressDiagnostics();if(typeof campaign!=='undefined'&&campaign)reloadSectorLinks()}
document.addEventListener('DOMContentLoaded',()=>setTimeout(initialize,700));
setTimeout(initialize,1800);
setTimeout(initialize,5500);
})();
