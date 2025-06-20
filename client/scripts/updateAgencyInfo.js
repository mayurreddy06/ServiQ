document.getElementById("agency-update-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById('formFileMd');
    const file = fileInput.files[0];
    const name = document.getElementById('agency-name').value;
    const agencyDescription = document.getElementById("agency-desc").value;

    const formData = new FormData();
    if (file) 
    {
        formData.append('file', file);
    }
    formData.append('name', name);
    formData.append('agencyDescription', agencyDescription);

    await fetch('/admin/agency', {
        method: 'PATCH',
        body: formData,
      })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            window.location.reload();
        })
        .catch(error => {
            console.log(error);
        });
})