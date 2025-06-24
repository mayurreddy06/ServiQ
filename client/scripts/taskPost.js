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


document.querySelector(".task-post").addEventListener("submit", async function(event) {
    event.preventDefault();
    let buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
      button.disabled = true;
    });
    try {
      // date start time end time minimum age are not required
      const storeAddress = document.querySelector('.autocompletePOST').value;
      const date = document.querySelector('.datePOST')?.value;
      const start_time = document.querySelector('.start_timePOST')?.value;
      const end_time = document.querySelector('.end_timePOST')?.value;
      const category = document.querySelector(".inp-cbxPOST:checked").value;
      let minAge = document.querySelector('.minAgePOST')?.value;
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
