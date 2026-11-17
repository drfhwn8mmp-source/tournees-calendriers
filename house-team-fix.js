/* Amicale SP Volvic — priorité au secteur officiel de la maison. */
(function(){
'use strict';
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function sectorTeam(id){
 const s=(sectors||[]).find(x=>x.id===id);if(!s)return {known:false,team:null};
 const sn=norm(s.name);
 if(sn.includes('moulet')&&sn.includes('marcenat'))return {known:true,team:null};
 if(sn.includes('test'))return {known:true,team:null};
 const m=sn.match(/equipe\s*(\d+)/);
 if(m){const t=(teams||[]).find(x=>norm(x.name).match(new RegExp('equipe\\s*'+m[1]+'(?:\\D|$)')));return {known:true,team:t?.id||null}}
 const t=(teams||[]).find(x=>norm(x.name)===sn);return {known:true,team:t?.id||null};
}
window.teamForHouse=function(h){if(!h)return null;const s=sectorTeam(h.sector_id);if(s.known)return s.team;const links=(teamStreets||[]).filter(ts=>ts.street_id===h.street_id);return links.length===1?links[0].team_id:null};
setTimeout(()=>{try{window.renderHouses?.();window.renderStats?.();window.renderMap?.()}catch(_){}},300);
})();
