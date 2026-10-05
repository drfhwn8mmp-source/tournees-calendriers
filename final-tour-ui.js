/* Clôture définitive des tournées — Amicale SP Volvic — V1 */
(function(){
 const E=id=>document.getElementById(id);
 function sharedHouse(h){const s=sectors.find(x=>x.id===h?.sector_id),c=cities.find(x=>x.id===s?.city_id);return c?.shared_round===true}
 function ctx(){
   const shared=E('teamView')?.value==='__shared__';
   const teamId=shared?null:(E('teamView')?.value||myTeamIds()[0]||null);
   const hs=households.filter(h=>h.active!==false&&h.is_visitable!==false&&h.dwelling_type!=='immeuble'&&(shared?sharedHouse(h):teamForHouse(h)===teamId));
   return {shared,teamId,hs};
 }
 async function state(c){
   let q=sb.from('tour_final_states').select('*').eq('campaign_id',campaign.id).eq('scope',c.shared?'shared':'team');
   q=c.shared?q.is('team_id',null):q.eq('team_id',c.teamId);
   const {data}=await q.limit(1).maybeSingle(); return data||null;
 }
 function counts(c){
   let fait=0,absent=0,repasser=0,refus=0,afaire=0,cal=0,amt=0;
   c.hs.forEach(h=>{const v=visitFor(h.id); const s=v?.status||'a_faire';
     if(s==='fait'){fait++;cal+=+v.calendars_count||0;amt+=+v.amount||0}
     else if(s==='absent')absent++; else if(s==='a_repasser')repasser++; else if(s==='refus')refus++; else afaire++;
   });
   return {total:c.hs.length,fait,absent,repasser,refus,afaire,cal,amt,unfinished:absent+repasser+afaire};
 }
 async function render(){
   const host=E('finalTourCard'); if(!host)return;
   const c=ctx(); if(!c.shared&&!c.teamId){host.innerHTML='<div class="muted">Choisis une tournée.</div>';return}
   const s=await state(c),n=counts(c),name=c.shared?'Moulet-Marcenat — tournée commune':(teams.find(t=>t.id===c.teamId)?.name||'Équipe');
   host.innerHTML='<div class="sectionTitle">🏁 Fin de tournée définitive</div>'+
    '<b>'+esc(name)+'</b><div class="muted">'+n.fait+'/'+n.total+' faits · '+n.afaire+' à faire · '+n.absent+' absents · '+n.repasser+' à repasser · '+n.refus+' refus</div>'+
    '<div class="muted">'+n.cal+' calendrier(s) · '+n.amt.toLocaleString('fr-FR',{style:'currency',currency:'EUR'})+'</div><br>'+
    (s?.is_closed
      ? '<div class="pill">🔒 Tournée clôturée définitivement</div>'+(me.role==='admin'?'<br><br><button class="btn orange bigstart" id="reopenFinal">🔓 Rouvrir la tournée</button>':'')
      : '<button class="btn green bigstart" id="closeFinal">🏁 Clôturer définitivement la tournée</button>');
   E('closeFinal')?.addEventListener('click',()=>closeFinal(c,n));
   E('reopenFinal')?.addEventListener('click',()=>reopenFinal(s));
 }
 async function closeFinal(c,n){
   let warning='Clôturer définitivement cette tournée ?';
   if(n.unfinished||n.refus)warning+='\n\nATTENTION : '+n.afaire+' à faire, '+n.absent+' absent(s), '+n.repasser+' à repasser, '+n.refus+' refus.';
   warning+='\n\nLes visites, dons et calendriers seront conservés.';
   if(!confirm(warning))return;
   if(!confirm('DERNIÈRE CONFIRMATION : valider la clôture définitive ?'))return;
   const note=prompt('Remarque de clôture (facultatif)','');
   if(note===null)return;
   const {error}=await sb.rpc('close_tour_final',{p_campaign_id:campaign.id,p_scope:c.shared?'shared':'team',p_team_id:c.teamId,p_note:note||null});
   if(error)return toast('Erreur clôture : '+error.message);
   toast('🔒 Tournée clôturée définitivement'); await render();
 }
 async function reopenFinal(s){
   if(me.role!=='admin')return toast('Réouverture réservée à l’administrateur');
   if(!confirm('Rouvrir cette tournée ? Toutes les visites déjà enregistrées seront conservées.'))return;
   const note=prompt('Motif de la réouverture (facultatif)','');
   if(note===null)return;
   const {error}=await sb.rpc('reopen_tour_final',{p_final_state_id:s.id,p_note:note||null});
   if(error)return toast('Erreur réouverture : '+error.message);
   toast('🔓 Tournée rouverte'); await render();
 }
 function install(){
   const tour=E('page-tour'); if(!tour)return;
   E('finalTourCard')?.remove();
   const d=document.createElement('div');d.className='card';d.id='finalTourCard';tour.appendChild(d);
   render();
   E('teamView')?.addEventListener('change',()=>setTimeout(render,0));
   const oldApply=window.applyLocal;
   if(typeof oldApply==='function')window.applyLocal=function(v){const r=oldApply.apply(this,arguments);setTimeout(render,0);return r};
 }
 window.renderFinalTour=render;
 setTimeout(install,50);
})();