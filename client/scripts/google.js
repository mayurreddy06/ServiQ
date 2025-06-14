import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

import { firebaseConfig } from "/scripts/firebaseConfig.js";


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

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
    credentials: 'include' // optional, keep if you use cookies
  });
};

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
            const modal = new bootstrap.Modal(document.getElementById('exampleModal'));
            modal.show();
             document.getElementById("agency-register-form").addEventListener("submit", async function(event) {
            event.preventDefault();
            const agencyName = document.getElementById("agency-name").value;
            const agencyDesc = document.getElementById("agency-desc").value;
                await authorizedFetch('/auth/google/create', {
                method: "POST",
                headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                },
                // Automatically converted to "username=example&password=password"
                body: new URLSearchParams({agencyName, agencyDesc, email, uid}),
                credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    modal.hide();
                    window.location.href = "/";
                })
                .catch(error => {
                    console.log(error);
                });
            })
          }
          else
          {
            alert("error" + error);
          }
        });
  }).catch((error) => {
    // Handle Errors here.
    console.log(error);
    const errorCode = error.code;
    const errorMessage = error.message;
  });
});