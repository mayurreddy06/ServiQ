import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from './firebaseConfig.js'

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function login(event){
    event.preventDefault();

    const email = document.getElementById('email-entry').value;
    const password = document.getElementById('password-entry').value;

    try{
        const accountCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = accountCredential.user;

        console.log("Logged in successfully: ", user);

        window.location.href = '/website-designing/homepage.html';
    } catch(error){
        console.error("Error logging in:", error.message);
    }
}

document.querySelector('#signin-form').addEventListener('submit', login);