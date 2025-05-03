import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

import { firebaseConfig } from "../firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

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

    // fetch 1: see if email already exists in database, then successfuly login
    // fetch 2: if email doesnt exist, then go to creating account page
    
    // sending the email the user logged in with to the node js backend
    
    window.location.href = "/auth/google?email=" + email + "&uid=" + uid;
    

  }).catch((error) => {
    // Handle Errors here.
    console.log(error);
    const errorCode = error.code;
    const errorMessage = error.message;
  });
});