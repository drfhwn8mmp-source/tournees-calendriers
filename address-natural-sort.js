/* Tri affichage des foyers V3 — Amicale SP Volvic
   Corrige directement la liste rendue à l'écran.
   Rue -> numéro naturel -> localité.
*/
(function(){
  const collator = new Intl.Collator('fr', {
    numeric: true,
    sensitivity: 'base',
    ignorePunctuation: true
  });

  function cmp(a,b){
    let c = collator.compare(String(a.street||''), String(b.street||''));
    if(c) return c;
    c = collator.compare(String(a.house_number||''), String(b.house_number||''));
    if(c) return c;
    c = collator.compare(String(a.locality||''), String(b.locality||''));
    if(c) return c;
    return collator.compare(String(a.id||''), String(b.id||''));
  }

  // Remplace le rendu lui-même : aucun tri ultérieur ne peut annuler celui-ci.
  window.renderHouses = function(){
    const box = document.getElementById('houses');
    if(!box) return;

    const sid = document.getElementById('sectorSelect')?.value || '';
    const tid = document.getElementById('teamView')?.value || '';
    const fs  = document.getElementById('filterStatus')?.value || '';
    const q   = (document.getElementById('searchHouse')?.value || '').toLowerCase();

    let list = visibleHouses().filter(h =>
      (!sid || h.sector_id === sid) &&
      (!tid || teamForHouse(h) === tid)
    );

    list = list.filter(h => {
      const v = visitFor(h.id);
      const st = v?.status || 'a_faire';
      const hay = `${h.house_number||''} ${h.street||''} ${h.locality||''} ${h.permanent_note||''}`.toLowerCase();
      return (!fs || st === fs) && hay.includes(q);
    });

    // LE TRI EST FAIT ICI, JUSTE AVANT LE HTML.
    list.sort(cmp);

    box.innerHTML = list.map(h => houseHTML(h)).join('') ||
      '<div class="card muted">Aucun foyer correspondant.</div>';
  };

  setTimeout(() => {
    try { window.renderHouses(); }
    catch(e){ console.error('Tri affichage V3:', e); }
  }, 150);
})();
