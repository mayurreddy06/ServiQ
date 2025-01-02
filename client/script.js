// Initialize Mapbox with your access token
const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
// Set the Mapbox access token
mapboxgl.accessToken = ACCESS_TOKEN; 

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // ID of the container
    style: 'mapbox://styles/mapbox/streets-v11', // Map style
    center: [-74.006, 40.7128], // Initial center [longitude, latitude]
    zoom: 12 // Initial zoom level
});

// Add Navigation Controls
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// Add Fullscreen Control
map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

// Add Geocoder (Search Bar)
const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: 'Search for places...', // Placeholder text in the search bar
});

// Append Geocoder to the map and position it in the top-left
document.getElementById('map').appendChild(geocoder.onAdd(map));

// Handle Search Bar Results
geocoder.on('result', (event) => {
    console.log('Search result:', event.result);
    // Additional actions (like adding markers) can be added here
});

// Add a Marker for Initial Map Center
const marker = new mapboxgl.Marker()
    .setLngLat([-74.006, 40.7128]) // Longitude, Latitude
    .addTo(map);

// Event Listener for Map Click
map.on('click', (event) => {
    const { lng, lat } = event.lngLat;
    console.log(`Clicked coordinates: Longitude: ${lng}, Latitude: ${lat}`);
});
