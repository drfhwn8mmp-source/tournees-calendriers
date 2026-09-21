(function(){
function q(v){return '"'+String(v??'').replace(/"/g,'""')+'"'}
function rows(){
 return [...document.querySelectorAll('#auditResults .house')].map(card=>{
  const a=card.querySelector('b')?.textContent?.trim()||'';
  const t=[...card.querySelectorAll('.muted')].map(x=>x.textContent.trim());
  return {adresse:a,details:t.join(' | ')};
 }).filter(x=>x.adresse&&x.adresse!=='Voie détectée');
}
function exp(){
 const r=rows(); if(!r.length){toast('Aucun candidat affiché à exporter');return}
 const csv='\ufeffstatut;adresse;details\n'+r.map(x=>q('CANDIDAT')+';'+q(x.adresse)+';'+q(x.details)).join('\n');
 const b=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');
 a.href=u;a.download='controle-adresses-moulet-marcenat.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);
 toast(r.length+' adresses affichées exportées');
}
function install(){
 const t=document.getElementById('auditTools');if(!t)return;
 let b=document.getElementById('auditExportFinal');
 if(!b){b=document.createElement('button');b.className='btn alt';b.id='auditExportFinal';b.style.marginTop='8px';b.textContent='📋 Exporter le rapport final';t.appendChild(b)}
 b.onclick=exp;
}
new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});setTimeout(install,0);
})();