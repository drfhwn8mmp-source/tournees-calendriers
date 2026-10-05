/* Carte hors connexion — Amicale SP Volvic V1 */
(function(){
 function install(){
  if(typeof window.mapVisitAction!=='function')return setTimeout(install,300);
  const original=window.mapVisitAction;
  window.mapVisitAction=async function(id,status){
   if(status==='fait')return original(id,status);
   const h=(households||[]).find(x=>x.id===id); if(!h)return toast('Adresse introuvable');
   try{if(window.isHouseFinalLocked?.(h))return toast('Cette tournée est clôturée')}catch(_){}
   const old=visitFor(id)||{}; let owner=null;try{owner=teamForHouse(h)}catch(_){}
   let shared=false;try{if(typeof isSharedRoundHouse==='function')shared=!!isSharedRoundHouse(h);else{const s=(sectors||[]).find(x=>x.id===h.sector_id),c=(cities||[]).find(x=>x.id===(h.city_id||s?.city_id));shared=!!c?.shared_round}}catch(_){}
   const ids=(()=>{try{return myTeamIds()||[]}catch(_){return []}})(),mine=ids[0]||null,help=!shared&&!!owner&&!!mine&&owner!==mine;
   const p={campaign_id:campaign.id,household_id:id,team_id:shared?null:owner,original_team_id:shared?null:owner,helper_mode:help,status,calendars_count:0,amount:0,payment_method:null,visit_comment:old.visit_comment??null,visited_by:me.id,visited_at:new Date().toISOString(),updated_at:new Date().toISOString(),client_updated_at:new Date().toISOString()};
   function keep(msg){try{queue(p)}catch(_){}try{applyLocal(p)}catch(_){}try{window.renderMap?.()}catch(_){}try{setSync('Saisie en attente',true)}catch(_){}toast(msg,true)}
   if(!navigator.onLine)return keep('Enregistré hors connexion');
   try{const {data,error}=await sb.from('visits').upsert(p,{onConflict:'campaign_id,household_id'}).select().single();if(error)return keep('Réseau faible : saisie conservée');try{applyLocal(data)}catch(_){}try{await sb.from('visit_presence').delete().eq('household_id',id).eq('user_id',me.id)}catch(_){}try{window.renderMap?.()}catch(_){}toast('Passage enregistré')}catch(_){keep('Réseau faible : saisie conservée')}
  };
  window.mapVisitActionV9=window.mapVisitAction;
 }
 setTimeout(install,100);
})();