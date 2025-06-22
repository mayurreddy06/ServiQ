const ACCESS_TOKEN = process.env.MAPBOX_API_KEY;
mapboxgl.accessToken = ACCESS_TOKEN;

// declare map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-82.9988, 39.9612],
  zoom: 12,
});

// call fetch and display markers upon page load
map.on('load', function() {
  fetchAndDisplayMarkers();
});

// adds user navigation controls to the map
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.FullscreenControl());

// calls fetch and display markers any time the filters are toggled on/off or changed values
document.addEventListener('DOMContentLoaded', function() {
  const filterControls = ['category-type', 'event-date', 'zipcode', 'toggle-category', 'toggle-date', 'toggle-zipcode'];
  filterControls.forEach(id => {
    const element = document.getElementById(id);
    element.addEventListener('change', fetchAndDisplayMarkers);
  });

});

// close custom popup
  function closeCustomPopup() {
    document.getElementById('customPopup').style.display = 'none';
  }
  
  // uses google places api to make a drop down menu when user types in address
  function initAutocomplete() {
    const input = document.getElementById('autocomplete');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.addListener('place_changed', function () {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const placeData = {
          geometry: {
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            }
          }
        };
        input.dataset.place = JSON.stringify(placeData);
      } 
      else
      {
        console.log("There are no valid places available");
        throw error;
      }
    });
}
window.closeCustomPopup = closeCustomPopup;
window.initAutocomplete = initAutocomplete;

// rezooms map based on address typed in
document.querySelector('.homePage-form').addEventListener('submit', async (event) => {
  // prevent page from refereshing upon submitting
  event.preventDefault();
  const address = document.getElementById('autocomplete').value;
  await reZoomMap(address);
  // scrolls to bottom page, where the map is
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  if (!mediaQuery.matches)
  {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
  
});

document.getElementById('autocomplete').addEventListener('click', () => {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  if (!mediaQuery.matches)
  {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }
})

// rezooms map based on zipcode in the filter
document.getElementById('zipcode').addEventListener('change', async () => {
  const zipcode = document.getElementById('zipcode').value;
  await reZoomMap(zipcode);
});

async function reZoomMap(value) {
  try {
    // uses mapbox API for zipcodes
    // regex to check if value is a zipcode (5 characters long)
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
        
      }
    }
    // Uses google places API for address
    else
    {
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
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

// declares markers array
let markers = [];

// obtains zipcode from address found in api call json
async function reverseGeocode(lng, lat, regex) {
  let reverseGeoCoding = 'https://api.mapbox.com/search/geocode/v6/reverse?longitude=' + lng + '&latitude=' + lat + '&access_token=' + ACCESS_TOKEN + '';
  const response = await fetch(reverseGeoCoding);
  const data = await response.json();
  const targetKey = 'full_address';
  let zipcode = loopThroughJSON(data, regex, targetKey);
  return String(zipcode);
}

// recursively loops through json (found on stack overflow)
function loopThroughJSON(obj, regex, targetKey) {
  let value = null;
  
  for (let key in obj) {
    if (key === targetKey) {
      if (regex === null)
      {
        return obj[key];
      }
      return obj[key].match(regex);
    }
    
    if (typeof obj[key] === 'object') {
      if (Array.isArray(obj[key])) {
        for (let i = 0; i < obj[key].length; i++) {
          value = loopThroughJSON(obj[key][i], regex, targetKey);
          if (value) 
            return value; 
        }
      } else {
        value = loopThroughJSON(obj[key], regex, targetKey);
        if (value) 
          return value;
      }
    } else {
      console.log(key + ': ' + obj[key]);
    }
  }
  return value; 
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, applyActionCode, getIdToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from '/scripts/firebaseConfig.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.authorizedFetch = async (input, init = {}) => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include' // optional, keep if you use cookies
  });
};

// fetches markers from the custon rest API and places marker on the location using MapBox API
async function fetchAndDisplayMarkers()
{
  try
  {
  // clears existing markers
  markers.forEach(marker => marker.remove());
  markers = [];
  // store volunteer objects in an array
  let categorySelected = "";
  let dateSelected = "";
  let zipcodeSelected = "";
  let GET_REQUEST = "/volunteer-data";
  let filterCounter = 0;
  let useCategory = document.getElementById("toggle-category").checked;
  if (useCategory)
  {
    filterCounter++;
    categorySelected = document.getElementById('category-type').value;
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
      dateSelected = document.getElementById('event-date').value;  
    }
    catch(error)
    {
      console.log("Error in fetching date " + error);
      dateSelected = "01-01-2025";
    }
    console.log(dateSelected);
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
  zipcodeSelected = document.getElementById("zipcode").value;
  await authorizedFetch(GET_REQUEST)
    .then(response => response.json())
    .then(async volunteerObjects => {
      // loops through tasks obtained from firebase
      for (let taskId in volunteerObjects)
        {
          const specificTask = volunteerObjects[taskId];
          const { storeAddress, location, category, task, minAge, external, start_time, end_time, date, description} = specificTask;
      
          if (useZipcode)
          {
            // regex for obtaining the zipcode value directly from an address
            const zipcodeFromAddress = /[0-9]{5}(-[0-9]{4})?/g;
            console.log(location.lat);
            console.log(location.lng);
            const foundZipcode = await reverseGeocode(location.lng, location.lat, zipcodeFromAddress);
            if (parseInt(zipcodeSelected) !== parseInt(foundZipcode))
            {
              // skips task if zipcodes are not the same
              continue;   
            }
          }
          //NOTE FOR LATER: This is to add registrations count back, and this will remove the event if the registration is full
          // try
          // {
          //   if (parseInt(specificTask.registrations.count) >= parseInt(spots))
          //   {
          //     // skips task if sign up is full for that task
          //     continue;
          //   }
          // }
          // catch(error){}
            // map box api to display the marker on the map
            const marker = new mapboxgl.Marker()
              .setLngLat([location.lng, location.lat])
              .addTo(map);
            markers.push(marker);
            marker.getElement().addEventListener('click', () => {
              openCustomPopup(storeAddress, task, taskId, description, start_time, end_time, date, external, minAge);
            });
        }
    })
    .catch(error => {
      console.log("Error in fetching markers" + error);
      console.error("Error details:", error.stack);
    }); 
  console.log("Displayed " + markers.length + " markers on the map");
  }
  catch(error)
  {
    console.log("Front end error " + error);
  }
}

function convertTime(militaryTime) {
  const parts = militaryTime.split(":");
  const hour = parseInt(parts[0]);
  const minute = parts[1];
  let period = "AM";
  if (hour >= 12) {
    period = "PM";
  }
  let standardHour = hour % 12;
  if (standardHour === 0) {
    standardHour = 12;
  }
  return standardHour + ":" + minute + " " + period;
}

// Function to open the custom popup, viewing the details for a certain task on
async function openCustomPopup(storeAddress, task, taskId, description, start_time, end_time, date, external, minAge) {
  document.getElementById('popupTask').innerText = "";
  document.getElementById('popupDescription').innerText = "";
  document.getElementById('popupTiming').innerText = "";
  document.getElementById('popupLink').innerText = "";
  document.getElementById('popupAge').innerText = "";
  if (document.getElementById('ageDisplayText').classList.contains('d-none'))
  {
    document.getElementById('ageDisplayText').classList.remove('d-none');
  }
  if (document.getElementById('timingDisplayText').classList.contains('d-none'))
  {
    document.getElementById('timingDisplayText').classList.remove('d-none');
  }
  document.getElementById('popupTiming').innerText = "";

  document.getElementById('popupTask').innerText = task;
  document.getElementById('popupDescription').innerText = description;
  if (!(date) && !(start_time))
  {
    document.getElementById('timingDisplayText').classList.add("d-none");
  }
  else
  {
    document.getElementById('popupTiming').innerText = (date ? date : '') + ' ' + (start_time ? convertTime(start_time) : '') + (end_time ? " - " + convertTime(end_time) : '');
  }
  
  document.getElementById('popupLink').innerText = external;
  // Optional because some tasks may not have minimum age
  if (minAge)
  {
    document.getElementById('popupAge').innerText = minAge;
  }
  else
  {
    document.getElementById('ageDisplayText').classList.add("d-none");
  }
  
  document.getElementById('popupTag').setAttribute("href", external);
  document.getElementById('customPopup').style.display = 'block';
  

  const emailError = document.getElementById("emailError");
  const emailSuccess = document.getElementById("emailSuccess");
  emailError.textContent = "";
  if (!(emailSuccess.classList.contains("hidden")))
  {
    emailSuccess.classList.add("hidden");
  }
  
  // sends an email and updates registrations in firebase if register button is clicked
  document.getElementById('registerBtn').onclick = async function () {
    emailError.textContent = "";
    if (!(emailSuccess.classList.contains("hidden")))
    {
      emailSuccess.classList.add("hidden");
    }
    const email = document.getElementById('popupEmail').value.trim();
    document.getElementById('registerBtn').disabled = true;
    await fetch('/map/email', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, storeAddress, taskId, task, description, start_time, end_time, date, external }),
        })
        .then(async response => {
          if (!response.ok)
          {
            const errorBody = await response.json();
            const error = new Error(errorBody.error);
            error.status = response.status;
            throw error;
          }
          return response.json();
        })
        .then(data => {
            console.log(data);
            emailSuccess.classList.remove("hidden");
        })
        .catch(error => {        
          if (error.status === 400 || error.status === 404 || error.status === 405)
          {
            emailError.textContent = error;
          }
          else
          {
            emailError.textContent = "An unknown error occured when trying to register";
            console.log(error);
          }
    });
      document.getElementById('registerBtn').disabled = false;
    };
    
}