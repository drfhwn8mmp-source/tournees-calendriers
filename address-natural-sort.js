/* Tri naturel des adresses V2 — Amicale SP Volvic
   Priorité : rue -> numéro croissant -> localité.
   Exemple Route de Clermont : 1, 2, 3, 4, 7, 9, 10, 11...
*/
(function(){
  const collator = new Intl.Collator('fr', {
    numeric: true,
    sensitivity: 'base',
    ignorePunctuation: true
  });

  function naturalAddressSort(a,b){
    const streetCmp = collator.compare(String(a.street||''), String(b.street||''));
    if(streetCmp) return streetCmp;

    // IMPORTANT : le numéro doit être comparé AVANT la localité.
    const numCmp = collator.compare(String(a.house_number||''), String(b.house_number||''));
    if(numCmp) return numCmp;

    const localityCmp = collator.compare(String(a.locality||''), String(b.locality||''));
    if(localityCmp) return localityCmp;

    return collator.compare(String(a.id||''), String(b.id||''));
  }

  function sortAll(){
    if(!Array.isArray(households)) return;
    households.sort(naturalAddressSort);
  }

  const originalRenderHouses = window.renderHouses;
  window.renderHouses = function(){
    sortAll();
    return originalRenderHouses.apply(this, arguments);
  };

  setTimeout(()=>{
    sortAll();
    try{
      window.renderHouses();
    }catch(e){
      console.error('Tri naturel adresses V2:',e);
    }
  },100);

  window.sortHouseholdsNaturally = sortAll;
})();
