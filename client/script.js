// Existing map initialization and interaction code
const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-82.9988, 39.9612],
  zoom: 12,
});

// Add navigation controls to the map
async function fetchAndDisplayMarkers() {
  try {
    const response = await fetch('/get-discounts');
    if (!response.ok) {
      console.error('Failed to fetch discounts:', await response.text());
      return;
    }

    const discounts = await response.json();

    for (const key in discounts) {
      const { ai_response, location } = discounts[key];

      if (!ai_response) continue; // Skip if there is no AI response

      const { lat, lng } = location;

      // Use a custom icon instead of the default blue pin
      const marker = new mapboxgl.Marker({
        element: createCustomMarker() // Calls function to create a custom marker
      })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="cartoon-popup">
                <p>${ai_response}</p>
              </div>
            `)
        )
        .addTo(map);
    }
  } catch (error) {
    console.error('Error fetching or displaying markers:', error);
  }
}

// Function to create a custom marker
function createCustomMarker() {
  const markerElement = document.createElement('div');
  markerElement.className = 'custom-marker';
  return markerElement;
}

// Call the function when the map loads
map.on('load', fetchAndDisplayMarkers);

map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());

// Function to send volunteer data to the server
async function sendVolunteerData(event) {
  event.preventDefault();

  const storeAddress = document.getElementById('autocomplete').value;
  const category = document.getElementById('category').value;
  const start_time = document.getElementById('start-time').value;
  const end_time = document.getElementById('end-time').value;
  const spots = document.getElementById('spots').value;
  const timestamp = Date.now(); // Current time in milliseconds

  const volunteerData = { storeAddress, category, start_time, end_time, spots, timestamp };

  try {
    const response = await fetch('/add-volunteer-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(volunteerData),
    });

    if (response.ok) {
      console.log('Volunteer opportunity added successfully');
      alert('Volunteer opportunity added successfully!');
    } else {
      console.error('Failed to add volunteer data:', await response.text());
      alert('Failed to add volunteer data. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  }
}

// Attach the form submission handler
document.querySelector('form').addEventListener('submit', sendVolunteerData);