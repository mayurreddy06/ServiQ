import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from './firebaseConfig.js'

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function updateNavbar(user) {
  const rightHeader = document.querySelector('.right-header');
  if (!rightHeader) return;
  
  // Set visibility to hidden while updating
  rightHeader.style.visibility = 'hidden';
  
  const newContent = user ? `
    <div><a href="homepage.html">Home</a></div>
    <div><a href="map.html">Volunteer</a></div>
    <div><a href="taskpost.html">Tasks</a></div>
    <div id="logout-link" class="user-email">${user.email}</div>
  ` : `
    <div><a href="homepage.html">Home</a></div>
    <div><a href="map.html">Volunteer</a></div>
    <div><a href="signlog.html">Login</a></div>
  `;

  if (rightHeader.innerHTML !== newContent) {
    rightHeader.innerHTML = newContent;
    
    if (user) {
      document.getElementById('logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        rightHeader.style.visibility = 'hidden';
        signOut(auth).then(() => {
          window.location.href = 'homepage.html';
        }).catch((error) => {
          console.error('Sign out error:', error);
          rightHeader.style.visibility = 'visible';
        });
      });
    }
  }
  
  // Show navbar after update is complete
  rightHeader.style.visibility = 'visible';
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

// Use a promise to handle auth state
const authStatePromise = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    resolve(user);
  });
});

// Wait for auth state to be determined before rendering page content
authStatePromise.then(user => {
  updateNavbar(user);
  
  if (user) {
    console.log("User is signed in:", user.email);
    
    if (window.location.pathname.includes('signlog.html')) {
      window.location.href = 'homepage.html';
    }
  } else {
    console.log("No user is signed in");
  }
  
  // Initialize page content after auth state is determined
  initializePageContent(user);
  
  // Remove loading indicator
  removeLoadingIndicator();
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

async function login(event) {
    event.preventDefault();
    
    // Show loading indicator during login
    addLoadingIndicator();

    const email = document.getElementById('email-entry').value;
    const password = document.getElementById('password-entry').value;

    try {
        const accountCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = accountCredential.user;

        console.log("Logged in successfully: ", user);
        window.location.href = 'homepage.html';
    } catch(error) {
        console.error("Error logging in:", error.message);

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
    signinForm.addEventListener('submit', login);
}