document.querySelector(".task-post").addEventListener("submit", async function(event) {
    event.preventDefault();
    try {
      // Validate required fields
      const storeAddress = document.getElementById('autocomplete').value;
      const date = document.getElementById('date').value;
      const start_time = document.getElementById('start_time').value;
      const end_time = document.getElementById('end_time').value;
      const category = document.querySelector(".inp-cbx:checked")?.value;
      const spots = document.getElementById('volunteer-count').value;
      const task = document.getElementById('task').value;
      const description = document.getElementById('description').value;
      const timestamp = Date.now();
  
      // google places API to find lng & lat
      const autocompleteInput = document.getElementById('autocomplete');
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
      await fetch('/volunteer-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(volunteerData),
      })
      .then(response => response.json())
      .then(data => {
        alert("Task successfully posted!");
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
  
  document.addEventListener('DOMContentLoaded', function () {
    // Initialize Flatpickr on the date input
    flatpickr('#date', {
        dateFormat: 'Y-m-d',
        minDate: 'today',
    })
  });
    