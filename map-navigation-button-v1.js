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
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.navigateTo === 'function') {
        window.navigateTo(id);
      } else {
        try { toast("Navigation indisponible"); } catch (_) {}
      }
    });

    wrap.appendChild(btn);
    content.appendChild(wrap);
  }

  function install() {
    try {
      if (!map || typeof map.on !== 'function') return setTimeout(install, 400);
      if (map.__tcNavigateButtonInstalled) return;
      map.__tcNavigateButtonInstalled = true;

      map.on('popupopen', function (e) {
        addButtonToPopup(e.popup);
      });
    } catch (_) {
      setTimeout(install, 400);
    }
  }

  setTimeout(install, 1000);
})();
