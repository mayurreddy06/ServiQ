import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from '../firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.getElementById('signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email-entry').value;
  const password = document.getElementById('password-entry').value;
  const errorTag = document.getElementById('error-tag');
  
  // Clear previous errors
  errorTag.textContent = '';
  errorTag.style.display = 'none';

  try {

    // 2. Attempt Firebase authentication
    console.log('Attempting Firebase sign-in...'); // Debug log
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('Firebase auth success:', user.uid); // Debug log

    // 3. Verify with your backend
    console.log('Verifying with backend...'); // Debug log
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include'
    });

    const result = await response.json();
    console.log('Backend response:', result); // Debug log
    
    if (!response.ok) {
      throw { 
        code: 'auth/backend-error', 
        message: result.message || "Backend verification failed" 
      };
    }

    // 4. Successful login - redirect
    console.log('Login successful, redirecting...'); // Debug log
    window.location.href = '/';

  } catch (error) {
    console.error('Login error:', error); // Detailed error logging
    
    let message = 'Login failed. Please try again.';
    
    switch(error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email format.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many attempts. Please try again later.';
        break;
      case 'auth/backend-error':
        message = error.message;
        break;
      default:
        message = `Login error: ${error.message}`;
    }
    
    errorTag.textContent = message;
    errorTag.style.display = 'block';
  }
});