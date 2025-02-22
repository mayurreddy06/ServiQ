async function addAccount(event) {
  event.preventDefault();

  let email, password, reenteredPassword, accountType;

  if(event.target.id === "user-register-form"){
    email = document.getElementById('user-email').value;
    password = document.getElementById('user-password').value.trim();
    reenteredPassword = document.getElementById('user-reenter-password').value.trim();
    accountType = 'user';
  } else if(event.target.id === "agency-register-form"){
    email = document.getElementById('agency-email').value;
    password = document.getElementById('agency-password').value.trim();
    reenteredPassword = document.getElementById('agency-reenter-password').value.trim();
    accountType = 'agency'
  }

  if(password !== reenteredPassword){
    console.error("Passwords do not match");
    return;
  }

  const userData = { email, password, accountType };
  
  try {
    const response = await fetch('/add-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (response.ok) {
      console.log('Account added successfully');
      window.location.href = '/websiteDesignTest.html';
    } else {
      console.error('Failed to add account:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

document.querySelector('#user-register-form').addEventListener('submit', addAccount);
document.querySelector('#agency-register-form').addEventListener('submit', addAccount);