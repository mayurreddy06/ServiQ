const emailDisplay = document.getElementById('user-email-display');
const logoutContainer = document.getElementById('logout-container');
const logoutBtn = document.getElementById('logout-link');
    
if (emailDisplay && logoutContainer) {
    emailDisplay.style.cursor = 'pointer';
      
    emailDisplay.addEventListener('click', (e) => {
    e.stopPropagation();
    // Toggle logout container visibility
    if (logoutContainer.style.display === 'none' || !logoutContainer.style.display) {
      logoutContainer.style.display = 'block';
    } else {
      logoutContainer.style.display = 'none';
    }
    });
}
document.addEventListener('click', (e) => {
if (e.target !== emailDisplay && !logoutContainer.contains(e.target)) 
{
    logoutContainer.style.display = 'none'; 
}
});

document.getElementById('logout-link').addEventListener('click', async () => {
    await fetch('/auth/logout')
        .then(response => response.json())
        .then(data => {
            window.location.href = "/"
        })
        .catch(error)
        {
            console.log(error);
        }
});


//the following is code for smooth transitions
document.addEventListener("DOMContentLoaded", function () {
    const emailDisplay = document.getElementById("user-email-display");
    const logoutContainer = document.getElementById("logout-container");

    emailDisplay.addEventListener("click", () => {
        logoutContainer.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
        if (!logoutContainer.contains(e.target) && e.target !== emailDisplay) {
            logoutContainer.classList.remove("show");
        }
    });
});
