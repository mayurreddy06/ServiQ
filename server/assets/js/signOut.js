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
if (e.target !== emailDisplay && !logoutContainer.contains(e.target)) {
logoutContainer.style.display = 'none'; }
});

document.getElementById('logout-link').addEventListener('click', async () => {
    try {
        const response = await fetch ('http://localhost:3002/auth/logout');
        if (response.ok)
        {
            const status = await response.json();
            window.location.href = "/";
        }
        else {
            console.error('Server returned an error:', response.status);
        }

    } catch (error) {
        console.error(error);
        const errorCode = error.code;
        const errorMessage = error.message;
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
