const ACCESS_TOKEN = 'pk.eyJ1IjoidmlzaGFscHV0dGFndW50YSIsImEiOiJjbTUxaDUxMGQxeGpnMmtwcHVycGhqaHhsIn0.IWxQPRNmfEJWT-k8sTCGlA';
mapboxgl.accessToken = ACCESS_TOKEN;

console.log("✅ Script loaded! Waiting for popup...");


const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-82.9988, 39.9612],
  zoom: 12,
});
window.onload = function () {
  // document.getElementById("date").valueAsDate = new Date();
  fetchAndDisplayMarkers();
}
// sets date by default to today's date

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

    const selectedCategory = document.getElementById('category-type').value;
    let selectedDate = "";
    try {
      selectedDate = new Date(document.getElementById('event-date').value).toISOString().split('T')[0];
    } catch (error) {
      selectedDate = "none";
    }
    let selectedZipcode = document.getElementById('zipcode').value;
    selectedZipcode = String(selectedZipcode);

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    for (const key in volunteerTasks) {
      const { storeAddress, location, category, date, task, description } = volunteerTasks[key];
      let taskDate = new Date(date).toISOString().split('T')[0];
      const { lat, lng } = location;
      const foundZipcode = await reverseGeocode(lng, lat);

      let useCategory = document.getElementById("toggle-category").checked;
      let useCalendar = document.getElementById("toggle-date").checked;
      let useZipcode = document.getElementById("toggle-zipcode").checked;

      // Skip if required fields are missing
      if (!storeAddress || !location || !category || !date || !task || !description) continue;

      // // Apply search query filter (if provided)
      // if (searchQuery && searchQuery.trim() !== "") {
      //   const searchQueryLower = searchQuery.trim().toLowerCase();
      //   const descriptionLower = description.toLowerCase();

      //   console.log("Search Query:", searchQueryLower);
      //   console.log("Description:", descriptionLower);

      //   // Skip if the search query doesn't match the description
      //   if (!descriptionLower.includes(searchQueryLower)) {
      //     console.log("Skipping task due to search query mismatch:", volunteerTasks[key]);
      //     continue;
      //   }
      // }

      // Apply other filters (category, date, zipcode)
      if (useCategory && (category !== selectedCategory)) continue;
      if (useCalendar && (taskDate !== selectedDate)) continue;
      if (useZipcode && (foundZipcode !== selectedZipcode)) continue;

      // Add marker to the map
      const marker = new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="volunteer-popup">
                <p><strong>Location:</strong> ${storeAddress}</p>
                <p><strong>Category:</strong> ${category}</p>
              </div>
            `)
        )
        .addTo(map);
      markers.push(marker);
    }
  } catch (error) {
    console.error('Error fetching or displaying markers:', error);
  }
}

// Add navigation controls to the map
// map.on('load', fetchAndDisplayMarkers);
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

// Search suggestions functionality
// const searchBar = document.getElementById('search-bar');
// const suggestionsDropdown = document.getElementById('search-suggestions');

// function debounce(func, delay) {
//   let timeout;
//   return function (...args) {
//     clearTimeout(timeout);
//     timeout = setTimeout(() => func.apply(this, args), delay);
//   };
// }

// async function fetchSearchSuggestions(query) {
//   if (!query) {
//     suggestionsDropdown.innerHTML = '';
//     suggestionsDropdown.style.display = 'none';
//     return;
//   }

//   try {
//     const response = await fetch(`/search-suggestions?query=` + query);
//     const suggestions = await response.json();
//     if (!response.ok) {
//       const errorText = await response.text(); // Try to get the raw response text
//       console.error('Error response:', errorText);
//       // Handle error
//       return;
//     }


//     if (suggestions.length > 0) {
//       suggestionsDropdown.innerHTML = suggestions
//         .map(suggestion => `
//           <div class="suggestion-item" data-description="${suggestion.description}">
//             <strong>Description:</strong> ${suggestion.description}
//           </div>
//         `)
//         .join('');
//       suggestionsDropdown.style.display = 'block';
//     } else {
//       suggestionsDropdown.innerHTML = '<div class="suggestion-item">No results found</div>';
//       suggestionsDropdown.style.display = 'block';
//     }
//   } catch (error) {
//     console.error('Error fetching suggestions:', error);
//     suggestionsDropdown.innerHTML = '<div class="suggestion-item">Error fetching suggestions</div>';
//     suggestionsDropdown.style.display = 'block';
//   }
// }

// searchBar.addEventListener('input', debounce(() => {
//   const query = searchBar.value.trim();
//   fetchSearchSuggestions(query);
// }, 300));

// suggestionsDropdown.addEventListener('click', (event) => {
//   const suggestionItem = event.target.closest('.suggestion-item');
//   if (suggestionItem) {
//     const description = suggestionItem.dataset.description;

//     // Set the search bar value to the selected suggestion
//     searchBar.value = description;

//     // Hide the dropdown
//     suggestionsDropdown.style.display = 'none';

//     // Filter markers based on the selected suggestion
//     fetchAndDisplayMarkers(description);
//   }
// });

// document.addEventListener('click', (event) => {
//   if (!event.target.closest('.search-container')) {
//     suggestionsDropdown.style.display = 'none';
//   }
// });

// Function to send user inputted volunteer data to the server
async function sendVolunteerData() {
  const storeAddress = document.getElementById('autocomplete').value;
  const date = document.getElementById('date').value;

  const startTimeNode = document.querySelectorAll(".start-select");
  const start_time = "" + startTimeNode[0].innerHTML + ":" + startTimeNode[1].innerHTML + ":" + startTimeNode[2].innerHTML;

  const endTimeNode = document.querySelectorAll(".end-select");
  const end_time = "" + endTimeNode[0].innerHTML + ":" + endTimeNode[1].innerHTML + ":" + endTimeNode[2].innerHTML;

  const category = document.querySelector(".inp-cbx:checked");

  const spots = document.getElementById('volunteer-count').value;
  const task = document.getElementById('task').value;
  
  const description = document.getElementById('description').value;
  const timestamp = Date.now(); // Current time in milliseconds
  if (lat == null || lng == null) {
    alert("Please select a valid location from the autocomplete suggestion.");
  }

  const volunteerData = { storeAddress, category, start_time, end_time, spots, timestamp, task, location: { lat, lng }, date, description};

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

window.addEventListener('load', initAutocomplete);