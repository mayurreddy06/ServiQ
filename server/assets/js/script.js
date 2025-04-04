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
  try {
    // First try to get coordinates from the autocomplete input
    const autocompleteInput = document.getElementById('autocomplete');
    if (autocompleteInput && autocompleteInput.dataset.place) {
      const place = JSON.parse(autocompleteInput.dataset.place);
      if (place.geometry && place.geometry.location) {
        console.log('Using stored Google Places coordinates:', place.geometry.location);
        // Return coordinates directly from the stored data
        return `${place.geometry.location.lng},${place.geometry.location.lat}`;
      }
    }

    // If no stored place data, try to get it from the autocomplete
    const autocomplete = new google.maps.places.Autocomplete(autocompleteInput);
    const place = autocomplete.getPlace();
    
    if (place && place.geometry && place.geometry.location) {
      console.log('Using Google Places coordinates:', place.geometry.location);
      // Store the place data for future use, but only the coordinates
      const placeData = {
        geometry: {
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        }
      };
      autocompleteInput.dataset.place = JSON.stringify(placeData);
      return `${place.geometry.location.lng()},${place.geometry.location.lat()}`;
    }
    
    // Fallback to Mapbox if Google Places data not available
    let forwardGeoCoding = 'https://api.mapbox.com/search/geocode/v6/forward?q=' + 
      encodeURIComponent(location) + 
      '&access_token=' + ACCESS_TOKEN + 
      '&limit=5&types=address,poi';
    
    console.log('Fetching coordinates from Mapbox for:', location);
    const response = await fetch(forwardGeoCoding);
    const data = await response.json();
    console.log('Mapbox API response:', data);
    
    if (data.features && data.features.length > 0) {
      // Try to find the most precise result
      const bestResult = data.features.find(feature => 
        feature.properties.accuracy === 'point' || 
        feature.properties.accuracy === 'address'
      ) || data.features[0];
      
      console.log('Selected coordinates from:', bestResult.properties);
      const coordinates = bestResult.geometry.coordinates;
      return coordinates.join(','); // Returns "longitude,latitude"
    }
    
    throw new Error('No coordinates found for the given location');
  } catch (error) {
    console.error('Error in forwardGeocode:', error);
    throw error;
  }
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

async function fetchAndDisplayMarkers2()
{
  markers.forEach(marker => marker.remove());
  markers = [];
  // store volunteer objects in an array


  const categorySelected = "";
  const dateSelected = "";
  const zipcodeSelected = "";
  const GET_REQUEST = "/volunteer-data";
  let filterCounter = 0;


  let useCategory = document.getElementById("toggle-category").checked;
  if (useCategory)
  {
    filterCounter++;
    categorySelected = document.getElementById('category-type');
    if (filterCounter === 1)
    {
      GET_REQUEST += "?";
    }
    else
    {
      GET_REQUEST += "&";
    }
    GET_REQUEST += ("category=" + categorySelected);
  }


  let useCalendar = document.getElementById("toggle-date").checked;
  if (useCalendar)
  {
    filterCounter++;
    try
    {
      const dateElement = document.getElementById('event-date');
      dateSelected = new Date(dateElement.value).toISOString().split('T')[0];
    }
    catch(error)
    {
      dateSelected = "01-01-2025";
    }
    if (filterCounter === 1)
    {
        GET_REQUEST += "?";
    }
    else
    {
        GET_REQUEST += "&";
    }
    GET_REQUEST += ("date=" + dateSelected);
  }


  let useZipcode = document.getElementById("toggle-zipcode").checked;
  if (useZipcode)
  {
    filterCounter++;
    zipcodeSelected = document.getElementById('zipcode').value;
    if (filterCounter === 1)
    {
        GET_REQUEST += "?";
    }
    else
    {
        GET_REQUEST += "&";
    }
    GET_REQUEST += ("zipcode=" + zipcodeSelected);
  }
  const response = await fetch(GET_REQUEST);
  if (!response.ok)
  {
    console.error('Failed to fetch volunteer data' + response.text());
  }
  let volunteerObjects = response.json();

  for (var key in volunteerObjects)
  {
    const marker = new mapboxgl.Marker()
        .setLngLat([key.location.lng, key.location.lat])
        .addTo(map);
        markers.push(marker);

  }
  marker.getElement().addEventListener('click', () => {
    openCustomPopup(storeAddress, category, key);
  });
  console.log("Displayed " + markers.length + " markers on the map");

}
// Add click event to show custom popup


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
    for (const taskId in volunteerTasks) {
      const task = volunteerTasks[taskId];
      const { storeAddress, location, category, date } = task;
      
      // Skip if required fields are missing
      if (!storeAddress || !location || !category || !date) {
        console.log("Skipping incomplete task data:", task);
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

      // Add click event to show custom popup with the correct taskId
      marker.getElement().addEventListener('click', () => {
        console.log("Opening popup for task:", { taskId, storeAddress, category });
        openCustomPopup(storeAddress, category, taskId);
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
    console.log('Place selected:', place);

    if (place.geometry && place.geometry.location) {
      // Store only the coordinates
      const placeData = {
        geometry: {
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        }
      };
      input.dataset.place = JSON.stringify(placeData);
      console.log('Stored place data:', placeData);
    } else {
      console.log("No valid coordinates found.");
    }
  });
}

// Add form submission handler
document.querySelector(".task-post").addEventListener('submit', function(e) {
  e.preventDefault(); // Prevent default form submission
  sendVolunteerData();
});

// Function to send user inputted volunteer data to the server
async function sendVolunteerData() {
  try {
    // Validate required fields
    const storeAddress = document.getElementById('autocomplete').value;
    if (!storeAddress) {
      alert('Please enter a valid location');
      return;
    }

    const date = document.getElementById('date').value;
    if (!date) {
      alert('Please select a date');
      return;
    }

    const startTimeNode = document.querySelectorAll(".start-select");
    if (!startTimeNode || startTimeNode.length !== 3) {
      alert('Invalid start time');
      return;
    }
    const start_time = `${startTimeNode[0].innerHTML}:${startTimeNode[1].innerHTML}:${startTimeNode[2].innerHTML}`;

    const endTimeNode = document.querySelectorAll(".end-select");
    if (!endTimeNode || endTimeNode.length !== 3) {
      alert('Invalid end time');
      return;
    }
    const end_time = `${endTimeNode[0].innerHTML}:${endTimeNode[1].innerHTML}:${endTimeNode[2].innerHTML}`;

    const category = document.querySelector(".inp-cbx:checked")?.value;
    if (!category) {
      alert('Please select a category');
      return;
    }

    const spots = document.getElementById('volunteer-count').value;
    if (!spots || isNaN(spots) || spots < 1) {
      alert('Please enter a valid number of spots');
      return;
    }

    const task = document.getElementById('task').value;
    if (!task) {
      alert('Please enter a task description');
      return;
    }

    const description = document.getElementById('description').value;
    const timestamp = Date.now();

    console.log('Getting coordinates for:', storeAddress);
    let latLng = await forwardGeocode(storeAddress, null);
    console.log('Received coordinates:', latLng);
    
    const [lng, lat] = latLng.split(',').map(coord => parseFloat(coord.trim()));
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates received');
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

    console.log('Sending data to server:', volunteerData);
    const response = await fetch('/volunteer-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(volunteerData),
    });

    const responseText = await response.text();
    console.log('Server response:', responseText);

    if (response.ok) {
      console.log('Volunteer opportunity added successfully');
      alert('Volunteer opportunity added successfully!');
      // Clear the form
      document.querySelector(".task-post").reset();
      // Refresh markers
      fetchAndDisplayMarkers();
    } else {
      console.error('Failed to add volunteer data:', responseText);
      alert('Failed to add volunteer data: ' + responseText);
    }
  } catch (error) {
    console.error('Error in sendVolunteerData:', error);
    alert('Error: ' + error.message);
  }
}

// Function to open the custom popup
function openCustomPopup(storeAddress, category, taskId) {
  console.log("📌 Opening custom popup for:", { storeAddress, category, taskId });

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
      const response = await fetch("http://localhost:3002/send-email", {
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

document.getElementById('home-search').addEventListener('click', ()=> {
  window.location.href = "#homePage-form";
})