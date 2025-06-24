import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from '/scripts/firebaseConfig.js'
const provider = new GoogleAuthProvider();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
document.getElementById('agency-register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const agencyName = document.getElementById('agency-name').value;
  const email = document.getElementById('agency-email').value;
  const agencyDesc = document.getElementById('agency-desc').value
  const password = document.getElementById('agency-password').value;
  const password2 = document.getElementById('agency-reenter-password').value;
  console.log("Attempting login with email:", email);
  try {
      await authorizedFetch('/auth/register', {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // Automatically converted to "username=example&password=password"
        body: new URLSearchParams({agencyName, agencyDesc, email, password, password2}),
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
          window.location.href = "/auth/login";
        })
        .catch(error => {
          document.getElementById('error-tag').textContent = error;
        });
  } catch(error) {
      document.getElementById('error-tag').textContent = "Invalid Login Credentials";
  }
});


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
          alert("Google account already exists, please sign in on sign in page");
          window.location.href = "/auth/login";
        })
        .catch(error => {
          if (error.status === 406)
          {
              const modal = new bootstrap.Modal(document.getElementById('googleRegisterModal'));
            modal.show();
             document.getElementById("google-register-form").addEventListener("submit", async function(event) {
            event.preventDefault();
            const agencyName = document.getElementById("agency-nameMODAL").value;
            const agencyDesc = document.getElementById("agency-descMODAL").value;
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
                    window.location.href = "/auth/login";
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



