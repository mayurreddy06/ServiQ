import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from './firebaseConfig.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Debug function to log current URL
function logCurrentUrl() {
  console.log("Current URL:", window.location.href);
  console.log("Current pathname:", window.location.pathname);
}

// Function to ensure navbar styling is preserved
function ensureNavbarStyling() {
  const rightHeader = document.querySelector('.right-header');
  if (!rightHeader) {
    console.log("No right-header element found for styling check");
    return;
  }
  
  // Check if the navbar has the correct structure
  const links = rightHeader.querySelectorAll('a');
  if (links.length > 0) {
    // Ensure all links have the correct classes
    links.forEach(link => {
      if (link.href.includes('newSignlog.html')) {
        if (!link.classList.contains('login-cta')) {
          link.classList.add('login-cta');
        }
      } else {
        if (!link.classList.contains('link-cta')) {
          link.classList.add('link-cta');
        }
      }
    });
  }
  
  // Check if the logout button has the correct class
  const logoutBtn = document.getElementById('logout-link');
  if (logoutBtn && !logoutBtn.classList.contains('login-cta')) {
    logoutBtn.classList.add('login-cta');
  }
}

// Update navbar based on auth state
function updateNavbar(user) {
  console.log("Updating navbar, user:", user ? user.email : "not logged in");
  
  const rightHeader = document.querySelector('.right-header');
  if (!rightHeader) {
    console.log("No right-header element found");
    return;
  }
  
  // Set visibility to hidden while updating
  rightHeader.style.visibility = 'hidden';
  
  // Create the navbar content based on auth state
  if (user) {
    // User is logged in
    rightHeader.innerHTML = `
      <div class="nav-links">
        <a href="/homepage2.html" class="link-cta">Home</a>
        <a href="/map.html" class="link-cta">Volunteer</a>
        <a href="/taskpost.html" class="link-cta">Tasks</a>
      </div>
      <div class="user-section">
        <span class="user-email" id="user-email-display">${user.email}</span>
        <div id="logout-container">
          <button id="logout-link" class="login-cta">Sign Out</button>
        </div>
      </div>
    `;
    
    // Add event listener to email display to toggle logout button
    const emailDisplay = document.getElementById('user-email-display');
    const logoutContainer = document.getElementById('logout-container');
    const logoutBtn = document.getElementById('logout-link');
    
    if (emailDisplay && logoutContainer) {
      emailDisplay.style.cursor = 'pointer';
      
      emailDisplay.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        // Toggle logout container visibility
        if (logoutContainer.style.display === 'none' || !logoutContainer.style.display) {
          logoutContainer.style.display = 'block';
        } else {
          logoutContainer.style.display = 'none';
        }
      });
      
      // Hide logout container when clicking elsewhere on the page
      document.addEventListener('click', (e) => {
        if (e.target !== emailDisplay && !logoutContainer.contains(e.target)) {
          logoutContainer.style.display = 'none';
        }
      });
    }
    
    // Add event listener to logout button
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling up
        console.log("Logout button clicked");
        rightHeader.style.visibility = 'hidden';
        signOut(auth).then(() => {
          console.log("Sign out successful, redirecting to homepage");
          window.location.href = '/homepage2.html';
        }).catch((error) => {
          console.error('Sign out error:', error);
          rightHeader.style.visibility = 'visible';
        });
      });
    }
  } else {
    // User is not logged in
    rightHeader.innerHTML = `
      <div class="nav-links">
        <a href="/homepage2.html" class="link-cta">Home</a>
        <a href="/map.html" class="link-cta">Learn more</a>
        <a href="/newSignlog.html" class="login-cta">Login Here</a>
      </div>
    `;
  }
  
  // Show navbar after update is complete
  rightHeader.style.visibility = 'visible';
  
  // Ensure navbar styling is preserved
  ensureNavbarStyling();
}

// Add a loading indicator to the page
function addLoadingIndicator() {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'auth-loading';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;
  
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
  `;
  
  // Add keyframes for spinner animation
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  
  loadingDiv.appendChild(spinner);
  document.body.appendChild(loadingDiv);
}

function removeLoadingIndicator() {
  const loadingDiv = document.getElementById('auth-loading');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

// Add loading indicator on page load
addLoadingIndicator();

// Log current URL for debugging
logCurrentUrl();

// Use a promise to handle auth state
const authStatePromise = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    console.log("Auth state changed:", user ? "User logged in" : "No user");
    resolve(user);
  });
});

// Wait for auth state to be determined before rendering page content
authStatePromise.then(user => {
  updateNavbar(user);
  
  if (user) {
    console.log("User is signed in:", user.email);
    
    if (window.location.pathname.includes('newSignlog.html')) {
      console.log("User is on login page, redirecting to homepage");
      window.location.href = 'homepage2.html';
    }
  } else {
    console.log("No user is signed in");
  }
  
  // Initialize page content after auth state is determined
  initializePageContent(user);
  
  // Remove loading indicator
  removeLoadingIndicator();
  
  // Ensure navbar styling is preserved after page load
  ensureNavbarStyling();
});

// Function to initialize any page-specific content
function initializePageContent(user) {
  // This function can be customized for each page
  // For example, you might show/hide certain elements based on auth state
  
  // Only show task-related elements if user is logged in
  const taskElements = document.querySelectorAll('.task-element');
  if (taskElements.length > 0) {
    taskElements.forEach(el => {
      el.style.display = user ? 'block' : 'none';
    });
  }
}

// Login function
async function login(event) {
  event.preventDefault();
  console.log("Login function called");
  
  // Show loading indicator during login
  addLoadingIndicator();

  const email = document.getElementById('email-entry').value;
  const password = document.getElementById('password-entry').value;
  
  console.log("Attempting login with email:", email);
  // Don't log actual password for security reasons

  try {
      console.log("Calling signInWithEmailAndPassword...");
      const accountCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = accountCredential.user;

      console.log("Logged in successfully: ", user);
      console.log("Redirecting to homepage...");
      window.location.href = '/homepage2.html';
  } catch(error) {
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      removeLoadingIndicator();
      
      const errorElement = document.getElementById('login-error');
      if (errorElement) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          errorElement.textContent = "An account with this email doesn't exist or the password is incorrect.";
        } else {
          errorElement.textContent = error.message;
        }

        errorElement.style.display = 'block';
      }
  }
}

// Only add event listener if the signin form exists
const signinForm = document.querySelector('#signin-form');
if (signinForm) {
    console.log("Signin form found, adding event listener");
    signinForm.addEventListener('submit', login);
} else {
    console.log("No signin form found on this page");
}