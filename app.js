// Global variables
let currentRole = 'user';
let selectedDate = null;
let selectedTime = null;
let appointments = [];
let userCalendar = null;
let adminCalendar = null;
let filteredDate = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadAppointments();
    initializeCalendars();
    setupEventListeners();
});

// Data persistence functions
function loadAppointments() {
    const storedAppointments = localStorage.getItem('appointments');
    appointments = storedAppointments ? JSON.parse(storedAppointments) : [];
}

function saveAppointments() {
    localStorage.setItem('appointments', JSON.stringify(appointments));
    // Refresh calendar views
    if (userCalendar) userCalendar.redraw();
    if (adminCalendar) adminCalendar.redraw();
}

// Date handling functions
function formatDateForStorage(date) {
    // Ensure we're working with local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDate(dateStr) {
    // Parse YYYY-MM-DD string into local date
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// Calendar initialization
function initializeCalendars() {
    // User calendar
    userCalendar = flatpickr("#calendar", {
        inline: true,
        dateFormat: "Y-m-d",
        minDate: "today",
        onChange: function(selectedDates) {
            if (selectedDates.length > 0) {
                selectedDate = formatDateForStorage(selectedDates[0]);
                renderTimeSlots(selectedDate);
            }
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            const date = formatDateForStorage(dayElem.dateObj);
            if (isDateFullyBooked(date)) {
                dayElem.classList.add('fully-booked');
            }
        }
    });

    // Add Today button to user calendar
    const userCalendarContainer = document.querySelector('.calendar-section');
    const userTodayBtn = document.createElement('button');
    userTodayBtn.className = 'today-btn';
    userTodayBtn.textContent = 'Today';
    userTodayBtn.onclick = () => {
        const today = new Date();
        userCalendar.setDate(today);
        selectedDate = formatDateForStorage(today);
        renderTimeSlots(selectedDate);
    };
    userCalendarContainer.appendChild(userTodayBtn);

    // Admin calendar
    adminCalendar = flatpickr("#admin-calendar", {
        inline: true,
        dateFormat: "Y-m-d",
        minDate: "2020-01-01", // Allow viewing past dates
        onChange: function(selectedDates) {
            if (selectedDates.length > 0) {
                filteredDate = formatDateForStorage(selectedDates[0]);
                renderAppointmentsList(filteredDate);
                document.getElementById('admin-appointments-title').textContent = 
                    `Appointments for ${formatDate(filteredDate)}`;
            }
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            const date = formatDateForStorage(dayElem.dateObj);
            if (hasAppointmentsOnDate(date)) {
                dayElem.classList.add('has-appointments');
            }
        }
    });

    // Add Today button to admin calendar
    const adminCalendarContainer = document.querySelector('.admin-calendar-section');
    const adminTodayBtn = document.createElement('button');
    adminTodayBtn.className = 'today-btn';
    adminTodayBtn.textContent = 'Today';
    adminTodayBtn.onclick = () => {
        const today = new Date();
        adminCalendar.setDate(today);
        filteredDate = formatDateForStorage(today);
        renderAppointmentsList(filteredDate);
        document.getElementById('admin-appointments-title').textContent = 
            `Appointments for ${formatDate(filteredDate)}`;
    };
    adminCalendarContainer.appendChild(adminTodayBtn);
}

// Event listeners setup
function setupEventListeners() {
    // Admin login form
    document.getElementById('admin-login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (username === 'admin' && password === 'admin123') {
            currentRole = 'admin';
            document.getElementById('user-view').classList.add('hidden');
            document.getElementById('admin-view').classList.remove('hidden');
            closeModal('admin-login-modal');
            renderAppointmentsList();
            showToast('Welcome, Administrator!');
        } else {
            showToast('Invalid credentials', 'error');
        }
    });

    // Appointment form
    document.getElementById('appointment-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const appointment = {
            id: Date.now(),
            date: selectedDate,
            time: selectedTime,
            name: document.getElementById('full-name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            description: document.getElementById('description').value
        };
        
        appointments.push(appointment);
        saveAppointments();
        
        showToast('Appointment booked successfully!');
        closeModal('appointment-modal');
        
        if (currentRole === 'user') {
            renderTimeSlots(selectedDate);
        } else {
            renderAppointmentsList(filteredDate);
        }
    });
}

// Admin functionality
function showAdminLogin() {
    document.getElementById('admin-login-modal').classList.remove('hidden');
}

function logout() {
    currentRole = 'user';
    document.getElementById('admin-view').classList.add('hidden');
    document.getElementById('user-view').classList.remove('hidden');
    showToast('Logged out successfully');
}

function showAllAppointments() {
    filteredDate = null;
    document.getElementById('admin-appointments-title').textContent = 'All Appointments';
    renderAppointmentsList();
}

// Calendar and time slot functionality
function hasAppointmentsOnDate(date) {
    return appointments.some(apt => apt.date === date);
}

function isDateFullyBooked(date) {
    const timeSlots = generateTimeSlots();
    return timeSlots.every(time => isTimeSlotBooked(date, time));
}

function generateTimeSlots() {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
        slots.push(`${hour}:00`);
    }
    return slots;
}

function renderTimeSlots(date) {
    const slotsContainer = document.getElementById('slots-container');
    slotsContainer.innerHTML = '';
    
    generateTimeSlots().forEach(time => {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.textContent = time;
        
        if (isTimeSlotBooked(date, time)) {
            slot.classList.add('booked');
        } else {
            slot.addEventListener('click', () => selectTimeSlot(time));
        }
        
        slotsContainer.appendChild(slot);
    });
}

function isTimeSlotBooked(date, time) {
    return appointments.some(apt => apt.date === date && apt.time === time);
}

function selectTimeSlot(time) {
    selectedTime = time;
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
        if (slot.textContent === time) {
            slot.classList.add('selected');
        }
    });
    showAppointmentModal();
}

// Modal functionality
function showAppointmentModal() {
    document.getElementById('appointment-modal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    if (modalId === 'appointment-modal') {
        document.getElementById('appointment-form').reset();
    }
}

// Appointment management
function renderAppointmentsList(date = null) {
    const list = document.getElementById('appointments-list');
    list.innerHTML = '';
    
    let filteredAppointments = appointments;
    if (date) {
        filteredAppointments = appointments.filter(apt => apt.date === date);
    }
    
    if (filteredAppointments.length === 0) {
        list.innerHTML = '<div class="no-appointments">No appointments found</div>';
        return;
    }
    
    filteredAppointments
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach(apt => {
            const item = document.createElement('div');
            item.className = 'appointment-item';
            item.innerHTML = `
                <div>
                    <strong>${apt.name}</strong><br>
                    ${apt.email} | ${apt.phone}<br>
                    ${formatDate(apt.date)} at ${apt.time}<br>
                    ${apt.description}
                </div>
                <div>
                    <button onclick="editAppointment(${apt.id})" class="action-btn">Edit</button>
                    <button onclick="deleteAppointment(${apt.id})" class="action-btn">Delete</button>
                </div>
            `;
            list.appendChild(item);
        });
}

function editAppointment(id) {
    const appointment = appointments.find(apt => apt.id === id);
    if (!appointment) return;
    
    selectedDate = appointment.date;
    selectedTime = appointment.time;
    
    document.getElementById('full-name').value = appointment.name;
    document.getElementById('email').value = appointment.email;
    document.getElementById('phone').value = appointment.phone;
    document.getElementById('description').value = appointment.description;
    
    showAppointmentModal();
    
    // Update the appointment instead of creating a new one
    document.getElementById('appointment-form').onsubmit = function(e) {
        e.preventDefault();
        
        appointment.name = document.getElementById('full-name').value;
        appointment.email = document.getElementById('email').value;
        appointment.phone = document.getElementById('phone').value;
        appointment.description = document.getElementById('description').value;
        
        saveAppointments();
        showToast('Appointment updated successfully!');
        closeModal('appointment-modal');
        renderAppointmentsList(filteredDate);
        
        // Reset the form handler
        document.getElementById('appointment-form').onsubmit = null;
    };
}

function deleteAppointment(id) {
    if (confirm('Are you sure you want to delete this appointment?')) {
        appointments = appointments.filter(apt => apt.id !== id);
        saveAppointments();
        showToast('Appointment deleted successfully!');
        renderAppointmentsList(filteredDate);
    }
}

function showNewAppointmentModal() {
    selectedDate = null;
    selectedTime = null;
    document.getElementById('appointment-form').reset();
    showAppointmentModal();
}

// Utility functions
function formatDate(dateStr) {
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    // Remove toast after animation
    setTimeout(() => {
        toast.remove();
    }, 3000);
}