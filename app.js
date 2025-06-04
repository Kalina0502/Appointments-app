// Global variables
let currentRole = 'user';
let selectedDate = null;
let selectedTime = null;
let appointments = JSON.parse(localStorage.getItem('appointments')) || [];
let userCalendar = null;
let adminCalendar = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeCalendars();
    setupEventListeners();
});

// Calendar initialization
function initializeCalendars() {
    // User calendar
    userCalendar = flatpickr("#calendar", {
        inline: true,
        dateFormat: "Y-m-d",
        minDate: "today",
        onChange: function(selectedDates) {
            if (selectedDates.length > 0) {
                selectedDate = selectedDates[0].toISOString().split('T')[0];
                renderTimeSlots(selectedDate);
            }
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            const date = dayElem.dateObj.toISOString().split('T')[0];
            if (isDateFullyBooked(date)) {
                dayElem.classList.add('booked');
            }
        }
    });

    // Admin calendar
    adminCalendar = flatpickr("#admin-calendar", {
        inline: true,
        dateFormat: "Y-m-d",
        minDate: "today",
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            const date = dayElem.dateObj.toISOString().split('T')[0];
            if (isDateFullyBooked(date)) {
                dayElem.classList.add('booked');
            }
        }
    });
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
            renderAppointmentsList();
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

// Calendar and time slot functionality
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
function renderAppointmentsList() {
    const list = document.getElementById('appointments-list');
    list.innerHTML = '';
    
    appointments.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(apt => {
        const item = document.createElement('div');
        item.className = 'appointment-item';
        item.innerHTML = `
            <div>
                <strong>${apt.name}</strong><br>
                ${apt.email} | ${apt.phone}<br>
                ${apt.date} at ${apt.time}<br>
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
        renderAppointmentsList();
        
        // Reset the form handler
        document.getElementById('appointment-form').onsubmit = null;
    };
}

function deleteAppointment(id) {
    if (confirm('Are you sure you want to delete this appointment?')) {
        appointments = appointments.filter(apt => apt.id !== id);
        saveAppointments();
        showToast('Appointment deleted successfully!');
        renderAppointmentsList();
    }
}

function showNewAppointmentModal() {
    selectedDate = null;
    selectedTime = null;
    document.getElementById('appointment-form').reset();
    showAppointmentModal();
}

// Data persistence
function saveAppointments() {
    localStorage.setItem('appointments', JSON.stringify(appointments));
    // Refresh calendar views
    userCalendar.redraw();
    adminCalendar.redraw();
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