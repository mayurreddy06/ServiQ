import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, applyActionCode, getIdToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from '/scripts/firebaseConfig.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Updated authorizedFetch - still useful for API calls
window.authorizedFetch = async (input, init = {}) => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: 'include'
  });
};

document.getElementById('signin-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  let email = document.getElementById('email-entry').value;
  const password = document.getElementById('password-entry').value;
  console.log("Attempting login with email:", email);

  document.getElementById('error-tag').textContent = "";
  document.getElementById("customSignInLoading").textContent = "Processing...";
  let buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = true;
  })
  
  try {
    const accountCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = accountCredential.user;
    
    // Send Firebase ID token to backend to create JWT cookie
    await authorizedFetch('/auth/login', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include' // Important for cookies
    })
    .then(async response => {
      if (!response.ok) {
        const errorBody = await response.json();
        const error = new Error(errorBody.error);
        error.status = response.status;
        throw error;
      }
      return response.json();
    })
    .then(data => {
      console.log("JWT cookie created successfully");
      // Now redirect - the JWT cookie will be sent automatically
      window.location.href = "/";
    })
    .catch(error => {
      document.getElementById('error-tag').textContent = "Internal server error";
      console.log(error);
    });
  } catch(error) {
    let errorTag = document.getElementById('error-tag');
    if (error.code === "auth/too-many-requests") {
      errorTag.textContent = "Too many requests"
    }
    else{
      errorTag.textContent = "Invalid Login Credentials";
    }
  }
  document.getElementById("customSignInLoading").textContent = "";
  buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = false;
  })
});

// // Handle email verification
// const urlParams = new URLSearchParams(window.location.search);
// const mode = urlParams.get('mode');
// const oobCode = urlParams.get('oobCode');

// if (mode === 'verifyEmail' && oobCode) {
//   const auth = getAuth();
  
//   applyActionCode(auth, oobCode)
//     .then(async () => {
//       const user = auth.currentUser;
//       if (user) {
//         const token = await getIdToken(user);
        
//         const response = await fetch('/auth/login', {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           },
//           credentials: 'include'
//         });
        
//         if (response.ok) {
//           alert('Email verified successfully!');
//           window.location.href = '/admin/dashboard';
//         }
//       }
//     })
//     .catch((error) => {
//       console.error('Email verification failed:', error);
//       alert('Email verification failed. Please try again.');
//     });
// }