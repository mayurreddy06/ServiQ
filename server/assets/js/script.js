const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;

console.log("Script loaded. Waiting for map to initialize...");

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

document.getElementById('zipcode').addEventListener('change', () => reZoomMap(document.getElementById('zipcode').value));

// Handle form submission for address search
document.querySelector('.homePage-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  // this prevents the page from refreshing when the form is submitted
  const address = document.getElementById('autocomplete').value;
  if (address) {
    await reZoomMap(address);
    fetchAndDisplayMarkers();
  }
});

async function reZoomMap(value) {
  try {
    if (!value) return;

    console.log('Zooming to location:', value);
    
    // Check if it's a zipcode (5 digits)
    if (/^\d{5}$/.test(value)) {
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${ACCESS_TOKEN}&types=postcode`;
      const response = await fetch(geocodingUrl);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        console.log('Found coordinates for zipcode:', { lng, lat });
        
        map.flyTo({
          center: [lng, lat],
          zoom: 12,
          speed: 1.2,
          curve: 1,
        });
        return;
      }
    }

    const autocompleteInput = document.getElementById('autocomplete');
    if (autocompleteInput && autocompleteInput.dataset.place) {
      const place = JSON.parse(autocompleteInput.dataset.place);
      if (place.geometry && place.geometry.location) {
        console.log('Using stored Google Places coordinates:', place.geometry.location);
        map.flyTo({
          center: [place.geometry.location.lng, place.geometry.location.lat],
          zoom: 12,
          speed: 1.2,
          curve: 1,
        });
        return;
      }
    }

    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${ACCESS_TOKEN}`;
    const response = await fetch(geocodingUrl);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      console.log('Found coordinates for address:', { lng, lat });
      
      map.flyTo({
        center: [lng, lat],
        zoom: 12,
        speed: 1.2,
        curve: 1,
      });
    } else {
      console.error('No coordinates found for location:', value);
    }
  } catch (error) {
    console.error('Error in reZoomMap:', error);
  }
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
    // If it's a zipcode (5 digits), use a different endpoint
    if (/^\d{5}$/.test(location)) {
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${ACCESS_TOKEN}&types=postcode`;
      const response = await fetch(geocodingUrl);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return `${lng},${lat}`;
      }
      throw new Error('No coordinates found for zipcode');
    }

    // For non-zipcode locations, use existing Google Places logic
    const autocompleteInput = document.getElementById('autocomplete');
    if (autocompleteInput && autocompleteInput.dataset.place) {
      const place = JSON.parse(autocompleteInput.dataset.place);
      if (place.geometry && place.geometry.location) {
        console.log('Using stored Google Places coordinates:', place.geometry.location);
        return `${place.geometry.location.lng},${place.geometry.location.lat}`;
      }
    }

    // First try to get coordinates from the autocomplete input
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
      const specificTask = volunteerTasks[taskId];
      const { storeAddress, location, category, date, task } = specificTask;
      
      // Skip if required fields are missing
      if (!storeAddress || !location || !category || !date) {
        console.log("Skipping incomplete task data:", specificTask);
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
        console.log("Opening popup for task:", { taskId, storeAddress, category, task });
        openCustomPopup(storeAddress, category, taskId, task);
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

// Function to open the custom popup
async function openCustomPopup(storeAddress, category, taskId, task) {
  console.log("Opening custom popup for:", { storeAddress, category, taskId, task });

  document.getElementById('popupLocation').innerText = storeAddress;
  document.getElementById('popupTask').innerText = task;
  document.getElementById('popupCategory').innerText = category;

  document.getElementById('customPopup').style.display = 'block';

  document.getElementById('registerBtn').onclick = async function () {
    console.log("Register button clicked!");

    const email = document.getElementById('popupEmail').value.trim();
    if (!email) {
      alert("Please enter an email.");
      return;
    }

    console.log(`Sending request to /send-email for: ${email}`);

    try {
      const response = await fetch("/sendEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, storeAddress, category, taskId }),
      });

      const result = await response.json();
      console.log("Response received:", result);

      if (response.ok) {
        alert(`Registration successful! You are volunteer #${result.count}.`);
        closeCustomPopup();
      } else {
        alert(result.message || "Error sending email.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
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