// Existing map initialization and interaction code
const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-82.9988, 39.9612],
  zoom: 12
});

async function fetchAndDisplayMarkers() {
  try {
    const response = await fetch('/get-discounts'); // Fetch data from the server
    if (!response.ok) {
      console.error('Failed to fetch discounts:', await response.text());
      return;
    }

    const discounts = await response.json();
    for (const key in discounts) {
      const { storeName, discountAmount, location } = discounts[key];
      const { lat, lng } = location;

      // Add marker for each discount
      new mapboxgl.Marker()
        .setLngLat([lng, lat]) // Set marker position
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <h3>${storeName}</h3>
            <p>Discount: ${discountAmount}%</p>
          `)
        ) // Add a popup
        .addTo(map); // Add the marker to the map
    }
  } catch (error) {
    console.error('Error fetching or displaying markers:', error);
  }
}

// Call the function when the map loads
map.on('load', fetchAndDisplayMarkers);

map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());
map.addControl(
  new MapboxGeocoder({
    accessToken: ACCESS_TOKEN,
    mapboxgl: mapboxgl,
    placeholder: 'Search for places',
    proximity: { longitude: -82.9988, latitude: 39.9612 }
  })
);

async function sendDiscount(event) {
  event.preventDefault();

  const storeName = document.getElementById('autocomplete').value;
  const discountAmount = document.getElementById('discount').value; // Keep as text
  const coordinatesText = document.getElementById('coordinates').innerText;
  const [lat, lng] = coordinatesText.match(/-?\d+\.\d+/g).map(Number);
  const timestamp = Date.now(); // Current time in milliseconds

  const discountData = { storeName, discountAmount, lat, lng, timestamp };

  try {
    const response = await fetch('/add-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discountData),
    });

    if (response.ok) {
      console.log('Discount added successfully');
      fetchAndDisplayMarkers(); // Refresh markers
    } else {
      console.error('Failed to add discount:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Attach the form submission handler
document.querySelector('form').addEventListener('submit', sendDiscount);
