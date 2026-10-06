/* Menu équipes V4 — correction de portée JavaScript */
(function(){
  function ready(){ try{return !!me&&Array.isArray(teams)&&Array.isArray(cities)}catch(e){return false} }
  function isAdmin(){return ready()&&me.role==='admin'}
  function allowedOptions(){
    const out=[{value:'',text:'Mon équipe / mes secteurs'}];
    if(helpTeam){const t=teams.find(x=>x.id===helpTeam);if(t)out.push({value:t.id,text:'🤝 Aide — '+t.name})}
    if(cities.some(c=>c.shared_round===true))out.push({value:'__shared__',text:'👥 Moulet-Marcenat — tournée commune'});
    return out;
  }
  function lockMenu(){
    if(!ready()||isAdmin())return;
    const sel=document.getElementById('teamView');if(!sel)return;
    const opts=allowedOptions(), allowed=new Set(opts.map(o=>o.value)), old=sel.value;
    const expected=opts.map(o=>o.value+'|'+o.text).join('||');
    const current=[...sel.options].map(o=>o.value+'|'+o.textContent).join('||');
    if(current!==expected){
      sel.innerHTML=opts.map(o=>`<option value="${o.value}">${o.text}</option>`).join('');
      sel.value=allowed.has(old)?old:(helpTeam&&allowed.has(helpTeam)?helpTeam:'');
      if(typeof renderHouses==='function')renderHouses();
    }else if(!allowed.has(sel.value)){
      sel.value=helpTeam&&allowed.has(helpTeam)?helpTeam:'';
      if(typeof renderHouses==='function')renderHouses();
    }
  }
  function observe(){
    const sel=document.getElementById('teamView');if(!sel||sel.dataset.menuV4Observed)return;
    sel.dataset.menuV4Observed='1';
    new MutationObserver(()=>setTimeout(lockMenu,0)).observe(sel,{childList:true,subtree:true});
  }
  setInterval(()=>{observe();lockMenu()},200);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(lockMenu,0)});
  window.addEventListener('pageshow',()=>setTimeout(lockMenu,0));
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#helpBtn,[data-page="tour"]')){
      setTimeout(lockMenu,0);setTimeout(lockMenu,250);setTimeout(lockMenu,700);
    }
  });
})();