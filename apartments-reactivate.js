/* Correctif réactivation appartements — Amicale SP Volvic
   Permet Maison <-> Immeuble sans créer de doublons.
   À charger après apartments-ui.js et app-fix-v2.js.
*/
(function(){
  window.configureDwelling = async function(id) {
    const h = households.find(x => x.id === id);
    if (!h) return toast('Adresse introuvable');

    const current = h.dwelling_type === 'immeuble' ? '2' : '1';
    const choice = prompt("Type d'adresse :\n1. 🏠 Maison\n2. 🏢 Immeuble / plusieurs logements", current);
    if (choice === null) return;

    if (String(choice).trim() === '1') {
      const kids = households.filter(x =>
        x.id !== h.id &&
        (x.parent_building_id === h.id ||
          (x.sector_id===h.sector_id &&
           (x.street_id||'')===(h.street_id||'') &&
           String(x.house_number||'').trim().toLowerCase()===String(h.house_number||'').trim().toLowerCase() &&
           String(x.street||'').trim().toLowerCase()===String(h.street||'').trim().toLowerCase() &&
           String(x.locality||'').trim().toLowerCase()===String(h.locality||'').trim().toLowerCase())) &&
        x.dwelling_type === 'appartement'
      );
      if (kids.some(x=>x.active!==false) &&
          !confirm(`Cette adresse possède ${kids.filter(x=>x.active!==false).length} appartement(s) actifs. Les masquer et repasser l'adresse en maison ?`)) return;

      if (kids.length) {
        const r0=await sb.from('households').update({active:false}).in('id',kids.map(x=>x.id));
        if(r0.error) return toast(r0.error.message);
      }
      const r=await sb.from('households').update({
        dwelling_type:'maison', apartment_count:null, unit_label:null,
        parent_building_id:null, is_visitable:true
      }).eq('id',id);
      if(r.error) return toast(r.error.message);
      await loadAll();
      return toast('🏠 Adresse définie comme maison');
    }

    if (String(choice).trim() !== '2') return toast('Choisis 1 ou 2');

    const count=Number(prompt("Combien d'appartements / logements y a-t-il dans l'immeuble ?", h.apartment_count || 2));
    if(!Number.isInteger(count)||count<1||count>500) return toast('Nombre de logements incorrect');

    const buildingName=prompt("Nom de résidence / bâtiment (facultatif)",h.building_name||'');
    if(buildingName===null) return;

    /* Charge aussi les logements inactifs directement depuis la base :
       ils peuvent ne plus être présents dans le tableau households du navigateur. */
    const q=await sb.from('households')
      .select('*')
      .eq('parent_building_id',id)
      .eq('dwelling_type','appartement');
    if(q.error) return toast(q.error.message);
    const allExisting=q.data||[];

    const parent=await sb.from('households').update({
      dwelling_type:'immeuble', apartment_count:count,
      building_name:buildingName||null, unit_label:null,
      parent_building_id:null, is_visitable:false
    }).eq('id',id);
    if(parent.error) return toast(parent.error.message);

    for(let i=1;i<=count;i++){
      const label=`Appartement ${i}`;
      const old=allExisting.find(x=>String(x.unit_label||'').trim().toLowerCase()===label.toLowerCase());
      if(old){
        const rr=await sb.from('households').update({
          active:true, is_visitable:true,
          building_name:buildingName||null,
          parent_building_id:id,
          dwelling_type:'appartement'
        }).eq('id',old.id);
        if(rr.error) return toast(`Réactivation ${label} impossible : ${rr.error.message}`);
        continue;
      }

      const payload={
        sector_id:h.sector_id, street_id:h.street_id||null,
        house_number:h.house_number||null, street:h.street,
        locality:h.locality||null, postal_code:h.postal_code||null,
        city_name:h.city_name||null, latitude:h.latitude, longitude:h.longitude,
        active:true, is_test:h.is_test||false,
        dwelling_type:'appartement', apartment_count:null,
        building_name:buildingName||null, unit_label:label,
        parent_building_id:id, is_visitable:true
      };
      const rr=await sb.from('households').insert(payload);
      if(rr.error) return toast(`${label} : ${rr.error.message}`);
    }

    /* Si on réduit le nombre : désactive uniquement les appartements numérotés au-delà,
       sans les effacer, afin de conserver historique et reçus. */
    for(const old of allExisting){
      const m=String(old.unit_label||'').match(/^Appartement\s+(\d+)$/i);
      if(m && Number(m[1])>count && old.active!==false){
        const rr=await sb.from('households').update({active:false}).eq('id',old.id);
        if(rr.error) return toast(`Impossible de masquer ${old.unit_label} : ${rr.error.message}`);
      }
    }

    await loadAll();
    toast(`🏢 Immeuble configuré : ${count} logements`);
  };
})();
