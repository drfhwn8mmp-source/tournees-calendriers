/* Amicale SP Volvic — garde fin de journée V1 */
(function(){
 const read=k=>{try{const a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}};
 function pending(){
   return {q:read('visitQueue').length,c:read('visitQueueConflicts').length,b:read('visitQueueClosed').length};
 }
 function text(n){
   const a=[];
   if(n.q)a.push(`${n.q} saisie(s) à synchroniser`);
   if(n.c)a.push(`${n.c} conflit(s) à résoudre`);
   if(n.b)a.push(`${n.b} saisie(s) bloquée(s)`);
   return '⛔ Fin de journée impossible pour le moment.\n\n'+a.join('\n')+
     '\n\nLe contrôle de caisse doit être fait uniquement après traitement de ces éléments.';
 }
 function install(){
   const card=document.getElementById('endDayCard'); if(!card||card.__pendingGuard)return;
   card.__pendingGuard=true;
   card.addEventListener('click',e=>{
     const b=e.target.closest('#endDay,#saveEndDay'); if(!b)return;
     const n=pending();if(!(n.q||n.c||n.b))return;
     e.preventDefault();e.stopImmediatePropagation();
     alert(text(n));
     try{setSync('Fin de journée bloquée : saisies à traiter',true)}catch(_){}
   },true);
 }
 setTimeout(install,500);
 addEventListener('pageshow',()=>setTimeout(install,150));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,150)});
})();