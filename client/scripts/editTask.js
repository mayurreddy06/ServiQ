

document.addEventListener('DOMContentLoaded', () =>
{
  let elements;
  setTimeout (() => {
    elements = document.querySelectorAll(".edit-button");
     elements.forEach((editManual) => {
      editManual.addEventListener("click", async () => {
        const timestamp = editManual.id;
        console.log(timestamp);
        await fetch('/volunteer-data?timestamp=' + timestamp)
        .then(response => response.json())
        .then(data => {
          // FIX USE QUERY SELECTOR AND ADD A COMMON CLASS FOR THE ALL EDIT ONES
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
            document.querySelector(".autocompletePATCH").setAttribute("value", storeAddress);
            document.querySelector(".datePATCH").setAttribute("value", date);
            document.querySelector(".start_timePATCH").setAttribute("value", start_time);
            document.querySelector(".end_timePATCH").setAttribute("value", end_time);
            const categoryOptions = document.querySelectorAll(".inp-cbxPATCH");
            for (let i = 0; i < categoryOptions.length; i++)
            {
                if (categoryOptions[i].value === category)
                {
                    categoryOptions[i].checked = true;
                }
            }
            document.querySelector(".volunteer-countPATCH").setAttribute("value", spots);
            document.querySelector(".taskPATCH").setAttribute("value", taskName);
            document.querySelector(".descriptionPATCH").textContent = description;    
            document.querySelector(".edit-post").addEventListener("submit", async function(event) {
            event.preventDefault();
            const storeAddress =  document.querySelector(".autocompletePATCH").value;
            const date = document.querySelector(".datePATCH").value;
            const start_time = document.querySelector(".start_timePATCH").value;
            const end_time = document.querySelector(".end_timePATCH").value;
            const category = document.querySelector(".inp-cbxPATCH:checked")?.value;
            const spots = document.querySelector('.volunteer-countPATCH').value;
            const task = document.querySelector('.taskPATCH').value;
            const description = document.querySelector('.descriptionPATCH').value;
            const autocompleteInput = document.querySelector('.autocompletePATCH');
            console.log(storeAddress, date);
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
          })
        })
        .catch(error => {
          console.log(error);
        });
      })
    })
  }, 1200);
  });

// document.querySelector(".edit-post").addEventListener("submit", async function(event) {
//     event.preventDefault();
//     const url = window.location.href
//     const lastIndex = url.lastIndexOf('/');
//     const timestamp = url.substring(lastIndex + 1);
//     const storeAddress = document.getElementById('autocomplete').value;
//     const date = document.getElementById('date').value;
//     const start_time = document.getElementById('start_time').value;
//     const end_time = document.getElementById('end_time').value;
//     const category = document.querySelector(".inp-cbx:checked")?.value;
//     const spots = document.getElementById('volunteer-count').value;
//     const task = document.getElementById('task').value;
//     const description = document.getElementById('description').value;
//     const autocompleteInput = document.getElementById('autocomplete');
//     // API ISSUES
//     const place = await JSON.parse(autocompleteInput.dataset.place);
//     let lng = place.geometry.location.lng;
//     let lat = place.geometry.location.lat;

//     const volunteerData = { 
//         storeAddress, 
//         category,
//         start_time, 
//         end_time, 
//         spots,
//         timestamp,
//         task,
//         location: {lat, lng},
//         date, 
//         description,
//       }
//     await fetch('/volunteer-data/' + timestamp, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(volunteerData),
//     })
//     .then(async response => await response.json())
//     .then(data => {
//         console.log(data);
//         window.location.href = "/admin/view";
//     })
//     .catch(error => {
//         console.log("There was an error updating the fields");
//         console.log(error);
//     });
// });
// function initAutocomplete() {
//   const input = document.getElementById('autocomplete');
//   if (!input) {
//     console.error("Autocomplete input element not found");
//     return;
//   }
  
//   const autocomplete = new google.maps.places.Autocomplete(input);

//   autocomplete.addListener('place_changed', function () {
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