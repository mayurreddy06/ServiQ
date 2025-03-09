import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from './firebaseConfig.js'

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function updateNavbar(user) {
  const rightHeader = document.querySelector('.right-header');
  if (!rightHeader) return;
  
  rightHeader.style.visibility = 'visible'; // Show the nav once we know auth state
  
  if (user) {
    // User is signed in, show logged-in options
    rightHeader.innerHTML = `
      <div><a href="homepage.html">Home</a></div>
      <div><a href="map.html">Volunteer</a></div>
      <div><a href="taskpost.html">Tasks</a></div>
      <div><a href="#" id="logout-link">Logout</a></div>
    `;
    
    // Add event listener to logout link
    document.getElementById('logout-link').addEventListener('click', (e) => {
      e.preventDefault();
      signOut(auth).then(() => {
        console.log('User signed out');
        window.location.href = 'homepage.html';
      }).catch((error) => {
        console.error('Sign out error:', error);
      });
    });
    
  } else {
    // User is not signed in, show default options
    rightHeader.innerHTML = `
      <div><a href="homepage.html">Home</a></div>
      <div><a href="map.html">Volunteer</a></div>
      <div><a href="signlog.html">Login</a></div>
    `;
  }
}

// Check authentication state when page loads
onAuthStateChanged(auth, (user) => {
  // Update the navbar based on auth state
  updateNavbar(user);
  
  if (user) {
    // User is signed in
    console.log("User is signed in:", user.email);
    
    // If they're on the login page, redirect them
    if (window.location.pathname.includes('signlog.html')) {
      window.location.href = 'homepage.html';
    }
  } else {
    // User is not signed in
    console.log("No user is signed in");
  }
});

async function login(event){
    event.preventDefault();

    const email = document.getElementById('email-entry').value;
    const password = document.getElementById('password-entry').value;

    try{
        const accountCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = accountCredential.user;

        console.log("Logged in successfully: ", user);

        window.location.href = 'homepage.html';
    } catch(error){
        console.error("Error logging in:", error.message);
    }
}

// Only add the event listener if the form exists on the current page
const signinForm = document.querySelector('#signin-form');
if (signinForm) {
    signinForm.addEventListener('submit', login);
}