/* Maison / Immeuble via RPC sécurisée — V3 */
(function(){
  async function cfg(id){
    const h=households.find(x=>x.id===id); if(!h)return toast('Adresse introuvable');
    if(window.isHouseFinalLocked?.(h))return toast('🔒 Cette tournée est clôturée. Seul l’administrateur peut la rouvrir.');
    const cur=h.dwelling_type==='immeuble'?'2':'1';
    const choice=prompt("Type d'adresse :\n1. 🏠 Maison\n2. 🏢 Immeuble / plusieurs logements",cur);
    if(choice===null)return;
    let type,count=null,name=null;
    if(String(choice).trim()==='1'){
      type='maison';
      const children=households.filter(x=>x.parent_building_id===id&&x.dwelling_type==='appartement'&&x.active!==false);
      if(children.length&&!confirm(`Cette adresse possède ${children.length} appartement(s). Les désactiver et repasser l'adresse en maison ?`))return;
    }else if(String(choice).trim()==='2'){
      type='immeuble';
      count=Number(prompt("Combien d'appartements / logements y a-t-il dans l'immeuble ?",h.apartment_count||2));
      if(!Number.isInteger(count)||count<1||count>500)return toast('Nombre de logements incorrect');
      name=prompt("Nom de résidence / bâtiment (facultatif)",h.building_name||'');
      if(name===null)return;
    }else return toast('Choisis 1 ou 2');
    const {error}=await sb.rpc('configure_dwelling_for_member',{
      p_household_id:id,p_type:type,p_apartment_count:count,p_building_name:name||null
    });
    if(error)return toast('Erreur : '+error.message);
    await loadAll();
    toast(type==='maison'?'🏠 Adresse définie comme maison':`🏢 Immeuble configuré : ${count} logements`);
  }
  function install(){
    window.configureDwelling=cfg;
    window.mapDwellingType=async function(id){
      try{map?.closePopup?.()}catch(_){}
      await cfg(id);
      try{window.renderMap?.();window.renderStats?.();window.renderHouses?.()}catch(_){}
    };
  }
  setTimeout(install,1800);
})();