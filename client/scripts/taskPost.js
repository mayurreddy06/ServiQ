import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

// Wrap native fetch to automatically attach the Firebase ID token
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


document.querySelector(".task-post").addEventListener("submit", async function(event) {
    event.preventDefault();
    try {
      // Validate required fields
      const storeAddress = document.querySelector('.autocompletePOST').value;
      const date = document.querySelector('.datePOST').value;
      const start_time = document.querySelector('.start_timePOST').value;
      const end_time = document.querySelector('.end_timePOST').value;
      const category = document.querySelector(".inp-cbxPOST:checked")?.value;
      const spots = document.querySelector('.volunteer-countPOST').value;
      const task = document.querySelector('.taskPOST').value;
      const description = document.querySelector('.descriptionPOST').value;
      const timestamp = Date.now();
      console.log(storeAddress, date, start_time, end_time, category, spots, task, description);
  
      // google places API to find lng & lat
      const autocompleteInput = document.querySelector('.autocompletePOST');
      const place = await JSON.parse(autocompleteInput.dataset.place);
      let lng = place.geometry.location.lng;
      let lat = place.geometry.location.lat;
  
      const volunteerData = { 
        storeAddress, 
        category,
        start_time, 
        end_time, 
        spots,
        timestamp,
        task,
        location: {lat, lng},
        date, 
        description,
      };
      await authorizedFetch('/volunteer-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(volunteerData),
      })
      .then(response => response.json())
      .then(data => {
        setTimeout(function() {
          window.location.reload();
        }, 500)

      })
      .catch(error => {
        console.log(error);
      });
    }
    catch(error)
    {
      console.log("Error in front end" + error.message);
    }
  
  });
  // function initAutocomplete() {
  //   console.log("this has been executed");
  //   const input = document.getElementById('autocomplete');
  //   if (!input) {
  //     console.error("Autocomplete input element not found");
  //     return;
  //   }
  //   console.log("working...");
    
  //   const autocomplete = new google.maps.places.Autocomplete(input);

  //   console.log(autocomplete);
  
  //   autocomplete.addListener('place_changed', function () {
  //     console.log("hi");
  //     const place = autocomplete.getPlace();
  //     console.log('Place selected:', place);
  
  //     if (place.geometry && place.geometry.location) {
  //       // Store only the coordinates
  //       const placeData = {
  //         geometry: {
  //           location: {
  //             lat: place.geometry.location.lat(),
  //             lng: place.geometry.location.lng()
  //           }
  //         }
  //       };
  //       input.dataset.place = JSON.stringify(placeData);
  //       console.log('Stored place data:', placeData);

  //     } else {
  //       console.log("No valid coordinates found.");
  //     }
  //   });
  // }
  
  // document.addEventListener('DOMContentLoaded', function () {
  //   // Initialize Flatpickr on the date input
  //   flatpickr('#date', {
  //       dateFormat: 'Y-m-d',
  //       minDate: 'today',
  //   })
  //   flatpickr("#timeInput", {
  //   enableTime: true,
  //   noCalendar: true,
  //   dateFormat: "H:i",  // 24-hour format; use "h:i K" for 12-hour + AM/PM
  //   time_24hr: true
  //   })
  // });

