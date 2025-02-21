// Existing map initialization and interaction code
const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;


const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-82.9988, 39.9612],
  zoom: 12,
});


async function fetchAndDisplayMarkers() {
  try {
    console.log("Fetching data from: /get-volunteer-tasks"); // Debugging: Check the fetch URL

    const response = await fetch('/get-volunteer-tasks'); // The endpoint being called
    if (!response.ok) {
      console.error('Failed to fetch volunteer tasks:', await response.text());
      return;
    }

    const volunteerTasks = await response.json();
    console.log("Received Data:", volunteerTasks); // Debugging: Check what data is received

    for (const key in volunteerTasks) {
      const { storeAddress, location } = volunteerTasks[key];

      if (!storeAddress || !location) continue; // Skip if address or location is missing

      const { lat, lng } = location;

      new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="volunteer-popup">
                <p><strong>Location:</strong> ${storeAddress}</p>
              </div>
            `)
        )
        .addTo(map);
    }
  } catch (error) {
    console.error('Error fetching or displaying markers:', error);
  }
}
// Add navigation controls to the map
map.on('load', fetchAndDisplayMarkers);
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());
let lat = null;
let lng = null;
function initAutocomplete() {
  const input = document.getElementById('autocomplete');
  const autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.addListener('place_changed', function () {
    const place = autocomplete.getPlace();

    if (place.geometry && place.geometry.location) {
      lat = place.geometry.location.lat();
      lng = place.geometry.location.lng();

      // Display the coordinates
      document.getElementById('coordinates').innerHTML =
        `<p>Latitude: ${lat}</p><p>Longitude: ${lng}</p>`;

      console.log("Selected Location:", { lat, lng });
    } else {
      console.log("No valid coordinates found.");
    }
  });
}


// Function to send user inputted volunteer data to the server
async function sendVolunteerData(event) {
  event.preventDefault();


  const storeAddress = document.getElementById('autocomplete').value;
  const category = document.getElementById('category').value;
  const start_time = document.getElementById('start-time').value;
  const end_time = document.getElementById('end-time').value;
  const spots = document.getElementById('spots').value;
  const task = document.getElementById('task').value;
  const searchBar = document.getElementById('search-bar').value;
  const timestamp = Date.now(); // Current time in milliseconds

  if (lat == null || lng == null){
    alert("Please select a valid location from the autocomplete suggestion.");
  }


  const volunteerData = { storeAddress, category, start_time, end_time, spots, timestamp, task, searchBar, location: {lat, lng}};


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

// Function send the user-inputted search query to the server
async function sendUserInput(event) {
  event.preventDefault();
  const searchBar = document.getElementById('search-bar').value;
  const timestamp = Date.now(); // Current time in milliseconds


  const volunteerData = { timestamp, searchBar};


  try {
    const response = await fetch('/add-user-data', {
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
document.querySelector('form').addEventListener('submit', sendUserInput);
window.addEventListener('load', initAutocomplete);