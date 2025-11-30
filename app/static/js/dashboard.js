// Check login status on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [data, artworks] = await Promise.all([
            API.get('/auth/profile'),
            API.get('/api/artworks')
        ]);
        await AppState.setUser(data.username, data.profile, artworks);
        document.getElementById('welcome-user').textContent = `Welcome, ${data.username}!`;
        hideElement('login-screen');
        showElement('mode-selection');
    } catch {
        showElement('login-screen');
        hideElement('mode-selection');
    }
});

// Login
document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    
    if (!username || !password) {
        alert('Please enter both username and password');
        return;
    }
    
    try {
        const [data, artworks] = await Promise.all([
            API.login(username, password),
            API.get('/api/artworks')
        ]);
        await AppState.setUser(data.username, data.profile, artworks);
        document.getElementById('welcome-user').textContent = `Welcome, ${username}!`;
        hideElement('login-screen');
        showElement('mode-selection');
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
});

// Register
document.getElementById('register-btn').addEventListener('click', () => {
    navigateTo('/register');
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
        await API.post('/auth/logout');
        AppState.clearUser();
        document.getElementById('username-input').value = '';
        document.getElementById('password-input').value = '';
        showElement('login-screen');
        hideElement('mode-selection');
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Mode selection
document.querySelectorAll('#mode-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        navigateTo(`/${mode}`);
    });
});

// Enter key for login
document.getElementById('password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('login-btn').click();
    }
});

document.getElementById('username-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('password-input').focus();
    }
});
