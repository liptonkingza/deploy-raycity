// Authentication System
// CONFIG should be loaded from config.js before this file
const CONFIG = window.CONFIG || { storageType: 'google-sheets', apiBase: '/.netlify/functions', googleSheetsApiUrl: '' };

// Wrapper functions that route to the appropriate storage backend
async function registerUser(username, password) {
    if (CONFIG.storageType === 'mongodb') {
        return await registerUserMongo(username, password);
    }
    if (CONFIG.storageType === 'google-sheets') {
        return await registerUserGoogleSheets(username, password);
    }
    // fallback: not implemented
    return { success: false, message: 'No storage backend configured' };
}

async function loginUser(username, password) {
    if (CONFIG.storageType === 'mongodb') {
        return await loginUserMongo(username, password);
    }
    if (CONFIG.storageType === 'google-sheets') {
        return await loginUserGoogleSheets(username, password);
    }
    return { success: false, message: 'No storage backend configured' };
}

// MongoDB (Netlify Functions) implementations (frontend -> serverless)
async function registerUserMongo(username, password) {
    try {
        const res = await fetch(`${CONFIG.apiBase}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await res.json();
    } catch (e) {
        console.error('registerUserMongo error', e);
        return { success: false, message: 'Network error' };
    }
}

async function loginUserMongo(username, password) {
    try {
        const res = await fetch(`${CONFIG.apiBase}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        const data = await res.json();
        if (data && data.success) {
            // Keep same behavior as Google Sheets flow: store currentUser in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify({ username: data.username || username }));
        }
        return data;
    } catch (e) {
        console.error('loginUserMongo error', e);
        return { success: false, message: 'Network error' };
    }
}

// Check if user is logged in
function isLoggedIn() {
    return sessionStorage.getItem('currentUser') !== null;
}

// Get current user
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// Logout
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Show error message
function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
        setTimeout(() => {
            errorEl.classList.remove('show');
        }, 5000);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // ไม่ต้อง init localStorage อีกต่อไป ใช้ Google Sheets เท่านั้น
    
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showError('errorMessage', 'กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
            
            console.log('Attempting login with:', { username, passwordLength: password.length });
            
            // ใช้ async/await สำหรับ Google Sheets
            const result = await loginUser(username, password);
            
            console.log('Login result:', result);
            
            if (result && result.success) {
                window.location.href = 'dashboard.html';
            } else {
                showError('errorMessage', result ? result.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            }
        });
    }
    
    // Register Form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (!username || !password || !confirmPassword) {
                showError('errorMessage', 'กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('errorMessage', 'รหัสผ่านไม่ตรงกัน');
                return;
            }
            
            if (password.length < 4) {
                showError('errorMessage', 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
                return;
            }
            
            // ใช้ async/await สำหรับ Google Sheets
            const result = await registerUser(username, password);
            
            if (result.success) {
                alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
                window.location.href = 'index.html';
            } else {
                showError('errorMessage', result.message);
            }
        });
    }
    
    // Protect dashboard pages
    const dashboardPages = ['dashboard.html', 'npc.html', 'farm.html', 'trading.html', 'prices.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (dashboardPages.includes(currentPage)) {
        if (!isLoggedIn()) {
            window.location.href = 'index.html';
            return;
        }
        
        // Set current username in nav
        const currentUser = getCurrentUser();
        const usernameEl = document.getElementById('currentUsername');
        if (usernameEl && currentUser) {
            usernameEl.textContent = currentUser.username;
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                if (confirm('Are you sure you want to logout?')) {
                    logout();
                }
            });
        }
    }
    
    // Redirect if already logged in
    if (currentPage === 'index.html' || currentPage === '' || currentPage === 'register.html') {
        if (isLoggedIn()) {
            window.location.href = 'dashboard.html';
        }
    }
});

