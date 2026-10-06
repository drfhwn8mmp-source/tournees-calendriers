/* Verrou sélection tournée V1 — Amicale SP Volvic
   Utilisateur normal :
   - sa tournée reste accessible normalement ;
   - tournée commune accessible ;
   - une autre équipe n'est sélectionnable qu'en mode Aider.
   Responsable/admin : accès libre.
   Aucun changement Supabase / carte / visites.
*/
(function(){
  let lastHelp = Symbol('init');

  function privileged(){
    return !!me && (me.role === 'admin' || me.role === 'responsable');
  }

  function rebuild(){
    const sel=document.getElementById('teamView');
    if(!sel || !me || !Array.isArray(teams)) return;

    if(privileged()){
      // Le rendu d'origine est conservé pour responsables/admins.
      return;
    }

    const currentHelp = helpTeam || null;
    const sharedExists = Array.isArray(cities) && cities.some(c=>c.shared_round === true);

    const wanted = [
      {value:'', text:'Mon équipe / mes secteurs'}
    ];

    if(currentHelp){
      const t=teams.find(x=>x.id===currentHelp);
      if(t) wanted.push({value:t.id, text:'🤝 Aide — '+t.name});
    }

    if(sharedExists){
      wanted.push({value:'__shared__', text:'👥 Moulet-Marcenat — tournée commune'});
    }

    const signature=wanted.map(x=>x.value+'|'+x.text).join('||');
    if(sel.dataset.lockSignature !== signature){
      const previous=sel.value;
      sel.innerHTML=wanted.map(x=>`<option value="${x.value}">${x.text}</option>`).join('');
      sel.dataset.lockSignature=signature;

      // On garde uniquement une sélection encore autorisée.
      if(wanted.some(x=>x.value===previous)) sel.value=previous;
      else if(currentHelp && wanted.some(x=>x.value===currentHelp)) sel.value=currentHelp;
      else sel.value='';
    }

    // Sécurité supplémentaire si une autre extension tente de remettre une équipe.
    const allowed=new Set(wanted.map(x=>x.value));
    if(!allowed.has(sel.value)){
      sel.value=currentHelp && allowed.has(currentHelp) ? currentHelp : '';
      if(typeof renderHouses==='function') renderHouses();
    }
  }

  document.addEventListener('change',e=>{
    if(e.target?.id!=='teamView' || privileged()) return;
    const allowed=new Set(['', '__shared__']);
    if(helpTeam) allowed.add(helpTeam);
    if(!allowed.has(e.target.value)){
      e.target.value=helpTeam || '';
      if(typeof toast==='function') toast("Active d'abord 🤝 Aider pour accéder à une autre tournée");
      if(typeof renderHouses==='function') renderHouses();
    }
  },true);

  // Après activation / arrêt du mode aide, loadAll() reconstruit le sélecteur.
  // On le remet immédiatement dans l'état autorisé.
  setInterval(()=>{
    if(!me) return;
    if(lastHelp !== helpTeam){
      lastHelp=helpTeam;
      setTimeout(rebuild,0);
      setTimeout(rebuild,250);
      setTimeout(rebuild,800);
    } else {
      rebuild();
    }
  },400);

  document.addEventListener('DOMContentLoaded',()=>setTimeout(rebuild,500));
})();
