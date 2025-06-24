import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from '/scripts/firebaseConfig.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// authorized fetch to automatically receive Firebase Token and pass it in any user authentication API call
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

  document.getElementById('error-tag').textContent = "";
  document.getElementById("customSignInLoading").textContent = "Processing...";
  // disable buttons when proccessing API request
  let buttons = document.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = true;
  })
  
  try {
    const accountCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // create JWT token
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

// code from Firebase Google Oauth Documentation (and modified)
document.getElementById("google-sign").addEventListener("click", async () => {
    signInWithPopup(auth, provider)
  .then(async (result) => {
    console.log(result);
    // This gives you a Google Access Token. You can use it to access the Google API.
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    const user = result.user;
    const email = result.user.email;
    const uid = user.uid;
    await authorizedFetch('/auth/google/verify/', {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // Automatically converted to "username=example&password=password"
        body: new URLSearchParams({email, uid}),
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
          if (error.status === 406)
          {
            let errorTag = document.getElementById('error-tag');
            errorTag.textContent = "Google Account is Not Registered"
            setTimeout(() => {
              errorTag.textContent = "";
            }, 5000)
          }
          else
          {
            alert("Unknown Server Error" + error);
          }
        });
  }).catch((error) => {
    console.log(error);
  });
});