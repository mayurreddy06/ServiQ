let intervalId;

function startChangeTime(type, delta) {
    const [prefix, component] = type.split('-');

    // Call the function immediately for the first click
    changeTime(type, delta);

    // If the component is not AM/PM, set up the interval for continuous change
    if (component !== 'ampm') {
        intervalId = setInterval(() => {
            changeTime(type, delta);
        }, 100); // Adjust the interval (in milliseconds) for faster/slower changes
    }
}

function stopChangeTime() {
    // Clear the interval when the mouse button is released
    clearInterval(intervalId);
}

function changeTime(type, delta) {
    const [prefix, component] = type.split('-');
    const timeBox = document.getElementById(`${prefix}-${component}`);
    let value = component === 'ampm' ? timeBox.textContent : parseInt(timeBox.textContent);

    if (component === 'hour') {
        value += delta;
        if (value > 12) value = 1;
        if (value < 1) value = 12;
    } else if (component === 'minute') {
        value += delta;
        if (value > 59) value = 0;
        if (value < 0) value = 59;
    } else if (component === 'ampm') {
        value = value === 'AM' ? 'PM' : 'AM';
    }

    timeBox.textContent = component === 'ampm' ? value : value.toString().padStart(2, '0');
}

// Include Flatpickr for the date and time pickers
document.addEventListener('DOMContentLoaded', function () {
    // Initialize Flatpickr on the date input
    flatpickr('#date', {
        dateFormat: 'Y-m-d', // Optional format for the date
        minDate: 'today',    // Optional: Prevent selecting past dates
    });

    // Initialize Flatpickr on the start and end time inputs (if you have them as time pickers)
    flatpickr('#start-hour', {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i', // Hour:Minute format
        time_24hr: true,    // 24-hour time format
    });

    flatpickr('#end-hour', {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i', // Hour:Minute format
        time_24hr: true,    // 24-hour time format
    });
});
