// Check authentication
if (!storage.getToken()) {
    window.location.href = 'index.html';
}

// Validate token and load user info
async function initializeDashboard() {
    try {
        // Check if token is still valid
        const user = await api.getMe();
        storage.setUser(user);
        document.getElementById('userName').textContent = user.full_name;
        
        // Load data
        loadEvents();
        loadTasks();
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        // If getMe fails, user will be redirected by handleUnauthorized
    }
}

// Initialize dashboard on load
initializeDashboard();

// Logout
function logout() {
    storage.clearAll();
    window.location.href = 'index.html';
}

// Load events
async function loadEvents() {
    try {
        const events = await api.getEvents();
        const container = document.getElementById('eventsList');
        const currentUser = storage.getUser();
        
        if (events.length === 0) {
            container.innerHTML = '<div class="empty-state">No events yet. Create your first event!</div>';
            return;
        }
        
        container.innerHTML = events.map(event => `
            <div class="event-card">
                <h3>${event.title}</h3>
                <p>${event.description || 'No description'}</p>
                <p><strong>📍</strong> ${event.location || 'No location'}</p>
                <p><strong>📅</strong> ${new Date(event.start_time).toLocaleDateString()}</p>
                <span class="event-status">${event.status}</span>
                <div class="event-actions">
                    <button class="btn btn-secondary" onclick="showCreateTaskModal(${event.id})">+ Add Task</button>
                    <button class="btn btn-secondary" onclick="viewEventTasks(${event.id})">View Tasks</button>
                    ${currentUser && event.organizer_id === currentUser.id ? `
                        <button class="btn btn-secondary" onclick="deleteEvent(${event.id})">Delete</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading events:', error);
        showMessage('Failed to load events', 'error');
    }
}

// Load tasks
async function loadTasks() {
    try {
        const tasks = await api.getMyTasks();
        const container = document.getElementById('tasksList');
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '<div class="empty-state">No tasks assigned to you yet.</div>';
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div class="task-item ${task.status === 'completed' ? 'task-completed' : ''}">
                <h4>${task.title}</h4>
                <p>${task.description || 'No description'}</p>
                <div class="task-meta">
                    <span class="task-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
                    <span class="task-badge status-${task.status}">${task.status.replace('_', ' ').toUpperCase()}</span>
                    ${task.due_date ? `<span>Due: ${new Date(task.due_date).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="event-actions" style="margin-top: 10px;">
                    ${task.status !== 'completed' ? `
                        <button class="btn btn-primary" onclick="completeTask(${task.id})">Mark Complete</button>
                    ` : `
                        <span style="color: #38a169; font-weight: 600;">✓ Completed</span>
                    `}
                </div>
            </div>
        `).join('');
    } catch (error) {
        showMessage('Failed to load tasks', 'error');
    }
}

// Create event modal
function showCreateEventModal() {
    document.getElementById('eventModal').style.display = 'block';
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    document.getElementById('createEventForm').reset();
    clearFormErrors('createEventForm');
}

// Create event
document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    clearFormErrors('createEventForm');
    
    const eventData = {
        title: document.getElementById('eventTitle').value,
        description: document.getElementById('eventDescription').value,
        location: document.getElementById('eventLocation').value,
        start_time: document.getElementById('eventStartTime').value,
        end_time: document.getElementById('eventEndTime').value,
        status: document.getElementById('eventStatus').value
    };
    
    try {
        await api.createEvent(eventData);
        showMessage('Event created successfully!', 'success');
        closeEventModal();
        loadEvents();
    } catch (error) {
        if (error.type === 'validation') {
            showValidationErrors('createEventForm', error.detail);
        } else {
            showMessage(error.message, 'error');
        }
    }
});

// Helper functions for error display
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    const errorElements = form.querySelectorAll('.field-error');
    errorElements.forEach(el => el.remove());
    
    const inputs = form.querySelectorAll('.error-input');
    inputs.forEach(input => input.classList.remove('error-input'));
}

function showValidationErrors(formId, errors) {
    const form = document.getElementById(formId);
    
    if (typeof errors === 'string') {
        // Single error message
        showMessage(errors, 'error');
        return;
    }
    
    if (Array.isArray(errors)) {
        // Multiple field errors from FastAPI
        errors.forEach(error => {
            const fieldName = error.loc[error.loc.length - 1];
            const message = error.msg;
            
            // Find input by name or id
            let input = form.querySelector(`[name="${fieldName}"]`) || 
                       form.querySelector(`#event${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`) ||
                       form.querySelector(`#task${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);
            
            if (input) {
                input.classList.add('error-input');
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                errorDiv.textContent = message;
                input.parentNode.appendChild(errorDiv);
            }
        });
    }
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        await api.deleteEvent(eventId);
        showMessage('Event deleted successfully!', 'success');
        loadEvents();
        loadTasks();  // Refresh tasks list after event deletion
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Create task modal
function showCreateTaskModal(eventId) {
    document.getElementById('taskEventId').value = eventId;
    document.getElementById('taskModal').style.display = 'block';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    document.getElementById('createTaskForm').reset();
    clearFormErrors('createTaskForm');
}

// Create task
document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    clearFormErrors('createTaskForm');
    
    const currentUser = storage.getUser();
    if (!currentUser || !currentUser.id) {
        showMessage('User not found. Please refresh and try again.', 'error');
        return;
    }
    
    const taskData = {
        event_id: parseInt(document.getElementById('taskEventId').value),
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        priority: document.getElementById('taskPriority').value,
        status: document.getElementById('taskStatus').value,
        due_date: document.getElementById('taskDueDate').value || null,
        assigned_to_id: currentUser.id
    };
    
    try {
        await api.createTask(taskData);
        showMessage('Task created successfully!', 'success');
        closeTaskModal();
        loadTasks();
    } catch (error) {
        if (error.type === 'validation') {
            showValidationErrors('createTaskForm', error.detail);
        } else {
            showMessage(error.message, 'error');
        }
    }
});

// Complete task
async function completeTask(taskId) {
    try {
        await api.updateTask(taskId, { status: 'completed' });
        showMessage('Task marked as complete!', 'success');
        loadTasks();
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// View event tasks
async function viewEventTasks(eventId) {
    try {
        const tasks = await api.getEventTasks(eventId);
        const modal = document.getElementById('viewTasksModal');
        const container = document.getElementById('viewTasksContainer');
        
        if (tasks.length === 0) {
            container.innerHTML = '<div class="empty-state">No tasks for this event yet.</div>';
        } else {
            container.innerHTML = tasks.map(task => `
                <div class="task-item">
                    <h4>${task.title}</h4>
                    <p>${task.description || 'No description'}</p>
                    <div class="task-meta">
                        <span class="task-badge priority-${task.priority}">${task.priority.toUpperCase()}</span>
                        <span class="task-badge status-${task.status}">${task.status.replace('_', ' ').toUpperCase()}</span>
                        ${task.due_date ? `<span>Due: ${new Date(task.due_date).toLocaleDateString()}</span>` : ''}
                        ${task.assigned_to_id ? `<span>Assigned to user #${task.assigned_to_id}</span>` : '<span>Unassigned</span>'}
                    </div>
                </div>
            `).join('');
        }
        
        modal.style.display = 'block';
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

function closeViewTasksModal() {
    document.getElementById('viewTasksModal').style.display = 'none';
}

// Close modals on outside click
window.onclick = function(event) {
    const eventModal = document.getElementById('eventModal');
    const taskModal = document.getElementById('taskModal');
    const viewTasksModal = document.getElementById('viewTasksModal');
    
    if (event.target === eventModal) {
        closeEventModal();
    }
    if (event.target === taskModal) {
        closeTaskModal();
    }
    if (event.target === viewTasksModal) {
        closeViewTasksModal();
    }
}
