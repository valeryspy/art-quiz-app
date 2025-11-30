document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    const confirmPassword = document.getElementById('confirm-password-input').value.trim();
    
    if (!username || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    try {
        await API.register(username, password);
        alert('Account created successfully!');
        navigateTo('/');
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
});

document.getElementById('back-btn').addEventListener('click', () => {
    navigateTo('/');
});

document.getElementById('confirm-password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('register-btn').click();
    }
});
