/* Amicale SP Volvic — garde comptage frais avant clôture définitive V1 */
(function(){
 let busy=false;
 const E=id=>document.getElementById(id);
 function snap(){
   try{
     const shared=E('teamView')?.value==='__shared__';
     const teamId=shared?null:(E('teamView')?.value||myTeamIds()[0]||null);
     const sh=h=>{const s=sectors.find(x=>x.id===h?.sector_id),c=cities.find(x=>x.id===s?.city_id);return c?.shared_round===true};
     const hs=households.filter(h=>h.active!==false&&h.is_visitable!==false&&h.dwelling_type!=='immeuble'&&(shared?sh(h):teamForHouse(h)===teamId));
     const out={scope:shared?'shared':'team',teamId,total:hs.length,fait:0,absent:0,repasser:0,refus:0,afaire:0,cal:0,amt:0};
     hs.forEach(h=>{const v=visitFor(h.id),s=v?.status||'a_faire';
       if(s==='fait'){out.fait++;out.cal+=+v.calendars_count||0;out.amt+=+v.amount||0}
       else if(s==='absent')out.absent++;else if(s==='a_repasser')out.repasser++;else if(s==='refus')out.refus++;else out.afaire++;
     });
     out.amt=Math.round(out.amt*100)/100;return out;
   }catch(_){return null}
 }
 const sig=x=>x?JSON.stringify(x):'';
 async function refresh(){
   if(typeof window.loadAll!=='function')throw new Error('Actualisation indisponible');
   await window.loadAll();
   try{window.renderStats?.();window.renderHouses?.();window.renderMap?.();window.renderFinalTour?.()}catch(_){}
 }
 function install(){
   const card=E('finalTourCard');if(!card||card.__freshCloseGuard)return;
   card.__freshCloseGuard=true;
   card.addEventListener('click',async e=>{
     const b=e.target.closest('#closeFinal');if(!b||busy||b.dataset.freshOk==='1')return;
     e.preventDefault();e.stopImmediatePropagation();
     if(!navigator.onLine){alert('⛔ Clôture définitive impossible hors connexion.\n\nReconnecte le téléphone pour vérifier les derniers passages enregistrés.');return}
     const before=snap();busy=true;b.disabled=true;
     try{
       await refresh();
       const after=snap();
       if(!before||!after)throw new Error('Comptage impossible');
       if(sig(before)!==sig(after)){
         alert('⚠️ Les données de la tournée ont changé depuis l’affichage.\n\nLe comptage vient d’être actualisé avec les derniers passages du serveur. Vérifie le nouveau bilan puis appuie de nouveau sur « Clôturer définitivement ».');
         return;
       }
       const nb=E('closeFinal');if(!nb)return;
       nb.dataset.freshOk='1';
       nb.click();
       setTimeout(()=>{try{delete nb.dataset.freshOk}catch(_){}},0);
     }catch(err){
       alert('⛔ Impossible de vérifier le comptage sur le serveur.\n\nLa clôture n’a pas été lancée. Vérifie la connexion puis réessaie.');
     }finally{busy=false;const x=E('closeFinal');if(x)x.disabled=false}
   },true);
 }
 setTimeout(install,700);
 addEventListener('pageshow',()=>setTimeout(install,200));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(install,200)});
})();
