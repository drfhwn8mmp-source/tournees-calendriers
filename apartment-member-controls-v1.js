/* Gestion appartements par les membres — V1 */
(function(){
  async function renameMemberUnit(id){
    const h=households.find(x=>x.id===id);
    if(!h||h.dwelling_type!=='appartement')return;
    if(window.isHouseFinalLocked?.(h))return toast('🔒 Cette tournée est clôturée. Seul l’administrateur peut la rouvrir.');
    const label=prompt('Nom / numéro du logement',h.unit_label||'');
    if(label===null||!label.trim())return;
    const {error}=await sb.rpc('rename_apartment_for_member',{p_household_id:id,p_unit_label:label.trim()});
    if(error)return toast('Erreur : '+error.message);
    await loadAll();
    toast('✏️ Nom du logement modifié');
  }
  function install(){
    window.renameUnit=renameMemberUnit;
    const old=window.houseHTML;
    if(typeof old==='function'){
      window.houseHTML=function(h){
        let html=old(h);
        if(h.dwelling_type==='appartement'&&!html.includes(`renameUnit('${h.id}')`)){
          html=html.replace('<div class="status">',`<div class="row"><button class="btn alt" onclick="renameUnit('${h.id}')">✏️ Renommer logement</button></div><div class="status">`);
        }else if(h.dwelling_type!=='appartement'&&!html.includes(`configureDwelling('${h.id}')`)){
          html=html.replace('<div class="status">',`<div class="row"><button class="btn alt" onclick="configureDwelling('${h.id}')">🏠/🏢 Type de logement</button></div><div class="status">`);
        }
        return html;
      };
      try{window.renderHouses?.()}catch(_){}
    }
  }
  setTimeout(install,2100);
})();