import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

// safely wrap firebase token in fetch
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
    credentials: 'include'
  });
};

// on load, the page fetches data from the API (based on who the user is) and creates a table with the tasks that they created
window.onload = async function()
{
    // this is to safely retrieve data for each user without passing in the uid on the client side
    await authorizedFetch('/volunteer-data?secure=yes')
        .then(response => response.json())
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

                let spotsValue = "";
                try
                {
                  spotsValue = (parseInt(taskData.spots) - parseInt(taskData.registrations.count)) + "/" + taskData.spots;
                }
                catch(error)
                {
                  spotsValue = taskData.spots + "/" + taskData.spots;
                }
                editButton.classList.add("edit-button", "btn", "taskPost-btn");
                editButton.setAttribute("data-bs-toggle", "modal");
                editButton.setAttribute("data-bs-target", "#PATCHModal");
                editButton.id = taskData.timestamp;
                deleteButton.classList.add("button-cta", "btn", "taskPost-btn");
                deleteButton.id = taskData.timestamp;

                task.textContent = taskData.task;
                date.textContent = taskData.date;
                startTime.textContent = taskData.start_time;
                address.textContent = taskData.storeAddress;
                spots.textContent = spotsValue;
                editButton.textContent = "Edit";
                deleteButton.textContent = "Delete";

                // This was here earlier to link to a custom page to edit each task, could be added back later if nessecary
                // editButton.addEventListener("click", async function(event) {
                //     const timestamp = this.id;
                //     console.log(timestamp);
                //     window.location.href += "/" + timestamp;
                // });

                // Delete Tasks
                deleteButton.addEventListener("click", async function(event) {
                  event.preventDefault();
                  let buttons = document.querySelectorAll("button");
                  buttons.forEach((button) => {
                    button.disabled = true;
                  });
                    const timestamp = this.id;
                    console.log(timestamp);
                    await authorizedFetch('/volunteer-data/' + timestamp, {
                        method: 'DELETE',
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log(data);
                        let alert = document.getElementById("messageSuccess");
                        alert.classList.remove("d-none");
                        let alertText = document.getElementById("databaseMessage");
                        alertText.textContent = "Volunteer Event Successfully Deleted"
                        
                        setTimeout(() => {
                          window.location.reload();
                        }, 2500)  
                    })
                    .catch(error => {
                        console.log("Error deleting task from firebase");
                        console.log(error);
                        let alert = document.getElementById("messageFailed");
                        alert.classList.remove("d-none");
                        setTimeout(() => {
                          window.location.reload();
                        }, 2500)
                    });
                });

                editColumn.appendChild(editButton);
                deleteColumn.appendChild(deleteButton);

                newRow.appendChild(task);
                newRow.appendChild(date);
                newRow.appendChild(startTime);
                newRow.appendChild(address);
                // NOTE TO FUTURE SELF: to display spots, uncomment the line below, and viewPosts.ejs table code at the very bottom
                // newRow.appendChild(spots);
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
function initAutocomplete(event) {
  const input = event.target;
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
window.initAutocomplete = initAutocomplete;

// flatpickr css
document.addEventListener('DOMContentLoaded', function () {
  // Initialize Flatpickr on the date input
  flatpickr('#datePOST', {
      dateFormat: 'Y-m-d',
      minDate: 'today',
  })
  flatpickr('#datePATCH', {
      dateFormat: 'Y-m-d',
      minDate: 'today',
  })
});
var myModal = document.getElementById('myModal')
var myInput = document.getElementById('myInput')
