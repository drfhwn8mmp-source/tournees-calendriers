/* Correctif mobile carte — V8 : ne dépend plus de map.getPopup() */
(function(){
  function formFor(id){
    const h=households.find(x=>x.id===id),v=visitFor(id)||{};
    if(!h)return '';
    return `<div class="map-done-form">
      <b>✅ Passage — ${esc(h.house_number||'')} ${esc(h.street||'')}</b><br>
      <span class="muted">${esc(h.locality||'')}</span><br><br>
      <label>Calendriers</label><input id="map-cal-${id}" type="number" min="0" value="${v.calendars_count??1}">
      <label>Don (€)</label><input id="map-amt-${id}" type="number" min="0" step=".01" value="${v.amount??''}">
      <label>Mode de paiement</label><select id="map-pay-${id}">
        <option value="">— Choisir —</option>
        ${['especes','carte','cheque','autre'].map(x=>`<option value="${x}" ${v.payment_method===x?'selected':''}>${x}</option>`).join('')}
      </select>
      <label>Commentaire</label><input id="map-com-${id}" value="${esc(v.visit_comment||'')}" placeholder="Commentaire visite">
      <br><button class="btn green" style="width:100%;margin-top:8px" onclick="saveMapDone('${id}')">✅ Valider le passage</button>
    </div>`;
  }

  function install(){
    if(typeof window.renderMap!=='function')return setTimeout(install,250);

    const oldRender=window.renderMap;
    window.renderMap=function(){
      const r=oldRender.apply(this,arguments);
      setTimeout(()=>{
        (markers||[]).forEach(m=>{
          const id=m.__houseId;
          if(!id)return;
          const p=m.getPopup?.(); if(!p)return;
          let html=p.getContent();
          if(typeof html!=='string'||html.includes('data-mobile-v8'))return;
          html=html.replace(
            new RegExp(`<button onclick="mapVisitAction\\('${id}','fait'\\)">✅ Fait</button>`),
            `<button type="button" data-mobile-v8="1" onclick="event.stopPropagation();this.closest('.leaflet-popup-content').innerHTML=window.mapDoneFormV8('${id}')">✅ Fait</button>`
          );
          p.setContent(html);
        });
      },0);
      return r;
    };

    window.mapDoneFormV8=formFor;
    try{window.renderMap()}catch(e){console.error('mobile V8',e)}
  }
  setTimeout(install,1000);
})();