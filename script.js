// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.querySelector('.login-btn');
const eyeIcon = document.getElementById('eyeIcon');

// Replace this:
const demoCredentials = {
    email: 'admin@iky.com',
    password: 'admin123'
};

// With this:
const students = [
    { name: 'Nikhitha', email: 'valmiki@gmail.com', password: 'nikki123' },
    { name: 'Sai', email: 'preethi@gmail.com', password: 'sai123' },
    // Add more students as needed
];

// Toggle password visibility
function togglePassword() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Update eye icon
    if (type === 'text') {
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// Show error message
function showError(message) {
    // Remove existing error message
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message show';
    errorDiv.textContent = message;
    
    // Insert error message before the form
    loginForm.insertBefore(errorDiv, loginForm.firstChild);
    
    // Auto-hide error message after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.classList.remove('show');
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.remove();
                }
            }, 500);
        }
    }, 5000);
}

// Show success message
function showSuccess(message) {
    // Create success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message show';
    successDiv.style.cssText = `
        background: #efe;
        color: #3c3;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #cfc;
        margin-bottom: 15px;
        font-size: 0.9rem;
        animation: slideDown 0.5s ease-out;
    `;
    successDiv.textContent = message;
    
    // Insert success message before the form
    loginForm.insertBefore(successDiv, loginForm.firstChild);
}

// Loading state for button
function setLoadingState(isLoading) {
    if (isLoading) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
    } else {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Form validation
function validateForm() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Check if fields are empty
    if (!email) {
        showError('Please enter your email address');
        emailInput.focus();
        return false;
    }
    
    if (!password) {
        showError('Please enter your password');
        passwordInput.focus();
        return false;
    }
    
    // Check email format
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        emailInput.focus();
        return false;
    }
    
    // Check password length
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        passwordInput.focus();
        return false;
    }
    
    return true;
}

// Simulate login process
async function handleLogin(email, password) {
    setLoadingState(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find student by email and password
    const student = students.find(
        s => s.email === email && s.password === password
    );

    if (student) {
        showSuccess('Login successful! Redirecting to dashboard...');
        // Save student info to localStorage
        localStorage.setItem('studentEmail', student.email);
        localStorage.setItem('studentName', student.name);
        // Redirect to dashboard after 1s
        setTimeout(() => {
            window.location.href = 'student_dashboard.html';
        }, 1000);
    } else {
        showError('Invalid email or password. Please try again.');
    }
    
    setLoadingState(false);
}

// Form submission handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    await handleLogin(email, password);
});

// Input field animations
function addInputAnimations() {
    const inputs = document.querySelectorAll('input[type="email"], input[type="password"]');
    
    inputs.forEach(input => {
        // Add focus animation
        input.addEventListener('focus', () => {
            input.parentElement.style.transform = 'scale(1.02)';
        });
        
        // Remove focus animation
        input.addEventListener('blur', () => {
            input.parentElement.style.transform = 'scale(1)';
        });
        
        // Real-time validation
        input.addEventListener('input', () => {
            // Remove error message when user starts typing
            const errorMessage = document.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        });
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl + Enter to submit form
    if (e.ctrlKey && e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
    }
    
    // Escape to clear form
    if (e.key === 'Escape') {
        loginForm.reset();
        const errorMessage = document.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
});

// Auto-focus email field on page load
window.addEventListener('load', () => {
    emailInput.focus();
    addInputAnimations();
    
    // Add some interactive effects
    const logo = document.querySelector('.logo');
    logo.addEventListener('click', () => {
        logo.style.transform = 'scale(1.1)';
        setTimeout(() => {
            logo.style.transform = 'scale(1)';
        }, 200);
    });
});

// Add CSS for success message animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .success-message {
        display: none;
    }
    
    .success-message.show {
        display: block;
    }
`;
document.head.appendChild(style);

// Console welcome message
console.log(`
🎓 Welcome to Iky Exam Portal Login Page!

Demo Credentials:
- Email: admin@iky.com
- Password: admin123

Features:
✅ Split layout design
✅ Welcome section with educational illustration
✅ Email and password login form
✅ Modern responsive design
✅ Form validation
✅ Password visibility toggle
✅ Loading animations
✅ Error handling
✅ Keyboard shortcuts (Ctrl+Enter to submit, Esc to clear)

Built with HTML, CSS, and JavaScript
`); 