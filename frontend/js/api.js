const API_URL = 'http://localhost:8000/api';

// Storage helpers
const storage = {
    setToken: (token) => localStorage.setItem('token', token),
    getToken: () => localStorage.getItem('token'),
    removeToken: () => localStorage.removeItem('token'),
    setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    removeUser: () => localStorage.removeItem('user'),
    clearAll: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
};

// Check if response is unauthorized and handle logout
function handleUnauthorized(response) {
    if (response.status === 401) {
        storage.clearAll();
        alert('Your session has expired. Please login again.');
        window.location.href = '/index.html';
        throw new Error('Unauthorized'); // Stop execution
    }
    return false;
}

// API client
const api = {
    // Auth
    async register(email, password, fullName) {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: fullName })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }
        return response.json();
    },

    async login(email, password) {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        return response.json();
    },

    async getMe() {
        const token = storage.getToken();
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            handleUnauthorized(response);
            throw new Error('Failed to get user info');
        }
        return response.json();
    },

    // Events
    async getEvents() {
        const response = await fetch(`${API_URL}/events/`);
        if (!response.ok) throw new Error('Failed to fetch events');
        return response.json();
    },

    async createEvent(eventData) {
        const token = storage.getToken();
        const response = await fetch(`${API_URL}/events/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(eventData)
        });
        if (!response.ok) {
            handleUnauthorized(response);
            const error = await response.json();
            if (response.status === 422) {
                // Validation error
                throw { type: 'validation', detail: error.detail };
            }
            throw new Error(error.detail || 'Failed to create event');
        }
        return response.json();
    },

    async deleteEvent(eventId) {
        const token = storage.getToken();
        const response = await fetch(`${API_URL}/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            handleUnauthorized(response);
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete event');
        }
    },

    // Tasks
    async getMyTasks() {
        const token = storage.getToken();
        const response = await fetch(`${API_URL}/tasks/my-tasks`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            handleUnauthorized(response);
            throw new Error('Failed to fetch tasks');
        }
        return response.json();
    },

    async getEventTasks(eventId) {
        const response = await fetch(`${API_URL}/tasks/event/${eventId}`);
        if (!response.ok) throw new Error('Failed to fetch event tasks');
        return response.json();
    },

    async createTask(taskData) {
        const token = storage.getToken();
        const response = await fetch(`${API_URL}/tasks/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(taskData)
        });
        if (!response.ok) {
            handleUnauthorized(response);
            const error = await response.json();
            if (response.status === 422) {
                // Validation error
                throw { type: 'validation', detail: error.detail };
            }
            throw new Error(error.detail || 'Failed to create task');
        }
        return response.json();
    },

    async updateTask(taskId, taskData) {
        const token = storage.getToken();
        const response = await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(taskData)
        });
        if (!response.ok) {
            handleUnauthorized(response);
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update task');
        }
        return response.json();
    }
};

// Message helper
function showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    setTimeout(() => {
        messageEl.className = 'message';
    }, 5000);
}
