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
    let buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = true;
    });
    try {
      // Validate required fields
      const storeAddress = document.querySelector('.autocompletePOST').value;
      const date = document.querySelector('.datePOST').value;
      const start_time = document.querySelector('.start_timePOST').value;
      const end_time = document.querySelector('.end_timePOST').value;
      const category = document.querySelector(".inp-cbxPOST:checked")?.value;
      let minAge = document.querySelector('.minAgePOST')?.value;
      if (!(minAge))
      {
        minAge = "None"
      }
      const task = document.querySelector('.taskPOST').value;
      const external = document.querySelector('.externalPOST').value;
      const description = document.querySelector('.descriptionPOST').value;
      const timestamp = Date.now();
  
      let lng;
      let lat;
      // google places API to find lng & lat
      try
      {
        const autocompleteInput = document.querySelector('.autocompletePOST');
        const place = await JSON.parse(autocompleteInput.dataset.place);
        lng = place.geometry.location.lng;
        lat = place.geometry.location.lat;
      }
      catch(error)
      {
        document.getElementById("addressErrorMessagePOST").textContent = "Please select address from dropdown";
        const targetElement = document.getElementById("addressErrorMessagePOST").parentElement.parentElement;
        targetElement.scrollIntoView({ behavior: 'smooth' });
        throw error;
      }
      
  
      const volunteerData = { 
        storeAddress, 
        category,
        start_time, 
        end_time, 
        minAge,
        timestamp,
        task,
        external,
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
        const form = bootstrap.Modal.getInstance(document.getElementById("POSTModal"));
        form.hide();
        let alert = document.getElementById("messageSuccess");
        alert.classList.remove("d-none");
        let alertText = document.getElementById("databaseMessage");
        alertText.textContent = "Volunteer Event Successfully Added"
        
        setTimeout(() => {
          window.location.reload();
        }, 2500)

      })
      .catch(error => {
        console.log(error);
        const form = bootstrap.Modal.getInstance(document.getElementById("POSTModal"));
        form.hide();
        let alert = document.getElementById("messageFailed");
        alert.classList.remove("d-none");
        setTimeout(() => {
          window.location.reload();
        }, 2500)
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

