window.onload = async function ()
{
    const url = window.location.href
    const lastIndex = url.lastIndexOf('/');
    const timestamp = url.substring(lastIndex + 1);
    await fetch('/volunteer-data?timestamp=' + timestamp)
        .then(response => response.json())
        .then(data => {
            const task = Object.values(data)[0];
            console.log(task);
            const storeAddress = task.storeAddress;
            const date = task.date;
            const start_time = task.start_time;
            const end_time = task.end_time;
            const category = task.category;
            // check category
            const spots = task.spots;
            const taskName = task.task;
            const description = task.description;
            console.log("this is the description" + description);
            document.getElementById("autocomplete").setAttribute("value", storeAddress);
            document.getElementById("date").setAttribute("value", date);
            document.getElementById("start_time").setAttribute("value", start_time);
            document.getElementById("end_time").setAttribute("value", end_time);
            const categoryOptions = document.querySelectorAll(".inp-cbx");
            for (let i = 0; i < categoryOptions.length; i++)
            {
                if (categoryOptions[i].value === category)
                {
                    categoryOptions[i].checked = true;
                }
            }
            document.getElementById("volunteer-count").setAttribute("value", spots);
            document.getElementById("task").setAttribute("value", taskName);
            document.getElementById("description").textContent = description;
        
        })
        .catch(error => {
          console.log(error);
        });
}

document.querySelector(".task-post").addEventListener("submit", async function(event) {
    event.preventDefault();
    const url = window.location.href
    const lastIndex = url.lastIndexOf('/');
    const timestamp = url.substring(lastIndex + 1);
    const storeAddress = document.getElementById('autocomplete').value;
    const date = document.getElementById('date').value;
    const start_time = document.getElementById('start_time').value;
    const end_time = document.getElementById('end_time').value;
    const category = document.querySelector(".inp-cbx:checked")?.value;
    const spots = document.getElementById('volunteer-count').value;
    const task = document.getElementById('task').value;
    const description = document.getElementById('description').value;
    const autocompleteInput = document.getElementById('autocomplete');
    // API ISSUES
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
      }
    await fetch('/volunteer-data/' + timestamp, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(volunteerData),
    })
    .then(async response => await response.json())
    .then(data => {
        console.log(data);
        window.location.href = "/admin/view";
    })
    .catch(error => {
        console.log("There was an error updating the fields");
        console.log(error);
    });
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