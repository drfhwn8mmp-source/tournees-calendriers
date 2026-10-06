/* Écran récupération mot de passe V2
   Masque complètement l'application derrière l'écran de nouveau mot de passe.
   Aucun changement Supabase, carte ou données.
*/
(function(){
  const HIDE_IDS = ['app','tabs'];

  function resetPanelVisible(){
    const p=document.getElementById('passwordResetPanel');
    return !!p && !p.classList.contains('hidden');
  }

  function apply(){
    const active=resetPanelVisible();
    document.body.classList.toggle('password-reset-mode',active);
    HIDE_IDS.forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      if(active) el.classList.add('password-reset-background-hidden');
      else el.classList.remove('password-reset-background-hidden');
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    body.password-reset-mode #app,
    body.password-reset-mode #tabs,
    .password-reset-background-hidden{display:none!important}
    body.password-reset-mode #passwordResetPanel{display:block!important}
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded',()=>{
    const p=document.getElementById('passwordResetPanel');
    if(p)new MutationObserver(apply).observe(p,{attributes:true,attributeFilter:['class']});
    apply();
  });

  // Les changements d'état Auth peuvent intervenir après DOMContentLoaded.
  setInterval(apply,250);
})();
