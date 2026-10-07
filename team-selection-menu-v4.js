/* Menu équipes V5 — aide active = équipe aidée forcée */
(function(){
  function ready(){try{return !!me&&Array.isArray(teams)&&Array.isArray(cities)}catch(e){return false}}
  function isAdmin(){return ready()&&me.role==='admin'}
  function allowedOptions(){
    const out=[{value:'',text:'Mon équipe / mes secteurs'}];
    if(helpTeam){
      const t=teams.find(x=>x.id===helpTeam);
      if(t)out.push({value:t.id,text:'🤝 Aide — '+t.name});
    }
    if(cities.some(c=>c.shared_round===true))out.push({value:'__shared__',text:'👥 Moulet-Marcenat — tournée commune'});
    return out;
  }
  function lockMenu(){
    if(!ready()||isAdmin())return;
    const sel=document.getElementById('teamView');if(!sel)return;
    const opts=allowedOptions();
    const expected=opts.map(o=>o.value+'|'+o.text).join('||');
    const current=[...sel.options].map(o=>o.value+'|'+o.textContent).join('||');

    if(current!==expected){
      sel.innerHTML=opts.map(o=>`<option value="${o.value}">${o.text}</option>`).join('');
    }

    /* CORRECTION V5 :
       si le mode aide est actif, on ne conserve PLUS "Mon équipe".
       On force réellement le filtre sur l'équipe aidée. */
    const wanted=helpTeam||'';
    if(sel.value!==wanted){
      sel.value=wanted;
      const sector=document.getElementById('sectorSelect');
      if(helpTeam&&sector)sector.value='';
      if(typeof window.renderHouses==='function')window.renderHouses();
      else if(typeof renderHouses==='function')renderHouses();
      try{window.renderMap?.()}catch(_){}
    }
  }
  function observe(){
    const sel=document.getElementById('teamView');
    if(!sel||sel.dataset.menuV5Observed)return;
    sel.dataset.menuV5Observed='1';
    new MutationObserver(()=>setTimeout(lockMenu,0)).observe(sel,{childList:true,subtree:true});
  }
  setInterval(()=>{observe();lockMenu()},200);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(lockMenu,0)});
  window.addEventListener('pageshow',()=>setTimeout(lockMenu,0));
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#helpBtn,[data-page="tour"]')){
      setTimeout(lockMenu,0);setTimeout(lockMenu,100);setTimeout(lockMenu,300);setTimeout(lockMenu,700);
    }
  });
})();