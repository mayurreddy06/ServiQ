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
}

// Make sure the map is fully loaded before fetching markers
map.on('load', function() {
  console.log("Map loaded, fetching markers...");
  fetchAndDisplayMarkers();
});

// Event listern function to see if filtering boxes have been checked/changed
document.addEventListener('DOMContentLoaded', function() {
  
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

document.getElementById('zipcode').addEventListener('change', () => reZoomMap());

async function reZoomMap()
{
  let zipcode = document.getElementById('zipcode').value;
  let latLng = await forwardGeocode(zipcode, null);
  latLng = String(latLng);
  let lat = latLng.substring(0, latLng.indexOf(','));
  let lng = latLng.substring(latLng.indexOf(',') + 1, latLng.length);
  map.flyTo({
    center: [lat, lng],
    zoom: 12,
    speed: 1.2, 
    curve: 1, 
  });
}

let markers = [];
// declares markers array

async function reverseGeocode(lng, lat, regex) {
  let reverseGeoCoding = 'https://api.mapbox.com/search/geocode/v6/reverse?longitude=' + lng + '&latitude=' + lat + '&access_token=' + ACCESS_TOKEN + '';
  const response = await fetch(reverseGeoCoding);
  const data = await response.json();
  console.log(data);
  const targetKey = 'full_address';
  let zipcode = loopThroughJSON(data, regex, targetKey);
  console.log("This is the zipcode returned by reverseGeocode" + zipcode);
  return String(zipcode);
}

async function forwardGeocode(location, regex)
{
  let forwardGeoCoding = 'https://api.mapbox.com/search/geocode/v6/forward?q=' + location + '&access_token=' + ACCESS_TOKEN + '';
  const response = await fetch(forwardGeoCoding);
  const data = await response.json();
  const targetKey = 'coordinates';
  regex = null;
  let latLng = loopThroughJSON(data, regex, targetKey);
  return latLng;
}

function loopThroughJSON(obj, regex, targetKey) {
  let value = null;
  
  for (let key in obj) {
    if (key === targetKey) {
      if (regex === null)
      {
        return obj[key];
      }
      return obj[key].match(regex);
      // regular expression to extract the zipcode from the full address
    }
    
    if (typeof obj[key] === 'object') {
      if (Array.isArray(obj[key])) {
        // Loop through array
        for (let i = 0; i < obj[key].length; i++) {
          value = loopThroughJSON(obj[key][i], regex, targetKey);
          if (value) 
            return value; 
        }
      } else {
        // Call function recursively for object
        value = loopThroughJSON(obj[key], regex, targetKey);
        if (value) 
          return value;
      }
    } else {
      // Do something with value (keeping your console.log)
      console.log(key + ': ' + obj[key]);
    }
  }
  
  return value; // Return null if nothing found
}

async function fetchAndDisplayMarkers() {
  try {
    console.log("Fetching data from: /volunteer-data");
    const response = await fetch('/volunteer-data');
    if (!response.ok) {
      console.error('Failed to fetch volunteer tasks:', await response.text());
      return;
    }

    const volunteerTasks = await response.json();
    console.log("Received Data:", volunteerTasks);

    // Get filter values
    let selectedCategory = "";
    const categorySelect = document.getElementById('category-type');
    if (categorySelect) {
    selectedCategory = categorySelect.value;
    }

    let selectedDate = "";
    try {
      const dateElement = document.getElementById('event-date');
      selectedDate = new Date(dateElement.value).toISOString().split('T')[0];
    } catch (error) {
      selectedDate = "none";
    }
    let selectedZipcode = document.getElementById('zipcode').value;
    selectedZipcode = String(selectedZipcode);

    // Check if filters are enabled
    let useCategory = document.getElementById("toggle-category").checked;
    let useCalendar = document.getElementById("toggle-date").checked;
    let useZipcode = document.getElementById("toggle-zipcode").checked;

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
      
      if (useCategory && category.toLowerCase() !== selectedCategory.toLowerCase()) {
        shouldDisplay = false;
      }
      
      if (useCalendar && taskDate !== selectedDate) {
        shouldDisplay = false;
      }
      
      if (useZipcode) {
        const zipcodeFromAddress = /[0-9]{5}(-[0-9]{4})?/g;
        const foundZipcode = await reverseGeocode(lng, lat, zipcodeFromAddress);
        if (foundZipcode !== selectedZipcode) {
          shouldDisplay = false;
        }
      }
      
      if (!shouldDisplay) 
        continue;

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
      let lat = place.geometry.location.lat();
      let lng = place.geometry.location.lng();

      console.log("Selected Location:", { lat, lng });
    } else {
      console.log("No valid coordinates found.");
    }
  });
}

// Function to send user inputted volunteer data to the server
async function sendVolunteerData() {
  const storeAddress = document.getElementById('autocomplete').value;
  const date = document.getElementById('date').value;

  const startTimeNode = document.querySelectorAll(".start-select");
  const start_time = `${startTimeNode[0].innerHTML}:${startTimeNode[1].innerHTML}:${startTimeNode[2].innerHTML}`;

  const endTimeNode = document.querySelectorAll(".end-select");
  const end_time = `${endTimeNode[0].innerHTML}:${endTimeNode[1].innerHTML}:${endTimeNode[2].innerHTML}`;

  const category = document.querySelector(".inp-cbx:checked").value;

  const spots = document.getElementById('volunteer-count').value;
  const task = document.getElementById('task').value;
  
  const description = document.getElementById('description').value;
  const timestamp = Date.now(); // Current time in milliseconds

  let latLng = await forwardGeocode(storeAddress, null);
  latLng = String(latLng);
  let lat = latLng.substring(0, latLng.indexOf(','));
  let lng = latLng.substring(latLng.indexOf(',') + 1, latLng.length);

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
    const response = await fetch('/volunteer-data', {
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