/* Tri naturel des adresses — Amicale SP Volvic
   Rue par ordre alphabétique puis numéro réellement croissant :
   1, 2, 2 bis, 3, 10, 10 bis, 11... */
(function(){
  const collator = new Intl.Collator('fr', {
    numeric: true,
    sensitivity: 'base',
    ignorePunctuation: true
  });

  function naturalAddressSort(a,b){
    const streetCmp = collator.compare(String(a.street||''), String(b.street||''));
    if(streetCmp) return streetCmp;

    const localityCmp = collator.compare(String(a.locality||''), String(b.locality||''));
    if(localityCmp) return localityCmp;

    const numCmp = collator.compare(String(a.house_number||''), String(b.house_number||''));
    if(numCmp) return numCmp;

    return collator.compare(String(a.id||''), String(b.id||''));
  }

  function sortAll(){
    if(!Array.isArray(households)) return;
    households.sort(naturalAddressSort);
  }

  // On trie le tableau source avant chaque rendu.
  const originalRenderHouses = window.renderHouses;
  window.renderHouses = function(){
    sortAll();
    return originalRenderHouses.apply(this, arguments);
  };

  // Premier tri après le chargement initial.
  setTimeout(()=>{
    sortAll();
    try{
      window.renderHouses();
      window.renderMap?.();
    }catch(e){
      console.error('Tri naturel adresses:',e);
    }
  },100);

  window.sortHouseholdsNaturally = sortAll;
})();
