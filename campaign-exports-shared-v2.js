/* Bilans tournée commune Moulet–Marcenat — V2
   Complète campaign-exports-v1.js sans modifier les données.
*/
(function(){
 const E=id=>document.getElementById(id);
 const q=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
 const dl=(name,blob)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)};
 const csv=(name,rows)=>{if(!rows.length)return toast('Aucune donnée à exporter');const keys=Object.keys(rows[0]),txt='\ufeff'+keys.map(q).join(';')+'\n'+rows.map(r=>keys.map(k=>q(r[k])).join(';')).join('\n');dl(name,new Blob([txt],{type:'text/csv;charset=utf-8'}))};
 const house=id=>(households||[]).find(x=>x.id===id)||{};
 function sharedHouse(x){
   if(!x||!x.id)return false;
   if(typeof window.isSharedRoundHouse==='function'){
     try{return !!window.isSharedRoundHouse(x)}catch(_){}
   }
   const sec=(sectors||[]).find(s=>s.id===x.sector_id);
   const city=(cities||[]).find(c=>c.id===(sec?.city_id||x.city_id));
   return !!city?.shared_round;
 }
 function stats(name,vv){
   const done=vv.filter(v=>v.status==='fait');
   const sum=(arr,k)=>arr.reduce((a,v)=>a+(+v[k]||0),0);
   const pay=m=>sum(done.filter(v=>v.payment_method===m),'amount');
   return {tournee:name,passages_faits:done.length,calendriers:sum(done,'calendars_count'),dons:sum(done,'amount'),especes:pay('especes'),carte:pay('carte'),cheque:pay('cheque'),autre:pay('autre')};
 }
 function rows(){
   const out=(teams||[]).map(t=>stats(t.name,(visits||[]).filter(v=>(v.original_team_id||v.team_id)===t.id)));
   const shared=(visits||[]).filter(v=>sharedHouse(house(v.household_id)));
   out.push(stats('Tournée commune Moulet–Marcenat',shared));
   return out;
 }
 function pdf(){
   const rr=rows(),{jsPDF}=window.jspdf||{};
   if(!jsPDF)return toast('Module PDF indisponible');
   const d=new jsPDF({orientation:'landscape'});d.setFontSize(15);d.text('Bilan des tournées',14,14);d.setFontSize(9);d.text('Campagne '+campaign.year,14,20);
   d.autoTable({startY:25,head:[Object.keys(rr[0])],body:rr.map(r=>Object.values(r)),styles:{fontSize:7,cellPadding:1.5},headStyles:{fontSize:7}});
   d.save(`bilan-tournees-${campaign.year}.pdf`);
 }
 function bind(){
   const a=E('exportTeams'); if(a)a.onclick=()=>csv(`tournees-${campaign.year}.csv`,rows());
   const b=E('pdfTeams'); if(b)b.onclick=pdf;
   const x=E('excelCampaign');
   if(x){
     const old=x.onclick;
     x.onclick=async()=>{
       if(!window.XLSX)return toast('Module Excel indisponible');
       // Rebuild workbook so the Tours sheet includes the shared round.
       const wb=XLSX.utils.book_new();
       const visitRows=(visits||[]).map(v=>{const h=house(v.household_id);const tid=v.original_team_id||v.team_id;const t=(teams||[]).find(z=>z.id===tid);return {statut:v.status,numero:h.house_number||'',voie:h.street||'',lieu_dit:h.locality||'',commune:h.city_name||'',tournee:sharedHouse(h)?'Tournée commune Moulet–Marcenat':(t?.name||'Équipe inconnue'),calendriers:+v.calendars_count||0,don:+v.amount||0,paiement:v.payment_method||'',aide:v.helper_mode?'Oui':'Non',date:v.visited_at||v.updated_at||'',commentaire:v.visit_comment||''}});
       const done=(visits||[]).filter(v=>v.status==='fait'),sum=(arr,k)=>arr.reduce((a,v)=>a+(+v[k]||0),0),pay=m=>sum(done.filter(v=>v.payment_method===m),'amount');
       const global=[{campagne:campaign.year,passages_faits:done.length,calendriers:sum(done,'calendars_count'),dons:sum(done,'amount'),especes:pay('especes'),carte:pay('carte'),cheque:pay('cheque'),autre:pay('autre')}];
       let receipts=[]; try{const r=await sb.from('receipts').select('*').eq('campaign_id',campaign.id).order('issued_at'); receipts=(r.data||[])}catch(_){}
       XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(visitRows),'Visites');
       XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows()),'Tournées');
       XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(global),'Bilan');
       XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(receipts),'Reçus');
       XLSX.writeFile(wb,`campagne-${campaign.year}.xlsx`);
     };
   }
 }
 // Loaded after V1, so these handlers deliberately replace only the affected exports.
 bind();
})();
