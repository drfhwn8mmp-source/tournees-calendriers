/* Amicale SP Volvic — résolution conflits hors connexion V2 */
(function(){
 const KEY='visitQueueConflicts';
 const read=()=>{try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch(_){return[]}};
 const write=a=>localStorage.setItem(KEY,JSON.stringify(a));
 const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const house=id=>{try{return(households||[]).find(x=>x.id===id)}catch(_){return null}};
 const label=v=>`${v?.status||'—'} · ${v?.calendars_count??0} cal. · ${v?.amount??0} €${v?.payment_method?' · '+v.payment_method:''}`;
 const stamp=v=>String(v?.client_updated_at||v?.updated_at||v?.visited_at||'');
 async function remote(c){
   const {data,error}=await sb.from('visits').select('*').eq('campaign_id',c.campaign_id).eq('household_id',c.household_id).maybeSingle();
   if(error)throw error;return data||null;
 }
 async function choose(i,local){
  let a=read(),c=a[i];if(!c)return;
  if(local){
   let now;
   try{now=await remote(c)}catch(_){return toast('Impossible de revérifier le serveur. Réessaie avec une connexion stable.',true)}
   if(stamp(now)!==stamp(c._server)){
     c={...c,_server:now,_conflict_at:new Date().toISOString()};
     a[i]=c;write(a);render();
     alert('⚠️ Cette maison a encore été modifiée depuis l’apparition du conflit.\n\nLa dernière saisie du serveur vient d’être rechargée. Vérifie les deux versions puis choisis de nouveau.');
     return;
   }
   const p={...c};delete p._server;delete p._conflict_at;
   p.updated_at=new Date().toISOString();p.client_updated_at=p.updated_at;
   try{
    const{data,error}=await sb.from('visits').upsert(p,{onConflict:'campaign_id,household_id'}).select().single();
    if(error)return toast('Impossible d’enregistrer : '+error.message,true);
    try{if(typeof applyLocal==='function')applyLocal(data)}catch(_){}
   }catch(_){return toast('Réseau indisponible : réessaie lorsque la connexion est revenue',true)}
  }else{
   let now;
   try{now=await remote(c)}catch(_){return toast('Impossible de revérifier le serveur. Réessaie avec une connexion stable.',true)}
   try{if(now&&typeof applyLocal==='function')applyLocal(now)}catch(_){}
  }
  a=read();const k=String(c.campaign_id)+'|'+String(c.household_id);
  a=a.filter(x=>String(x.campaign_id)+'|'+String(x.household_id)!==k);write(a);render();
  try{if(typeof loadAll==='function')await loadAll()}catch(_){}
  try{renderStats();renderHouses();window.renderMap?.()}catch(_){}
  toast('Conflit réglé',true);
 }
 function render(){
  let box=document.getElementById('offlineConflictPanel'),a=read();
  if(!a.length){if(box)box.remove();try{setSync('Synchronisé',false)}catch(_){};return}
  if(!box){box=document.createElement('div');box.id='offlineConflictPanel';document.body.appendChild(box)}
  box.style.cssText='position:fixed;inset:0;z-index:15000;background:rgba(0,0,0,.5);padding:calc(env(safe-area-inset-top) + 12px) 12px calc(env(safe-area-inset-bottom) + 12px);overflow:auto';
  box.innerHTML=`<div style="background:#fff;max-width:560px;margin:12px auto;border-radius:16px;padding:16px"><h3>⚠️ Saisies à vérifier (${a.length})</h3><p>Une autre personne a modifié la même maison. Le serveur sera revérifié juste avant ton choix.</p><div id="conflictRows"></div><button class="btn alt" id="confClose" style="width:100%">Fermer</button></div>`;
  const rows=box.querySelector('#conflictRows');
  a.forEach((c,i)=>{const h=house(c.household_id),d=document.createElement('div');d.className='card';d.style.margin='10px 0';d.innerHTML=`<b>${esc(h?[h.house_number,h.street].filter(Boolean).join(' '):'Maison')}</b><br><small>Ta saisie : ${esc(label(c))}</small><br><small>Saisie serveur : ${esc(label(c._server))}</small><br><button class="btn green" data-local="${i}" style="margin-top:8px;width:100%">Garder ma saisie</button><button class="btn alt" data-server="${i}" style="margin-top:6px;width:100%">Garder la saisie du serveur</button>`;rows.appendChild(d)});
  rows.onclick=e=>{const l=e.target.closest('[data-local]'),s=e.target.closest('[data-server]');if(l)choose(+l.dataset.local,true);else if(s)choose(+s.dataset.server,false)};
  box.querySelector('#confClose').onclick=()=>box.style.display='none';
 }
 function notify(){const a=read();if(!a.length)return;try{setSync(`${a.length} conflit(s) à vérifier`,true)}catch(_){}render()}
 window.showVisitQueueConflicts=render;
 addEventListener('online',()=>setTimeout(notify,900));
 addEventListener('focus',()=>setTimeout(notify,500));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(notify,500)});
 setTimeout(notify,4000);
})();