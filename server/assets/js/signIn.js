import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from '../firebaseConfig.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('signin-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  // addLoadingIndicator();
  let email = document.getElementById('email-entry').value;
  const password = document.getElementById('password-entry').value;
  console.log("Attempting login with email:", email);
  try {
      const accountCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = accountCredential.user;
      const response = await fetch('http://localhost:3002/auth/login', {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // Automatically converted to "username=example&password=password"
        body: new URLSearchParams({email}),
        credentials: 'include'
        });
      if (response.ok)
      {
        window.location.href = "/";
      }
      else
      {
        console.log("extensive time fetching rest api route");
      }

      
  } catch(error) {
      let message = "An account with this email doesn't exist or the password is incorrect";
      document.getElementById('error-tag').textContent = message;
  }
});