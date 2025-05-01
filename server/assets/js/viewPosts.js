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

                // editButton.classList.add("button-cta", "edit-cta");
                // editButton.id = taskData.timestamp;
                // deleteButton.classList.add("button-cta", "delete-cta");
                // deleteButton.id = taskData.timestamp;

                task.textContent = taskData.task;
                date.textContent = taskData.date;
                startTime.textContent = taskData.start_time;
                address.textContent = taskData.storeAddress;
                spots.textContent = taskData.spots;

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

// theres multiple delete-cta class names, so having a listening event only selects for the first one
// document.querySelectorAll(".delete-cta").forEach(button => {
//     button.addEventListener("click", async function(event) {
//         const timestamp = this.id;
//         await fetch('http://localhost:3002/volunteer-data/:' + timestamp, {
//             method: 'DELETE',
//           })
//           .catch(error => {
//             console.log("Error deleting task from firebase");
//             console.log(error);
//           })
//         this.parentNode.textContent = '';
//     });
// });

