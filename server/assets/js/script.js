const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;

console.log("✅ Script loaded! Waiting for map to initialize...");

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-82.9988, 39.9612],
  zoom: 12,
});

// Wait for both the window to load and the map to be ready
window.onload = function() {
  console.log("Window loaded");
  document.getElementById("date").valueAsDate = new Date();
}

// Make sure the map is fully loaded before fetching markers
map.on('load', function() {
  console.log("Map loaded, fetching markers...");
  fetchAndDisplayMarkers();
});

// Add filter event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Add event listeners to all filter controls
  const filterControls = [
    'category-type',
    'event-date',
    'zipcode',
    'toggle-category',
    'toggle-date',
    'toggle-zipcode'
  ];
  
  filterControls.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', fetchAndDisplayMarkers);
    }
  });
});

let markers = [];

async function reverseGeocode(lng, lat) {
  let reverseGeoCoding = 'https://api.mapbox.com/search/geocode/v6/reverse?longitude=' + lng + '&latitude=' + lat + '&access_token=' + ACCESS_TOKEN + '';
  const response = await fetch(reverseGeoCoding);
  const data = await response.json();
  return String(data.features[0]?.properties?.context?.postcode?.name);
}

async function fetchAndDisplayMarkers() {
  try {
    console.log("Fetching data from: /get-volunteer-tasks");
    const response = await fetch('/get-volunteer-tasks');
    if (!response.ok) {
      console.error('Failed to fetch volunteer tasks:', await response.text());
      return;
    }

    const volunteerTasks = await response.json();
    console.log("Received Data:", volunteerTasks);

    // Get filter values
    const selectedCategory = document.getElementById('category-type')?.value || '';
    let selectedDate = "";
    try {
      const dateElement = document.getElementById('event-date');
      selectedDate = dateElement ? new Date(dateElement.value).toISOString().split('T')[0] : "";
    } catch (error) {
      selectedDate = "none";
      console.error("Date parsing error:", error);
    }
    
    let selectedZipcode = document.getElementById('zipcode')?.value || '';
    selectedZipcode = String(selectedZipcode);

    // Check if filters are enabled
    let useCategory = document.getElementById("toggle-category")?.checked || false;
    let useCalendar = document.getElementById("toggle-date")?.checked || false;
    let useZipcode = document.getElementById("toggle-zipcode")?.checked || false;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    // Process tasks
    for (const key in volunteerTasks) {
      const { storeAddress, location, category, date, task, description } = volunteerTasks[key];
      
      // Skip if required fields are missing
      if (!storeAddress || !location || !category || !date || !task || !description) {
        console.log("Skipping incomplete task data:", volunteerTasks[key]);
        continue;
      }

      let taskDate;
      try {
        taskDate = new Date(date).toISOString().split('T')[0];
      } catch (error) {
        console.error("Error parsing task date:", error);
        taskDate = "";
      }
      
      const { lat, lng } = location;
      
      // Apply filters
      let shouldDisplay = true;
      
      if (useCategory && category !== selectedCategory) {
        shouldDisplay = false;
      }
      
      if (useCalendar && taskDate !== selectedDate) {
        shouldDisplay = false;
      }
      
      if (useZipcode) {
        const foundZipcode = await reverseGeocode(lng, lat);
        if (foundZipcode !== selectedZipcode) {
          shouldDisplay = false;
        }
      }
      
      if (!shouldDisplay) continue;

      // Add marker to the map
      const marker = new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .addTo(map);

      markers.push(marker);

      // Add click event to show custom popup
      marker.getElement().addEventListener('click', () => {
        openCustomPopup(storeAddress, category, key);
      });
    }
    
    console.log(`Displayed ${markers.length} markers on the map`);
  } catch (error) {
    console.error('Error fetching or displaying markers:', error);
  }
}

// Add navigation controls to the map
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());

let lat = null;
let lng = null;

function initAutocomplete() {
  const input = document.getElementById('autocomplete');
  if (!input) {
    console.error("Autocomplete input element not found");
    return;
  }
  
  const autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.addListener('place_changed', function () {
    const place = autocomplete.getPlace();

    if (place.geometry && place.geometry.location) {
      lat = place.geometry.location.lat();
      lng = place.geometry.location.lng();

      // Display the coordinates
      const coordElement = document.getElementById('coordinates');
      if (coordElement) {
        coordElement.innerHTML = `<p>Latitude: ${lat}</p><p>Longitude: ${lng}</p>`;
      }

      console.log("Selected Location:", { lat, lng });
    } else {
      console.log("No valid coordinates found.");
    }
  });
}

// Function to send user inputted volunteer data to the server
async function sendVolunteerData() {
  const storeAddress = document.getElementById('autocomplete').value;
  const date = document.getElementById('date-input').value;

  const startTimeNode = document.querySelectorAll(".start-select");
  const start_time = `${startTimeNode[0].innerHTML}:${startTimeNode[1].innerHTML}:${startTimeNode[2].innerHTML}`;

  const endTimeNode = document.querySelectorAll(".end-select");
  const end_time = `${endTimeNode[0].innerHTML}:${endTimeNode[1].innerHTML}:${endTimeNode[2].innerHTML}`;

  const category = document.querySelector(".inp-cbx:checked").value;

  const spots = document.getElementById('volunteer-count').value;
  const task = document.getElementById('task').value;
  
  const description = document.getElementById('description').value;
  const timestamp = Date.now(); // Current time in milliseconds

  if (lat == null || lng == null) {
    alert("Please select a valid location from the autocomplete suggestion.");
    return;
  }

  const volunteerData = { 
    storeAddress, 
    category, 
    start_time, 
    end_time, 
    spots, 
    timestamp, 
    task, 
    location: { lat, lng }, 
    date, 
    description
  };

  try {
    const response = await fetch('/add-volunteer-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(volunteerData),
    });

    if (response.ok) {
      console.log('Volunteer opportunity added successfully');
      alert('Volunteer opportunity added successfully!');
      // Refresh markers after adding new data
      fetchAndDisplayMarkers();
    } else {
      console.error('Failed to add volunteer data:', await response.text());
      alert('Failed to add volunteer data. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  }
}

// Function to open the custom popup
function openCustomPopup(storeAddress, category, taskId) {
  console.log("📌 Opening custom popup for:", storeAddress);

  document.getElementById('popupLocation').innerText = storeAddress;
  document.getElementById('popupCategory').innerText = category;

  document.getElementById('customPopup').style.display = 'block';

  document.getElementById('registerBtn').onclick = async function () {
    console.log("📩 Register button clicked!");

    const email = document.getElementById('popupEmail').value.trim();
    if (!email) {
      alert("Please enter an email.");
      return;
    }

    console.log(`📨 Sending request to /send-email for: ${email}`);

    try {
      const response = await fetch("http://localhost:3000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, storeAddress, category, taskId }),
      });

      const result = await response.json();
      console.log("📬 Response received:", result);

      if (response.ok) {
        alert(`Registration successful! You are volunteer #${result.count}.`);
        closeCustomPopup();
      } else {
        alert(result.message || "❌ Error sending email.");
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      alert("Something went wrong.");
    }
  };
}

// Function to close the custom popup
function closeCustomPopup() {
  document.getElementById('customPopup').style.display = 'none';
}

// Make sure Google Maps API is loaded before initializing autocomplete
if (typeof google !== 'undefined' && google.maps && google.maps.places) {
  initAutocomplete();
} else {
  window.addEventListener('load', function() {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      initAutocomplete();
    } else {
      console.error("Google Maps API not loaded properly");
    }
  });
}