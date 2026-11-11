// BEHAVIOUR: A3 pavement + truck-regulation analysis.

const map = L.map('map', { preferCanvas: true })
  .setView([45.53, -73.65], 11);

// Pavement colours.
const colours = {
  Excellent: '#1a9850',
  Bon: '#91cf60',
  Moyen: '#e6ab02',
  Mauvais: '#fc8d59',
  'Tr\u00e8s mauvais': '#d73027'
};

// Fixed rendering priority.
// Worse pavement always draws above better pavement.
const panes = {
  Excellent: 'pciExcellent',
  Bon: 'pciBon',
  Moyen: 'pciMoyen',
  Mauvais: 'pciMauvais',
  'Tr\u00e8s mauvais': 'pciTresMauvais'
};

const zIndexes = {
  Excellent: 410,
  Bon: 420,
  Moyen: 430,
  Mauvais: 440,
  'Tr\u00e8s mauvais': 450
};

Object.keys(panes).forEach(function (condition) {
  map.createPane(panes[condition]);
  map.getPane(panes[condition]).style.zIndex = zIndexes[condition];
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

fetch('../data/pavement_2024_a3.geojson')
  .then(function (response) {
    if (!response.ok) {
      throw new Error(
        'HTTP ' + response.status + ' loading pavement_2024_a3.geojson'
      );
    }

    return response.json();
  })

  .then(function (data) {

    // One persistent layer group for each pavement condition.
    const conditionLayers = {};

    Object.keys(colours).forEach(function (condition) {
      conditionLayers[condition] = L.layerGroup().addTo(map);
    });

    // Layer-control labels with colour swatches.
    const overlays = {};

    Object.keys(colours).forEach(function (condition) {
      const label =
        '<span style="display:inline-block;width:12px;height:12px;' +
        'background:' + colours[condition] +
        ';margin-right:6px;border:1px solid #555;"></span>' +
        condition;

      overlays[label] = conditionLayers[condition];
    });

    L.control.layers(null, overlays, {
      position: 'topright'
    }).addTo(map);

    // Truck filter control.
    const TruckControl = L.Control.extend({
      options: {
        position: 'topleft'
      },

      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar');

        container.style.background = 'white';
        container.style.padding = '10px';
        container.style.width = '245px';
        container.style.fontSize = '13px';
        container.style.lineHeight = '1.4';

        container.innerHTML =
          '<strong>Truck regulation</strong><br>' +
          '<select id="truck-filter" style="width:100%;margin-top:5px;">' +
          '<option value="all">All arterial roads</option>' +
          '<option value="1">Class 1 — Permitted at all times</option>' +
          '<option value="2">Class 2 — Daytime only (07:00–19:00)</option>' +
          '<option value="3">Class 3 — Local delivery only</option>' +
          '<option value="none">No matching regulation</option>' +
          '</select>' +
          '<div id="truck-stats" style="margin-top:8px;"></div>';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      }
    });

    map.addControl(new TruckControl());

    const truckFilter = document.getElementById('truck-filter');
    const truckStats = document.getElementById('truck-stats');

    function matchesTruckFilter(feature, selected) {
      const p = feature.properties;

      if (selected === 'all') {
        return true;
      }

      if (selected === 'none') {
        return p.truck_class === null ||
               p.truck_class === undefined;
      }

      return Number(p.truck_class) === Number(selected);
    }

    function popupText(feature) {
      const p = feature.properties;

      return (
        '<strong>' + p.Rue + '</strong><br>' +
        'Borough: ' + p.Arrondissement + '<br>' +
        'PCI: ' + p.Indice_PCI + '<br>' +
        'Condition: ' + p.Etat_PCI + '<br>' +
        'Truck regulation: ' + p.truck_regulation
      );
    }

    // Rebuild pavement groups whenever the truck filter changes.
    function drawSelectedRoads() {
      const selected = truckFilter.value;

      Object.keys(conditionLayers).forEach(function (condition) {
        conditionLayers[condition].clearLayers();
      });

      data.features.forEach(function (feature) {
        if (!matchesTruckFilter(feature, selected)) {
          return;
        }

        const condition = feature.properties.Etat_PCI;

        if (!conditionLayers[condition]) {
          return;
        }

        L.geoJSON(feature, {
          style: function () {
            return {
              color: colours[condition],
              weight: 4,
              opacity: 0.85,
              pane: panes[condition]
            };
          },

          onEachFeature: function (f, layer) {
            layer.bindPopup(popupText(f));
          }
        }).addTo(conditionLayers[condition]);
      });

      updateTruckStats();
      updateStatus();
    }

    function updateTruckStats() {
      const selected = truckFilter.value;

      const selectedFeatures = data.features.filter(function (feature) {
        return matchesTruckFilter(feature, selected);
      });

      const pciValues = selectedFeatures
        .map(function (feature) {
          return Number(feature.properties.Indice_PCI);
        })
        .filter(function (value) {
          return Number.isFinite(value);
        });

      const averagePCI =
        pciValues.length > 0
          ? pciValues.reduce(function (sum, value) {
              return sum + value;
            }, 0) / pciValues.length
          : null;

      const poorCount = selectedFeatures.filter(function (feature) {
        const condition = feature.properties.Etat_PCI;

        return condition === 'Mauvais' ||
               condition === 'Tr\u00e8s mauvais';
      }).length;

      const poorPercent =
        selectedFeatures.length > 0
          ? (poorCount / selectedFeatures.length) * 100
          : 0;

      truckStats.innerHTML =
        '<strong>' +
        selectedFeatures.length.toLocaleString('en-CA') +
        '</strong> segments<br>' +

        'Average PCI: <strong>' +
        (averagePCI === null ? 'N/A' : averagePCI.toFixed(1)) +
        '</strong><br>' +

        'Poor / very poor: <strong>' +
        poorPercent.toFixed(1) +
        '%</strong>';
    }

    // Count only pavement condition groups currently visible.
    function updateStatus() {
      let shown = 0;

      Object.keys(conditionLayers).forEach(function (condition) {
        if (map.hasLayer(conditionLayers[condition])) {
          shown += conditionLayers[condition].getLayers().length;
        }
      });

      document.getElementById('status').textContent =
        shown.toLocaleString('en-CA') +
        ' road segments shown';
    }

    truckFilter.addEventListener('change', drawSelectedRoads);

    map.on('overlayadd overlayremove', function () {
      updateStatus();
    });

    // Fit to the complete 2024 pavement network once.
    const allRoads = L.geoJSON(data);
    map.fitBounds(allRoads.getBounds());

    drawSelectedRoads();
  })

  .catch(function (err) {
    document.getElementById('status').textContent =
      'Could not load pavement_2024_a3.geojson. Open the console (F12) for details.';

    console.error(err);
  });