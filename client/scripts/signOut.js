import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "/scripts/firebaseConfig.js"; // adjust path if needed

// Initialize Firebase app FIRST
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Wrap native fetch to automatically attach the Firebase ID token
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

document.getElementById('logout-link').addEventListener('click', async () => {
  await authorizedFetch('/auth/logout')
    .then(response => response.json())
    .then(data => {
      window.location.href = "/";
    })
    .catch((error) => {
      console.log(error);
    });
});
