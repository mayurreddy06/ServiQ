document.getElementById('logout-link').addEventListener('click', async () => {
    await fetch('/auth/logout')
        .then(response => response.json())
        .then(data => {
            window.location.href = "/"
        })
        .catch(error)
        {
            console.log(error);
        }
});