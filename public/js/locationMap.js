(function () {
  const mapElement = document.getElementById('locations-map');
  if (!mapElement || typeof L === 'undefined') return;

  const rawLocations = Array.isArray(window.locationMapData) ? window.locationMapData : [];
  const locations = rawLocations.filter((location) => typeof location.latitude === 'number' && typeof location.longitude === 'number');

  const defaultCenter = [40.7128, -74.006];
  const map = L.map('locations-map').setView(defaultCenter, 11);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  if (!locations.length) return;

  const bounds = [];

  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    const latLng = [location.latitude, location.longitude];
    bounds.push(latLng);

    let popup = '<strong>' + escapeHtml(location.locationName || 'Unknown location') + '</strong>';
    if (location.locationType) popup += '<br>' + escapeHtml(location.locationType);
    if (location.address) popup += '<br>' + escapeHtml(location.address);

    L.marker(latLng).addTo(map).bindPopup(popup);
  }

  if (bounds.length === 1) {
    map.setView(bounds[0], 14);
  } else {
    map.fitBounds(bounds, {padding: [30, 30]});
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}());
