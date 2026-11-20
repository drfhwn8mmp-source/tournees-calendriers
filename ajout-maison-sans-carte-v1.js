/* Volvic : ajout d'adresse sans sélection sur la carte */
(function(){'use strict';
function activate(){
 const old=document.getElementById('volvicAddAddressPanel');if(old)old.style.display='none';
 const btn=document.getElementById('addHere');if(!btn||btn.dataset.volvicFormReady)return;
 btn.dataset.volvicFormReady='1';btn.textContent='＋ Ajouter une maison';
 btn.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();
  const add=document.getElementById('volvicAddHouse');if(!add){alert('Formulaire indisponible. Recharge l’application.');return}
  if(typeof page==='function')page('tour');add.click();setTimeout(()=>document.getElementById('vhStreet')?.focus(),150);
 },true);
}
document.addEventListener('DOMContentLoaded',activate);setInterval(activate,1500);
})();
