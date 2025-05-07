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
      await fetch('/auth/login', {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // Automatically converted to "username=example&password=password"
        body: new URLSearchParams({email}),
        credentials: 'include'
        })
        .then(async response => {
          if (!response.ok)
          {
            const errorBody = await response.json();
            const error = new Error(errorBody.error);
            error.status = response.status;
            throw error;
          }
          return response.json();
        })
        .then(data => {
          window.location.href = "/";
        })
        .catch(error => {
          document.getElementById('error-tag').textContent = "Internal server error";
          console.log(error);
        });
  } catch(error) {
      document.getElementById('error-tag').textContent = "An account with this email doesn't exist or the password is incorrect";
  }
});