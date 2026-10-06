/* Amicale SP Volvic — affichage des saisies hors connexion bloquées V1 */
(function(){
 const KEY='visitQueueClosed';
 const read=()=>{try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}};
 const write=a=>localStorage.setItem(KEY,JSON.stringify(a));
 const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function house(id){try{return(households||[]).find(x=>x.id===id)}catch(_){return null}}
 function label(p){
   const h=house(p.household_id);
   return h?[h.house_number,h.street,h.city_name||h.locality].filter(Boolean).join(' '):'Maison '+String(p.household_id||'');
 }
 function details(p){
   return `${p.status||'—'} · ${p.calendars_count||0} cal. · ${(+p.amount||0).toFixed(2)} €${p.payment_method?' · '+p.payment_method:''}`;
 }
 function render(){
   const a=read(); let box=document.getElementById('closedOfflinePanel');
   if(!a.length){box?.remove();return}
   if(!box){box=document.createElement('div');box.id='closedOfflinePanel';document.body.appendChild(box)}
   box.style.cssText='position:fixed;inset:0;z-index:16000;background:rgba(0,0,0,.55);padding:calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px);overflow:auto';
   box.innerHTML=`<div style="background:#fff;max-width:600px;margin:12px auto;border-radius:16px;padding:16px">
     <h3>🔒 Saisies bloquées après clôture (${a.length})</h3>
     <p>Ces saisies ont été faites hors connexion avant que la tournée soit clôturée. Elles n’ont pas été envoyées au serveur et restent conservées sur ce téléphone.</p>
     <div id="closedOfflineRows"></div>
     <button class="btn alt" id="closedOfflineClose" style="width:100%;margin-top:10px">Fermer</button>
   </div>`;
   const rows=box.querySelector('#closedOfflineRows');
   a.forEach((p,i)=>{
     const d=document.createElement('div');d.className='card';d.style.margin='10px 0';
     const dt=p.visited_at?new Date(p.visited_at).toLocaleString('fr-FR'):'date inconnue';
     d.innerHTML=`<b>${esc(label(p))}</b><br><small>${esc(details(p))}</small><br><small>Saisie : ${esc(dt)}</small>
       ${p.visit_comment?`<br><small>Note : ${esc(p.visit_comment)}</small>`:''}
       <button class="btn" data-copy="${i}" style="width:100%;margin-top:8px">📋 Copier les détails</button>
       <button class="btn alt" data-remove="${i}" style="width:100%;margin-top:6px">🗑️ Retirer de cette liste</button>`;
     rows.appendChild(d);
   });
   rows.onclick=async e=>{
     const c=e.target.closest('[data-copy]'),r=e.target.closest('[data-remove]');
     if(c){
       const p=read()[+c.dataset.copy];if(!p)return;
       const txt=`${label(p)} — ${details(p)} — ${p.visited_at?new Date(p.visited_at).toLocaleString('fr-FR'):''}${p.visit_comment?' — '+p.visit_comment:''}`;
       try{await navigator.clipboard.writeText(txt);toast('Détails copiés',true)}catch(_){prompt('Copie les détails :',txt)}
     }else if(r){
       const i=+r.dataset.remove;if(!confirm('Retirer cette saisie de la liste locale ? Elle ne sera pas envoyée au serveur.'))return;
       const a=read();a.splice(i,1);write(a);render();toast('Saisie retirée de la liste locale',true);
     }
   };
   box.querySelector('#closedOfflineClose').onclick=()=>box.style.display='none';
 }
 function notify(){
   const a=read();if(!a.length)return;
   try{setSync(`${a.length} saisie(s) bloquée(s) après clôture`,true)}catch(_){}
   render();
 }
 window.showClosedOfflineVisits=render;
 addEventListener('online',()=>setTimeout(notify,1200));
 addEventListener('focus',()=>setTimeout(notify,700));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(notify,700)});
 setTimeout(notify,4500);
})();