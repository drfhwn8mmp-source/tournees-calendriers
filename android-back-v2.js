/* Amicale SP Volvic — Retour Android V2 */
(function(){
 if(!/Android/i.test(navigator.userAgent||''))return;
 const allowed=new Set(['home','tour','map','admin','settings']), KEY='tc_android_pages';
 let internal=false;
 function cur(){return [...allowed].find(n=>{const e=document.getElementById('page-'+n);return e&&!e.classList.contains('hidden')})||'home'}
 function read(){try{return JSON.parse(sessionStorage.getItem(KEY)||'[]')}catch(_){return []}}
 function write(a){sessionStorage.setItem(KEY,JSON.stringify(a.slice(-10)))}
 function visible(e){
   if(!e)return false;
   const s=getComputedStyle(e);
   return s.display!=='none'&&s.visibility!=='hidden'&&!e.classList.contains('hidden');
 }
 function closeOpen(){
  const conflict=document.getElementById('offlineConflictPanel');
  if(visible(conflict)){conflict.style.display='none';return true}
  const closed=document.getElementById('closedOfflinePanel');
  if(visible(closed)){closed.style.display='none';return true}
  const m=document.getElementById('mapDoneOfflineV2');
  if(visible(m)){m.style.display='none';return true}
  const d=document.getElementById('endDayPanel');
  if(visible(d)){d.classList.add('hidden');return true}
  return false;
 }
 function remember(n){
  if(!allowed.has(n)||internal)return;
  const a=read();if(a[a.length-1]!==n){a.push(n);write(a);history.pushState({tc:n},'',location.href)}
 }
 document.addEventListener('click',e=>{
  const t=e.target.closest?.('[data-page]');
  if(t?.dataset.page)setTimeout(()=>remember(t.dataset.page),0);
  else if(e.target.closest?.('.bigstart'))setTimeout(()=>remember('tour'),0);
 },true);
 addEventListener('popstate',()=>{
  if(closeOpen()){history.pushState({tc:cur()},'',location.href);return}
  let a=read(),here=cur();while(a.length&&a[a.length-1]===here)a.pop();
  const target=a.pop()||'home';write(a);internal=true;
  try{localStorage.setItem('tc_last_page',target);window.page?.(target)}finally{setTimeout(()=>internal=false,50)}
  history.pushState({tc:target},'',location.href);
 });
 addEventListener('load',()=>{const p=cur();write([p]);history.replaceState({tc:p},'',location.href);history.pushState({tc:p},'',location.href)},{once:true});
})();