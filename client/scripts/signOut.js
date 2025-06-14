// signOut.js
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
        
        // Clear JWT cookie on server
        await fetch('/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
        
        // Redirect to home
        window.location.href = '/';
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if there's an error
        window.location.href = '/';
      }
    });
  }
});