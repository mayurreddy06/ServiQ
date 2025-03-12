import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { firebaseConfig } from './js/firebaseConfig.js'

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

async function addAccount(event) {
  event.preventDefault();

  let name, agencyDescription, email, password, reenteredPassword, accountType;

  if(event.target.id === "user-register-form"){
    name = document.getElementById('user-name').value;
    email = document.getElementById('user-email').value;
    password = document.getElementById('user-password').value.trim();
    reenteredPassword = document.getElementById('user-reenter-password').value.trim();
    accountType = 'user';
  } else if(event.target.id === "agency-register-form"){
    name = document.getElementById('agency-name').value;
    agencyDescription = document.getElementById('agency-description').value;
    email = document.getElementById('agency-email').value;
    password = document.getElementById('agency-password').value.trim();
    reenteredPassword = document.getElementById('agency-reenter-password').value.trim();
    accountType = 'agency';
  }

  if(password !== reenteredPassword){
    console.error("Passwords do not match");
    return;
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    if(accountType === 'user'){
      await set(ref(database, `user_accounts/${user.uid}`), {
        email: email,
        name: name,
        accountType: accountType
      });
    } else if(accountType === 'agency'){
      await set(ref(database, `agency_accounts/${user.uid}`), {
        email: email,
        name: name,
        accountType: accountType,
        agencyDescription: agencyDescription
      });
    }
    
    console.log('Account added successfully');
    window.location.href = '/website-designing/homepage.html';
    
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    
    if (errorCode === 'auth/email-already-in-use') {
      console.error("An account with this email already exists.");
    } else {
      console.error('Error creating account:', errorMessage);
    }
  }
}

document.querySelector('#user-register-form').addEventListener('submit', addAccount);
document.querySelector('#agency-register-form').addEventListener('submit', addAccount);