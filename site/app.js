// BEHAVIOUR: what happens on the page. Runs top to bottom when the page loads.
const map = L.map('map', { preferCanvas: true }).setView([45.53, -73.65], 11);   // [latitude, longitude]: Montreal

// Road colours by pavement condition.
const colours = {
  Excellent: '#1a9850',
  Bon: '#91cf60',
  Moyen: '#e6ab02',
  Mauvais: '#fc8d59',
  'Très mauvais': '#d73027'
};

// Base map: OpenStreetMap. It needs the page served by Live Server, which is how
// this lab opens it. A page opened by double-click gets "Access blocked" tiles.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

fetch('../data/pavement_2024.geojson')
  .then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status + ' loading pavement_2024.geojson'); }
    return response.json();
  })
  .then(function (data) {
    const conditionLayers = {};
    const conditionCounts = {};

    // Create a separate road layer for each condition, visible by default.
    Object.keys(colours).forEach(function (condition) {
      conditionLayers[condition] = L.geoJSON(data, {
        filter: function (feature) {
          return feature.properties.Etat_PCI === condition;
        },
        style: function (feature) {
          return {
            color: colours[feature.properties.Etat_PCI],
            weight: 4,
            opacity: 0.85
          };
        },
        onEachFeature: function (feature, layer) {
          const p = feature.properties;
          layer.bindPopup(
            '<strong>' + p.Rue + '</strong><br>' +
            'Borough: ' + p.Arrondissement + '<br>' +
            'PCI: ' + p.Indice_PCI + '<br>' +
            'Condition: ' + p.Etat_PCI
          );
        }
      }).addTo(map);
      conditionCounts[condition] = conditionLayers[condition].getLayers().length;
    });

    // Overlay checkboxes toggle each condition independently.
    L.control.layers(null, conditionLayers, { position: 'topright' }).addTo(map);

    const roads = L.featureGroup(Object.values(conditionLayers));
    map.fitBounds(roads.getBounds());

    // Sum cached counts for the condition layers currently on the map.
    function updateStatus() {
      let shown = 0;
      Object.keys(conditionLayers).forEach(function (condition) {
        if (map.hasLayer(conditionLayers[condition])) {
          shown += conditionCounts[condition];
        }
      });
      document.getElementById('status').textContent =
        shown.toLocaleString('en-CA') + ' road segments shown';
    }

    map.on('overlayadd overlayremove', updateStatus);
    updateStatus();
  })
  .catch(function (err) {
    document.getElementById('status').textContent =
      'Could not load pavement_2024.geojson. Open the console (F12) for details.';
    console.error(err);
  });
