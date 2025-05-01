window.onload = async function()
{
    let email;
    await fetch('http://localhost:3002/auth/status')
        .then(async response => await response.json())
        .then(data => {
        email = data.user.email;
        })
        .catch(error => {
        email = "userNotLoggedIn@gmail.com";
    });
    await fetch('http://localhost:3002/volunteer-data?email=' + email)
        .then(async response => await response.json())
        .then(volunteerTasks => {
            for (const taskID in volunteerTasks)
            {
                const taskData = volunteerTasks[taskID];
                let newRow = document.createElement("tr"); 
                let task = document.createElement("td");
                let date = document.createElement("td");                          
                let startTime = document.createElement("td");                            
                let address = document.createElement("td");                    
                let spots = document.createElement("td");
                let editColumn = document.createElement("td");
                let deleteColumn  = document.createElement("td");
                let editButton = document.createElement("button");
                let deleteButton = document.createElement("button");

                editButton.classList.add("button-cta", "edit-cta");
                editButton.id = taskData.timestamp;
                deleteButton.classList.add("button-cta", "delete-cta");
                deleteButton.id = taskData.timestamp;

                task.textContent = taskData.task;
                date.textContent = taskData.date;
                startTime.textContent = taskData.start_time;
                address.textContent = taskData.storeAddress;
                spots.textContent = taskData.spots;
                editButton.textContent = "edit";
                deleteButton.textContent = "delete";

                editButton.addEventListener("click", async function(event) {
                    const timestamp = this.id;
                    console.log(timestamp);
                    window.location.href = "/admin/edit/" + timestamp;
                });

                deleteButton.addEventListener("click", async function(event) {
                    const timestamp = this.id;
                    console.log(timestamp);
                
                    await fetch('http://localhost:3002/volunteer-data/' + timestamp, {
                        method: 'DELETE',
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log(data);
                        window.location.reload();
                    })
                    .catch(error => {
                        console.log("Error deleting task from firebase");
                        console.log(error);
                    });
                });

                editColumn.appendChild(editButton);
                deleteColumn.appendChild(deleteButton);

                newRow.appendChild(task);
                newRow.appendChild(date);
                newRow.appendChild(startTime);
                newRow.appendChild(address);
                newRow.appendChild(spots);
                newRow.appendChild(editColumn);
                newRow.appendChild(deleteColumn);

                document.getElementById("viewTable").appendChild(newRow);
            }
        })
        .catch(error => {
        console.log(error);
        console.log("Error fetching volunteer data");
    });
}
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
      dateFormat: 'Y-m-d', // Optional format for the date
      minDate: 'today',    // Optional: Prevent selecting past dates
  })
});
