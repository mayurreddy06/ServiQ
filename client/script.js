// Existing map initialization and interaction code
const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-82.9988, 39.9612],
  zoom: 12
});

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

// Handle form submission
async function sendDiscount(event) {
  event.preventDefault(); // Prevent page reload on form submission

  // Get form values
  const storeName = document.getElementById('autocomplete').value;
  const discountAmount = parseInt(document.getElementById('discount').value, 10);
  const coordinatesText = document.getElementById('coordinates').innerText;
  
  // Extract latitude and longitude from the displayed coordinates
  const [lat, lng] = coordinatesText.match(/-?\d+\.\d+/g).map(Number);

  const discountData = { storeName, discountAmount, lat, lng };

  try {
    const response = await fetch('/add-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discountData)
    });

    if (response.ok) {
      console.log('Discount added successfully');
    } else {
      console.error('Failed to add discount:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Attach the form submission handler
document.querySelector('form').addEventListener('submit', sendDiscount);
