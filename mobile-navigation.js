/* Amicale SP Volvic — navigation/localisation iPhone + Android v1 */
(function () {
  function showMessage(msg) {
    try { if (typeof toast === 'function') return toast(msg); } catch (_) {}
    alert(msg);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function currentHouse(id) {
    try { return (households || []).find(h => h.id === id); } catch (_) { return null; }
  }

  // "M'y rendre" : Apple Plans sur iPhone/iPad, application de cartographie Android via geo:
  window.navigateTo = function (id) {
    const h = currentHouse(id);
    if (!h) return showMessage('Adresse introuvable');

    const hasCoords = h.latitude != null && h.longitude != null &&
                      h.latitude !== '' && h.longitude !== '';

    if (isAndroid()) {
      if (hasCoords) {
        const lat = Number(h.latitude), lng = Number(h.longitude);
        location.href = `geo:${lat},${lng}?q=${lat},${lng}`;
      } else {
        const address = [h.house_number, h.street, h.postal_code, h.city_name || h.locality]
          .filter(Boolean).join(' ');
        location.href = `geo:0,0?q=${encodeURIComponent(address)}`;
      }
      return;
    }

    if (hasCoords) {
      location.href = `https://maps.apple.com/?daddr=${encodeURIComponent(h.latitude)},${encodeURIComponent(h.longitude)}`;
    } else {
      const address = [h.house_number, h.street, h.postal_code, h.city_name || h.locality]
        .filter(Boolean).join(' ');
      location.href = `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
    }
  };

  function locateUser() {
    if (!navigator.geolocation) {
      return showMessage('La localisation n’est pas disponible sur ce téléphone.');
    }
    if (!window.map) {
      try { if (typeof renderMap === 'function') renderMap(); } catch (_) {}
    }

    showMessage('Recherche de votre position…');

    navigator.geolocation.getCurrentPosition(
      function (p) {
        const lat = p.coords.latitude, lng = p.coords.longitude;
        try {
          map.setView([lat, lng], 17);
          if (window.__tcUserMarker) {
            try { map.removeLayer(window.__tcUserMarker); } catch (_) {}
          }
          window.__tcUserMarker = L.circleMarker([lat, lng], {
            radius: 9,
            weight: 3,
            fillOpacity: 0.75
          }).addTo(map).bindPopup('Vous êtes ici').openPopup();
        } catch (_) {
          showMessage('Position trouvée, mais la carte n’est pas encore prête.');
        }
      },
      function (err) {
        if (err && err.code === 1) {
          showMessage('Localisation refusée. Autorisez la position pour cette application dans les réglages du téléphone.');
        } else if (err && err.code === 2) {
          showMessage('Position impossible à déterminer. Vérifiez que la localisation du téléphone est activée.');
        } else if (err && err.code === 3) {
          showMessage('La recherche de position a pris trop de temps. Réessayez.');
        } else {
          showMessage('Localisation non disponible.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }
    );
  }

  function install() {
    const btn = document.getElementById('nearMe');
    if (btn) btn.onclick = locateUser;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
