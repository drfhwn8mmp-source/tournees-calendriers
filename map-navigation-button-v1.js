/* Amicale SP Volvic — bouton "M'y rendre" dans les popups carte V1 */
(function () {
  function addButtonToPopup(popup) {
    const root = popup?.getElement?.();
    if (!root || root.querySelector('.tc-map-navigate')) return;
    const source = popup._source;
    const id = source?.__houseId;
    if (!id) return;
    const content = root.querySelector('.leaflet-popup-content');
    if (!content) return;
    const wrap = document.createElement('div');
    wrap.style.marginTop = '10px';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tc-map-navigate';
    btn.textContent = "🧭 M'y rendre";
    btn.style.cssText = 'width:100%;min-height:44px;font-weight:700';
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (typeof window.navigateTo === 'function') window.navigateTo(id);
      else { try { toast("Navigation indisponible"); } catch (_) {} }
    });
    wrap.appendChild(btn); content.appendChild(wrap);
  }
  function install() {
    try {
      if (!map || typeof map.on !== 'function') return setTimeout(install, 400);
      if (map.__tcNavigateButtonInstalled) return;
      map.__tcNavigateButtonInstalled = true;
      map.on('popupopen', function (e) { addButtonToPopup(e.popup); });
    } catch (_) { setTimeout(install, 400); }
  }
  setTimeout(install, 1000);
})();

/* Recherche d'adresse sur la carte — intégrée au fichier déjà chargé */
(function(){
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const label=h=>[h.house_number,h.street,h.locality].filter(Boolean).join(' ');
 const searchable=h=>norm([h.house_number,h.street,h.locality,h.notes,h.comment].filter(Boolean).join(' '));
 const eligible=h=>h&&h.active!==false&&h.is_visitable!==false&&h.latitude&&h.longitude;

 function addSearch(){
   const mapEl=document.getElementById('map');
   if(!mapEl || document.getElementById('mapAddressSearch')) return;
   const wrap=document.createElement('div');
   wrap.id='mapAddressSearchWrap';
   wrap.style.cssText='margin:0 0 10px;position:relative';
   wrap.innerHTML='<input id="mapAddressSearch" type="search" autocomplete="off" placeholder="🔎 Rechercher rue, numéro ou village" style="width:100%;padding:12px;border:1px solid #d6dae0;border-radius:11px;background:#fff"><div id="mapAddressResults" style="display:none;position:absolute;left:0;right:0;top:48px;z-index:1000;background:#fff;border:1px solid #d6dae0;border-radius:11px;max-height:260px;overflow:auto;box-shadow:0 6px 18px #0002"></div>';
   mapEl.parentNode.insertBefore(wrap,mapEl);
   const input=document.getElementById('mapAddressSearch'), results=document.getElementById('mapAddressResults');
   const hide=()=>{results.style.display='none';results.innerHTML='';};

   function showMatches(){
     const q=norm(input.value);
     if(q.length<2){hide();return;}
     const found=(households||[]).filter(eligible).filter(h=>searchable(h).includes(q)).slice(0,30);
     if(!found.length){results.innerHTML='<div style="padding:12px" class="muted">Aucune adresse trouvée</div>';results.style.display='block';return;}
     results.innerHTML=found.map(h=>'<button type="button" data-map-house="'+h.id+'" style="display:block;width:100%;border:0;border-bottom:1px solid #eee;background:#fff;text-align:left;padding:11px 12px"><b>'+label(h)+'</b></button>').join('');
     results.style.display='block';
     results.querySelectorAll('[data-map-house]').forEach(b=>{
       b.onclick=()=>{
         const h=(households||[]).find(x=>x.id===b.dataset.mapHouse);
         if(!h)return;
         input.value=label(h); hide();
         try{
           map.setView([+h.latitude,+h.longitude],18);
           setTimeout(()=>{
             try{
               window.renderMap?.();
               setTimeout(()=>{
                 const marker=(markers||[]).find(m=>m.__houseId===h.id);
                 if(marker){marker.openPopup();map.panTo(marker.getLatLng());}
               },200);
             }catch(_){}
           },150);
         }catch(_){}
       };
     });
   }
   input.addEventListener('input',showMatches);
   input.addEventListener('focus',showMatches);
   document.addEventListener('click',e=>{if(!wrap.contains(e.target))hide();});
 }
 [300,800,1600].forEach(ms=>setTimeout(addSearch,ms));
})();
