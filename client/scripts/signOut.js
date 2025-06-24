import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from '/scripts/firebaseConfig.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', function() {
  const logoutLink = document.getElementById('logout-link');
  
  if (logoutLink) {
    logoutLink.addEventListener('click', async function(e) {
      e.preventDefault();
      
      try {
        // Sign out from Firebase
        await signOut(auth);
        
        // clear the JWT cookie on the server side
        await fetch('/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        
        window.location.href = '/';
      } catch (error) {
        console.log("Error logging out " + error);
      }
    });
  }
});