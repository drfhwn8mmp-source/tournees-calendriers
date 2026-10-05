/* Correctif mobile popup carte — V7
   Mémorise le popup/foyer ouvert : Safari iOS peut renvoyer map.getPopup() = null au clic. */
(function(){
  let activePopup=null, activeHouseId=null;

  function rememberPopup(e){
    activePopup=e?.popup||null;
    const src=e?.popup?._source;
    activeHouseId=src?.__houseId||null;
  }
  function hook(){
    if(!map)return setTimeout(hook,250);
    map.on('popupopen',rememberPopup);
    map.on('popupclose',e=>{
      if(e?.popup===activePopup){activePopup=null;activeHouseId=null}
    });

    const previous=window.mapVisitAction;
    window.mapVisitAction=function(id,status){
      if(status!=='fait')return previous(id,status);

      const h=households.find(x=>x.id===id),v=visitFor(id)||{};
      if(!h)return;
      const form=
        `<div class="map-done-form">`+
        `<b>✅ Passage — ${esc(h.house_number||'')} ${esc(h.street||'')}</b><br>`+
        `<span class="muted">${esc(h.locality||'')}</span><br><br>`+
        `<label>Calendriers</label><input id="map-cal-${id}" type="number" min="0" value="${v.calendars_count??1}">`+
        `<label>Don (€)</label><input id="map-amt-${id}" type="number" min="0" step=".01" value="${v.amount??''}">`+
        `<label>Mode de paiement</label><select id="map-pay-${id}"><option value="">— Choisir —</option>`+
        `${['especes','carte','cheque','autre'].map(x=>`<option value="${x}" ${v.payment_method===x?'selected':''}>${x}</option>`).join('')}</select>`+
        `<label>Commentaire</label><input id="map-com-${id}" value="${esc(v.visit_comment||'')}" placeholder="Commentaire visite">`+
        `<br><button class="btn green" style="width:100%;margin-top:8px" onclick="saveMapDone('${id}')">✅ Valider le passage</button></div>`;

      let popup=map?.getPopup?.()||activePopup;
      if(popup && (!activeHouseId || activeHouseId===id)){
        popup.setContent(form).update();
        activePopup=popup; activeHouseId=id;
        return;
      }

      /* Ultime secours mobile : retrouve le marqueur par l'id et rouvre son popup. */
      const marker=(markers||[]).find(m=>m.__houseId===id);
      if(marker){
        marker.setPopupContent(form);
        marker.openPopup();
        activePopup=marker.getPopup(); activeHouseId=id;
        return;
      }
      toast('Impossible d’ouvrir la saisie de cette maison');
    };
  }
  setTimeout(hook,1000);
})();