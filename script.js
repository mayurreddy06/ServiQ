// Replace 'YOUR_MAPBOX_API_KEY' with your actual API key
const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // HTML container ID
  style: 'mapbox://styles/mapbox/streets-v11', // Map style
  center: [-82.9988, 39.9612], // Starting position [longitude, latitude]
  zoom: 12 // Starting zoom level
});

window.addEventListener('load', () => {
  const searchBox = new MapboxSearchBox();
  searchBox.accessToken = ACCESS_TOKEN;
  searchBox.options = {
      types: 'address,poi',
      proximity: [-82.9988, 39.9612]
  };
  searchBox.marker = true;
  searchBox.mapboxgl = mapboxgl;
  map.addControl(searchBox);
});

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

// Adding navigation controls to the map
map.addControl(new mapboxgl.NavigationControl());

//Adding fullscreen option to the map
map.addControl(new mapboxgl.FullscreenControl());
