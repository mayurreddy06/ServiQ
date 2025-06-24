import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const auth = getAuth();

// authorized fetch to automatically receive Firebase Token and pass it in any user authentication API call
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

// add information for each tasks in the edit modules
document.addEventListener('DOMContentLoaded', () => {
  let elements;
  let currentTimestamp; // Store the current timestamp being edited
  
  setTimeout(() => {
    // edit button is generated dynamically in front-end javascript from API call, edit-button class wont be found in viewPosts.ejs
    elements = document.querySelectorAll(".edit-button");
    elements.forEach((editManual) => {
      editManual.addEventListener("click", async () => {
        const timestamp = editManual.id;
        currentTimestamp = timestamp; // Store the timestamp for later use
        console.log(timestamp);
        await authorizedFetch('/volunteer-data?timestamp=' + timestamp)
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
          const minAge = task.minAge;
          const taskName = task.task;
          const external = task.external;
          const description = task.description;
          // commented out --- theres an error if you dont reselect the value so jsut gonna have people reselect it
          // document.querySelector(".autocompletePATCH").setAttribute("value", storeAddress);
          document.querySelector(".datePATCH").setAttribute("value", date);
          document.querySelector(".start_timePATCH").setAttribute("value", start_time);
          document.querySelector(".end_timePATCH").setAttribute("value", end_time);
          const categoryOptions = document.querySelectorAll(".inp-cbxPATCH");
          for (let i = 0; i < categoryOptions.length; i++) {
            if (categoryOptions[i].value === category) {
              categoryOptions[i].checked = true;
            }
          }
          document.querySelector(".minAgePATCH").setAttribute("value", minAge);
          document.querySelector(".taskPATCH").setAttribute("value", taskName);
          document.querySelector(".externalPATCH").setAttribute("value", external);
          document.querySelector(".descriptionPATCH").textContent = description;
        })
        .catch(error => {
          console.log(error);
        });
      })
    })
  }, 1200);

  // submitting the edited tasks to the backend
  document.querySelector(".edit-post").addEventListener('submit', async function(event) {
    // Check if the submitted form is the edit form
      event.preventDefault();
      let buttons = document.querySelectorAll("button");
      buttons.forEach((button) => {
        button.disabled = true;
      });
      
      // data start time end time and minAge are all optional
      const storeAddress = document.querySelector(".autocompletePATCH").value;
      const date = document.querySelector(".datePATCH")?.value;
      const start_time = document.querySelector(".start_timePATCH")?.value;
      const end_time = document.querySelector(".end_timePATCH")?.value;
      const category = document.querySelector(".inp-cbxPATCH:checked").value;
      const minAge = document.querySelector('.minAgePATCH')?.value;
      const task = document.querySelector('.taskPATCH').value;
      const external = document.querySelector('.externalPATCH').value;
      const description = document.querySelector('.descriptionPATCH').value;
      const autocompleteInput = document.querySelector('.autocompletePATCH');
      
      let lat;
      let lng;
      try {
        const place = await JSON.parse(autocompleteInput.dataset.place);
        lng = place.geometry.location.lng;
        lat = place.geometry.location.lat;
      }
      catch(error) {
        document.getElementById("addressErrorMessagePATCH").textContent = "Please select address from dropdown";
        const targetElement = document.getElementById("addressErrorMessagePATCH").parentElement.parentElement;
        // scroll up to address if dropdown is not selected
        targetElement.scrollIntoView({ behavior: 'smooth' });
        throw error;
      }

      const volunteerData = { 
        storeAddress, 
        category,
        start_time, 
        end_time, 
        minAge,
        timestamp: currentTimestamp, // Use the stored timestamp
        task,
        external,
        location: {lat, lng},
        date, 
        description,
      }
      
      await authorizedFetch('/volunteer-data/' + currentTimestamp, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(volunteerData),
      })
        .then(async response => await response.json())
        .then(data => {
          const form = bootstrap.Modal.getInstance(document.getElementById("PATCHModal"));
          form.hide();
          let alert = document.getElementById("messageSuccess");
          alert.classList.remove("d-none");
          let alertText = document.getElementById("databaseMessage");
          alertText.textContent = "Volunteer Event Successfully Updated"
          
          setTimeout(() => {
            window.location.reload();
          }, 2500)
        })
        .catch(error => {
          const form = bootstrap.Modal.getInstance(document.getElementById("PATCHModal"));
          form.hide();
          let alert = document.getElementById("messageFailed");
          alert.classList.remove("d-none");
          setTimeout(() => {
            window.location.reload();
          }, 2500)
        });
  });
});