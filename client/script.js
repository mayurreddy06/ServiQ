// Existing map initialization and interaction code
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
  document.getElementById("event-date").valueAsDate = new Date();
}
// sets date by default to today's date

let markers = [];


async function reverseGeocode(lng, lat)
{
  let reverseGeoCoding = 'https://api.mapbox.com/search/geocode/v6/reverse?longitude=' + lng + '&latitude=' + lat + '&access_token=' + ACCESS_TOKEN + '';
      // API call route to convert lat and lng into zipcodes
      const response = await fetch(reverseGeoCoding);
      const data = await response.json();
      return String(data.features[0]?.properties?.context?.postcode?.name);
      // fix later, remove hardcoding for location JSON data and add error fetching

      // .then(response => {
      //   if (!response.ok) {
      //     throw new Error('Network response was not ok');
      //   }
      //   return response.json();
      // })
      // .then(data => {
      //   console.log(data);
      //   foundZipcode = data.features[0]?.properties?.context?.postcode?.name;
      //   alert(String(foundZipcode));
      //   return String(foundZipcode);
      // })
      // .catch(error => {
      //   console.error('No zipcode was located from the JSON that was returned' + error);
      //   foundZipcode = "none";
      //   return String(foundZipcode);

      // });

}
async function fetchAndDisplayMarkers() {
  try {
    console.log("Fetching data from: /get-volunteer-tasks");
    // Debugging: Check the fetch URL


    const response = await fetch('/get-volunteer-tasks');
    // The endpoint being called
    if (!response.ok) {
      console.error('Failed to fetch volunteer tasks:', await response.text());
      return;
    }


    const volunteerTasks = await response.json();
    console.log("Received Data:", volunteerTasks);
    // Debugging: Check what data is received


    /**
     * Recieves user input for category and date. Utilizes try catch for date if set to default.
    */
    const selectedCategory = document.getElementById('category-type').value;
    let selectedDate = "";
    try
    {
      selectedDate = new Date(document.getElementById('event-date').value).toISOString().split('T')[0];
    }
    catch (error)
    {
      selectedDate = "none";
    }
    let selectedZipcode = document.getElementById('zipcode').value;
    selectedZipcode = String(selectedZipcode);

    // Clears existing markers from the map
    markers.forEach(marker => marker.remove());
    markers = [];


    for (const key in volunteerTasks) {
      const { storeAddress, location, category, date} = volunteerTasks[key];
      // Retrieves specific values for each Volunteer Activity submitted for the firebase data


      let taskDate = new Date(date).toISOString().split('T')[0];
      // converts date to an actual date to be compared to


      const { lat, lng } = location;
      // retreives langitude and longitude

      const foundZipcode = await reverseGeocode(lng, lat);

      let useCategory = document.getElementById("toggle-category").checked;
      let useCalendar = document.getElementById("toggle-date").checked;
      let useZipcode = document.getElementById("toggle-zipcode").checked;

      

      // Skip if required fields are missing
      if (!storeAddress || !location || !category || !date)
        continue;

      if(useCategory)
      {
        if (category !== selectedCategory)
        {
          continue;
        }
      }
      if(useCalendar)
        {
          if (taskDate !== selectedDate)
          {
            continue;
          }
        }
      if(useZipcode)
          {
            if (foundZipcode !== selectedZipcode)
            {
              continue;
            }
          }
      // if ((useCategory === false && category !== selectedCategory) || (useCalendar == false && taskDate !== selectedDate)) {
      //   alert("executed");
      //   continue; 
      // }
      // Add marker to the map
      const marker = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .addTo(map);
    
    // Attach click event to open our custom popup
    marker.getElement().addEventListener('click', () => {
      console.log("📌 Marker clicked! Opening custom popup...");
    
      // Open the custom popup with this marker’s data
      openCustomPopup(storeAddress, category);
    });
    

      map.on('popupopen', () => {
        console.log("📌 Popup opened! Waiting for it to load...");
      
        let checkPopup = setInterval(() => {
          const popup = document.querySelector('.mapboxgl-popup');
          const popupContent = document.querySelector('.mapboxgl-popup-content');
          const popupCloseButton = document.querySelector('.mapboxgl-popup-close-button');
      
          if (popup && popupContent) {
            console.log("✅ Popup found! Making it interactive...");
      
            popup.style.pointerEvents = "auto"; // Allow clicks
            popupContent.style.pointerEvents = "auto"; // Allow interaction
            popupContent.removeAttribute('aria-hidden');
      
            if (popupCloseButton) {
              popupCloseButton.removeAttribute('aria-hidden');
              popupCloseButton.setAttribute('tabindex', '0');
              console.log("✅ Close button is interactive!");
            }
      
            clearInterval(checkPopup); // Stop checking since the popup is found
          }
        }, 300); // Check every 300ms until the popup appears
      
        // Stop checking if the popup closes
        map.on('popupclose', () => {
          clearInterval(checkPopup);
          console.log("✅ Stopped checking for popup (Popup closed).");
        });
      });
      
      
      
      
      
      
      
      


      // Store the marker in the array for later removal
      markers.push(marker);
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
async function sendVolunteerData() {


  const storeAddress = document.getElementById('autocomplete').value;
  const category = document.getElementById('category').value;
  const start_time = document.getElementById('start-time').value;
  const end_time = document.getElementById('end-time').value;
  const spots = document.getElementById('spots').value;
  const task = document.getElementById('task').value;
  const date = document.getElementById('date-input').value;
  const timestamp = Date.now(); // Current time in milliseconds

  if (lat == null || lng == null){
    alert("Please select a valid location from the autocomplete suggestion.");
  }


  const volunteerData = { storeAddress, category, start_time, end_time, spots, timestamp, task, location: {lat, lng}, date};


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
// async function sendUserInput(event) {
//   event.preventDefault();
//   const searchBar = document.getElementById('search-bar').value;
//   const timestamp = Date.now(); // Current time in milliseconds


//   const volunteerData = { timestamp, searchBar};


//   try {
//     const response = await fetch('/add-user-data', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(volunteerData),
//     });


//     if (response.ok) {
//       console.log('Volunteer opportunity added successfully');
//       alert('Volunteer opportunity added successfully!');
//     } else {
//       console.error('Failed to add volunteer data:', await response.text());
//       alert('Failed to add volunteer data. Please try again.');
//     }
//   } catch (error) {
//     console.error('Error:', error);
//     alert('An error occurred. Please try again.');
//   }
// }


// Attach the form submission handler
// document.querySelector('form').addEventListener('submit', sendVolunteerData);
// document.querySelector('form').addEventListener('submit', sendUserInput);
// Function to open the custom popup
function openCustomPopup(storeAddress, category) {
  console.log("📌 Opening custom popup for:", storeAddress);

  // Set content
  document.getElementById('popupLocation').innerText = storeAddress;
  document.getElementById('popupCategory').innerText = category;

  // Show the popup
  document.getElementById('customPopup').style.display = 'block';

  // Attach event listener to Register button
  document.getElementById('registerBtn').onclick = async function () {
    console.log("📩 Register button clicked!");

    const email = document.getElementById('popupEmail').value.trim();
    if (!email) {
      alert("Please enter an email.");
      return;
    }

    console.log(`📨 Sending request to /send-email for: ${email}`);

    try {
      const response = await fetch('/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          storeAddress: storeAddress,
          category: category
        }),
      });

      console.log("📬 Response received:", response);

      if (response.ok) {
        alert("Registration successful! Check your email.");
        closeCustomPopup();
      } else {
        alert("❌ Error sending email.");
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