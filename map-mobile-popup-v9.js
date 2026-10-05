/* Carte mobile — V9 : formulaire dans une fenêtre fixe, hors du popup Leaflet */
(function(){
  function esc2(v){try{return esc(v)}catch(_){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}}
  function openForm(id){
    const h=households.find(x=>x.id===id),v=visitFor(id)||{}; if(!h)return;
    let box=document.getElementById('mapDoneModalV9');
    if(!box){
      box=document.createElement('div'); box.id='mapDoneModalV9';
      box.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.45);padding:env(safe-area-inset-top) 12px env(safe-area-inset-bottom);overflow:auto;display:flex;align-items:flex-start;justify-content:center';
      document.body.appendChild(box);
    }
    box.innerHTML=`<div style="background:#fff;width:min(520px,100%);margin:18px auto;border-radius:16px;padding:16px;box-shadow:0 8px 30px #0005">
      <div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1"><b style="font-size:18px">✅ Passage — ${esc2(h.house_number||'')} ${esc2(h.street||'')}</b><div class="muted">${esc2(h.locality||'')}</div></div><button type="button" id="mapCloseV9" class="btn alt" style="flex:0 0 auto">✕</button></div><br>
      <label>Calendriers</label><input id="map-cal-${id}" type="number" min="0" value="${v.calendars_count??1}">
      <label>Don (€)</label><input id="map-amt-${id}" type="number" min="0" step=".01" value="${v.amount??''}">
      <label>Mode de paiement</label><select id="map-pay-${id}"><option value="">— Choisir —</option>${['especes','carte','cheque','autre'].map(x=>`<option value="${x}" ${v.payment_method===x?'selected':''}>${x}</option>`).join('')}</select>
      <label>Commentaire</label><input id="map-com-${id}" value="${esc2(v.visit_comment||'')}" placeholder="Commentaire visite">
      <br><button type="button" class="btn green" style="width:100%;margin-top:10px" id="mapSaveV9">✅ Valider le passage</button>
    </div>`;
    box.style.display='flex';
    document.getElementById('mapCloseV9').onclick=()=>box.style.display='none';
    document.getElementById('mapSaveV9').onclick=async()=>{await saveMapDone(id);box.style.display='none'};
  }
  function install(){
    if(typeof window.renderMap!=='function')return setTimeout(install,250);
    window.mapVisitActionV9=function(id,status){
      if(status==='fait'){openForm(id);return}
      return window.mapVisitAction(id,status);
    };
    const old=window.renderMap;
    window.renderMap=function(){
      const r=old.apply(this,arguments);
      setTimeout(()=>{
        (markers||[]).forEach(m=>{
          const id=m.__houseId,p=m.getPopup?.(); if(!id||!p)return;
          let s=p.getContent(); if(typeof s!=='string')return;
          /* Remplace toutes les variantes précédentes du bouton Fait par un appel stable. */
          s=s.replace(/<button[^>]*>✅ Fait<\/button>/,
            `<button type="button" onclick="event.stopPropagation();window.mapVisitActionV9('${id}','fait')">✅ Fait</button>`);
          p.setContent(s);
        });
      },0);
      return r;
    };
    try{window.renderMap()}catch(e){console.error('map mobile V9',e)}
  }
  setTimeout(install,1000);
})();