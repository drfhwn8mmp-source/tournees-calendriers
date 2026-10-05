/* Diagnostic chargement adresses V1 — Amicale SP Volvic
   Lecture seule : ne modifie aucune donnée.
*/
(function(){
  const E=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function install(){
    const admin=E('page-admin');
    if(!admin || E('addressLoadDiagnostic')) return;
    const card=document.createElement('div');
    card.className='card';
    card.id='addressLoadDiagnostic';
    card.innerHTML=
      '<div class="sectionTitle">🩺 Diagnostic chargement des adresses</div>'+
      '<p class="muted">Lecture seule. Compare ce que la base contient avec ce que l’application a réellement chargé dans le navigateur.</p>'+
      '<button class="btn" id="runAddressLoadDiagnostic">Contrôler maintenant</button>'+
      '<div id="addressLoadDiagnosticResult" style="margin-top:12px"></div>';
    admin.insertBefore(card, admin.firstChild?.nextSibling || null);
    E('runAddressLoadDiagnostic').onclick=run;
  }

  function isReal(h){ return h && h.active!==false && h.is_test!==true; }
  function hasGps(h){ return Number.isFinite(+h.latitude) && Number.isFinite(+h.longitude); }

  function localBreakdown(list){
    const rows=[];
    const real=list.filter(isReal);
    (teams||[]).filter(t=>t.active!==false).forEach(t=>{
      const n=real.filter(h=>typeof teamForHouse==='function' && teamForHouse(h)===t.id).length;
      rows.push([t.name,n]);
    });
    const sharedSectorIds=new Set(
      (sectors||[]).filter(s=>{
        const c=(cities||[]).find(x=>x.id===s.city_id);
        return c?.shared_round===true;
      }).map(s=>s.id)
    );
    rows.push(['Tournée commune',real.filter(h=>sharedSectorIds.has(h.sector_id)).length]);
    return rows;
  }

  async function countBase(extra){
    let q=sb.from('households').select('*',{count:'exact',head:true}).eq('active',true).eq('is_test',false);
    if(extra) q=extra(q);
    const {count,error}=await q;
    if(error) throw error;
    return count||0;
  }

  async function run(){
    const out=E('addressLoadDiagnosticResult');
    out.innerHTML='⏳ Contrôle en cours…';
    try{
      const local=Array.isArray(households)?households:[];
      const localReal=local.filter(isReal);
      const [dbReal,dbGps]=await Promise.all([
        countBase(),
        countBase(q=>q.not('latitude','is',null).not('longitude','is',null))
      ]);
      const localGps=localReal.filter(hasGps).length;
      const missing=Math.max(0,dbReal-localReal.length);
      const ok=missing===0;
      const breakdown=localBreakdown(local);
      out.innerHTML=
        '<div class="grid g2">'+
          '<div class="stat"><b>'+dbReal+'</b>Dans Supabase</div>'+
          '<div class="stat"><b>'+localReal.length+'</b>Chargées dans l’app</div>'+
          '<div class="stat"><b>'+dbGps+'</b>Avec GPS en base</div>'+
          '<div class="stat"><b>'+localGps+'</b>Avec GPS chargées</div>'+
        '</div>'+
        '<div style="margin-top:12px;padding:12px;border-radius:12px;background:'+(ok?'#ecfdf5':'#fff7ed')+'">'+
          (ok
            ? '✅ <b>Le navigateur a chargé toutes les adresses réelles présentes dans la base.</b>'
            : '⚠️ <b>'+missing+' adresse(s) présente(s) dans la base ne sont pas chargées dans l’application.</b>')+
        '</div>'+
        '<div class="sectionTitle" style="margin-top:14px">Répartition réellement chargée</div>'+
        breakdown.map(([name,n])=>'<div class="row"><span>'+esc(name)+'</span><b style="text-align:right">'+n+'</b></div>').join('')+
        '<p class="muted" style="margin-top:10px">Ce diagnostic ne crée, ne supprime et ne modifie aucune adresse.</p>';
    }catch(e){
      out.innerHTML='<div class="warn">Diagnostic impossible : '+esc(e.message||String(e))+'</div>';
    }
  }

  const timer=setInterval(()=>{
    if(typeof sb!=='undefined' && typeof households!=='undefined'){
      clearInterval(timer); install();
    }
  },200);
  setTimeout(()=>{clearInterval(timer);install()},5000);
})();