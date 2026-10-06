/* Amicale SP Volvic — garde avant clôture définitive V1 */
(function(){
 const keys=['visitQueue','visitQueueConflicts','visitQueueClosed'];
 const read=k=>{try{const a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}};
 function counts(){return {q:read(keys[0]).length,c:read(keys[1]).length,b:read(keys[2]).length}}
 function message(n){
   const p=[];
   if(n.q)p.push(`${n.q} saisie(s) en attente de synchronisation`);
   if(n.c)p.push(`${n.c} conflit(s) non résolu(s)`);
   if(n.b)p.push(`${n.b} saisie(s) bloquée(s) après clôture`);
   return '⛔ Clôture impossible.\n\n'+p.join('\n')+'\n\nIl faut traiter ces éléments avant de clôturer définitivement.';
 }
 function install(){
   const host=document.getElementById('finalTourCard'); if(!host)return;
   host.addEventListener('click',async e=>{
     const b=e.target.closest('#closeFinal'); if(!b)return;
     const n=counts(); if(!(n.q||n.c||n.b))return;
     e.preventDefault();e.stopImmediatePropagation();
     alert(message(n));
     try{setSync('Clôture bloquée : saisies à traiter',true)}catch(_){}
   },true);
 }
 setTimeout(install,250);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,100)});
})();