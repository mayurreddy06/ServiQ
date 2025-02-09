async function addAccount(event){
    event.preventDefault();
  
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;

    const userData = { email, password };

    try {
        const response = await fetch('/add-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });
    
        if (response.ok) {
          console.log('Account added successfully');
        } else {
          console.error('Failed to add account:', await response.text());
        }
      } catch (error) {
        console.error('Error:', error);
      }

}

document.querySelector('account-form').addEventListener('submit', addAccount);
