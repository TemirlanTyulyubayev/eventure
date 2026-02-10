// Check if already logged in
if (storage.getToken()) {
    window.location.href = 'dashboard.html';
}

// Show/hide forms
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

// Login handler
document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const data = await api.login(email, password);
        storage.setToken(data.access_token);
        
        // Get user info
        const user = await api.getMe();
        storage.setUser(user);
        
        window.location.href = 'dashboard.html';
    } catch (error) {
        showMessage(error.message, 'error');
    }
});

// Register handler
document.getElementById('register').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('regFullName').value;
    
    try {
        await api.register(email, password, fullName);
        showMessage('Registration successful! Please login.', 'success');
        showLogin();
    } catch (error) {
        showMessage(error.message, 'error');
    }
});
