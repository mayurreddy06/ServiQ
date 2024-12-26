// Include Mapbox and Geocoder libraries in your HTML
const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // HTML container ID
  style: 'mapbox://styles/mapbox/streets-v11', // Map style
  center: [-82.9988, 39.9612], // Starting position [longitude, latitude]
  zoom: 12 // Starting zoom level
});

// Add navigation controls
map.addControl(new mapboxgl.NavigationControl());

// Add fullscreen control
map.addControl(new mapboxgl.FullscreenControl());

// Add search box using Mapbox Geocoder
map.addControl(
  new MapboxGeocoder({
    accessToken: ACCESS_TOKEN,
    mapboxgl: mapboxgl,
    placeholder: 'Search for places',
    proximity: { longitude: -82.9988, latitude: 39.9612 }
  })
);

// Handle discount dropdown change
document.getElementById('select-discount').addEventListener('change', function () {
  const textbox = document.getElementById('discount');
  if (this.value === 'q1') {
    textbox.disabled = false; // Enable the text box
    textbox.classList.remove('disabled'); // Remove grayed-out style
  } else {
    textbox.disabled = true; // Disable the text box
    textbox.classList.add('disabled'); // Add grayed-out style
  }
});