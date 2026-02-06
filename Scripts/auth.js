// ====================================
// Premium Modern Authentication System
// ====================================

class PremiumAuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.authMode = 'login';
        this.fieldTouched = {};
        this.init();
    }

    getAbsoluteUrl(path) {
        return window.location.protocol === 'file:' ? path : `${window.location.origin}/${path}`;
    }

    async init() {
        await this.waitForSupabase();
        
        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                this.switchMode('recovery');
            }
        });

        this.initializeUI();
        await this.checkSession();
        this.setupEventListeners();
        this.loadRememberedEmail();
    }

    waitForSupabase() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    clearInterval(check);
                    console.log('✓ Premium Auth: Supabase connected');
                    resolve();
                }
            }, 100);
            setTimeout(() => { clearInterval(check); resolve(); }, 10000);
        });
    }

    initializeUI() {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode') || urlParams.get('signup');
        if (mode === 'signup' || mode === 'true') {
            this.switchMode('signup');
        }
    }

    async checkSession() {
        if (!this.supabase) return;
        
        // Check for password recovery hash first
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            console.log('Recovery mode detected, skipping session check redirect');
            return;
        }

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.currentUser = session.user;
                // Only redirect if NOT in recovery mode
                if (this.authMode !== 'recovery') {
                    window.location.replace(this.getAbsoluteUrl('index.html'));
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.getElementById('loginTab')?.addEventListener('click', () => this.switchMode('login'));
        document.getElementById('signupTab')?.addEventListener('click', () => this.switchMode('signup'));
        document.getElementById('footerToggle')?.addEventListener('click', () => this.toggleMode());

        // Forms
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm')?.addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('updatePasswordForm')?.addEventListener('submit', (e) => this.handleUpdatePassword(e));

        // Google OAuth
        document.getElementById('googleLoginBtn')?.addEventListener('click', () => this.handleGoogleAuth());
        document.getElementById('googleSignupBtn')?.addEventListener('click', () => this.handleGoogleAuth());

        // Password toggles
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => this.togglePassword(btn));
        });

        // Real-time validation
        this.setupValidation();
    }

    setupValidation() {
        // Login fields
        ['loginEmail', 'loginPassword'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('blur', () => this.validateField(id));
                input.addEventListener('input', () => {
                    if (this.fieldTouched[id]) {
                        this.validateField(id);
                    }
                });
            }
        });

        // Signup fields
        ['signupName', 'signupEmail', 'signupPasswordConfirm', 'signupPhone'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('blur', () => this.validateField(id));
                input.addEventListener('input', () => {
                    if (this.fieldTouched[id]) {
                        this.validateField(id);
                    }
                });
            }
        });

        // Password strength
        const signupPassword = document.getElementById('signupPassword');
        if (signupPassword) {
            signupPassword.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
                if (this.fieldTouched.signupPassword) {
                    this.validateField('signupPassword');
                }
            });
            signupPassword.addEventListener('blur', () => this.validateField('signupPassword'));
        }
    }

    switchMode(mode) {
        // Update tabs
        const loginTab = document.getElementById('loginTab');
        const signupTab = document.getElementById('signupTab');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const updatePasswordForm = document.getElementById('updatePasswordForm');
        const footerText = document.querySelector('.footer-text');
        
        // Reset forms
        loginForm?.classList.remove('active');
        signupForm?.classList.remove('active');
        updatePasswordForm?.classList.remove('active');
        loginTab?.classList.remove('active');
        signupTab?.classList.remove('active');

        if (mode === 'login') {
            loginTab?.classList.add('active');
            loginForm?.classList.add('active');
            if (footerText) footerText.style.display = 'block';
        } else if (mode === 'signup') {
            signupTab?.classList.add('active');
            signupForm?.classList.add('active');
            if (footerText) footerText.style.display = 'block';
        } else if (mode === 'recovery') {
            updatePasswordForm?.classList.add('active');
            // Hide tabs and footer in recovery mode
            if (loginTab && signupTab) {
                loginTab.parentElement.style.display = 'none';
            }
            if (footerText) footerText.style.display = 'none';
            
            // Update title
            const title = document.querySelector('.auth-title');
            const subtitle = document.querySelector('.auth-subtitle');
            if (title) title.textContent = 'Set New Password';
            if (subtitle) subtitle.textContent = 'Enter your new password below';
        }
    }

    toggleMode() {
        this.switchMode(this.authMode === 'login' ? 'signup' : 'login');
    }

    togglePassword(button) {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
            button.classList.toggle('active');
        }
    }

    checkPasswordStrength(password) {
        const strengthContainer = document.getElementById('passwordStrength');
        const reqContainer = document.getElementById('passwordRequirements');
        
        // Always ensure requirements container is visible when typing starts
        if (password) {
            reqContainer?.classList.add('show');
        } else {
            // Optional: hide or reset when empty. Let's reset to unchecked state.
            if (reqContainer) {
                reqContainer.querySelectorAll('.requirement').forEach(el => {
                    el.classList.remove('met');
                    const iconContainer = el.querySelector('i, svg');
                    if (iconContainer) {
                        const newIcon = document.createElement('i');
                        newIcon.setAttribute('data-lucide', 'circle');
                        el.replaceChild(newIcon, iconContainer);
                    }
                });
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            strengthContainer?.classList.remove('show');
            return;
        }

        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
        };

        const score = Object.values(requirements).filter(Boolean).length;
        const fill = document.getElementById('strengthFill');
        const text = document.getElementById('strengthText');

        // Show strength bar
        strengthContainer?.classList.add('show');

        // Update strength
        fill?.classList.remove('weak', 'fair', 'good', 'strong');
        text?.classList.remove('weak', 'fair', 'good', 'strong');
        
        if (score <= 2) {
            fill?.classList.add('weak');
            text?.classList.add('weak');
            text.textContent = 'Weak';
        } else if (score === 3) {
            fill?.classList.add('fair');
            text?.classList.add('fair');
            text.textContent = 'Fair';
        } else if (score === 4) {
            fill?.classList.add('good');
            text?.classList.add('good');
            text.textContent = 'Good';
        } else {
            fill?.classList.add('strong');
            text?.classList.add('strong');
            text.textContent = 'Strong';
        }

        // Update requirements list
        if (reqContainer) {
            let changesMade = false;
            Object.keys(requirements).forEach(req => {
                const el = reqContainer.querySelector(`[data-requirement="${req}"]`);
                if (el) {
                    const isMet = requirements[req];
                    const wasMet = el.classList.contains('met');
                    
                    if (isMet !== wasMet) {
                        changesMade = true;
                        const iconContainer = el.querySelector('i, svg');
                        const newIcon = document.createElement('i');
                        
                        if (isMet) {
                            el.classList.add('met');
                            newIcon.setAttribute('data-lucide', 'check-circle');
                        } else {
                            el.classList.remove('met');
                            newIcon.setAttribute('data-lucide', 'circle');
                        }
                        
                        if (iconContainer) {
                            el.replaceChild(newIcon, iconContainer);
                        } else {
                            el.prepend(newIcon);
                        }
                    }
                }
            });
            
            // Only re-initialize icons if changes were made to avoid flickering/performance hit
            if (changesMade && typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    validateField(fieldId) {
        this.fieldTouched[fieldId] = true;
        const input = document.getElementById(fieldId);
        const errorSpan = document.getElementById(fieldId + 'Error');
        
        if (!input || !errorSpan) return true;

        let error = '';
        const value = input.value.trim();

        switch(fieldId) {
            case 'loginEmail':
            case 'signupEmail':
                if (!value) {
                    error = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Please enter a valid email';
                }
                break;
            
            case 'loginPassword':
                if (!value) {
                    error = 'Password is required';
                } else if (value.length < 6) {
                    error = 'Password must be at least 6 characters';
                }
                break;
            
            case 'signupName':
                if (!value) {
                    error = 'Name is required';
                } else if (value.length < 2) {
                    error = 'Name must be at least 2 characters';
                }
                break;
            
            case 'signupPassword':
                if (!value) {
                    error = 'Password is required';
                } else if (value.length < 8) {
                    error = 'Password must be at least 8 characters';
                } else {
                    const requirements = {
                        uppercase: /[A-Z]/.test(value),
                        lowercase: /[a-z]/.test(value),
                        number: /\d/.test(value),
                        special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
                    };
                    const score = Object.values(requirements).filter(Boolean).length;
                    if (score < 3) {
                        error = 'Password is too weak';
                    }
                }
                break;
            
            case 'signupPasswordConfirm':
                const password = document.getElementById('signupPassword').value;
                if (!value) {
                    error = 'Please confirm your password';
                } else if (value !== password) {
                    error = 'Passwords do not match';
                }
                break;
            
            case 'signupPhone':
                if (value && !/^\+?[\d\s\-()]+$/.test(value)) {
                    error = 'Please enter a valid phone number';
                }
                break;
        }

        if (error) {
            input.classList.add('error');
            input.classList.remove('success');
            errorSpan.textContent = error;
            errorSpan.classList.add('show');
            return false;
        } else {
            input.classList.remove('error');
            errorSpan.classList.remove('show');
            
            if (value) {
                input.classList.add('success');
            } else {
                input.classList.remove('success');
            }
            return true;
        }
    }

    validateForm(formId) {
        let isValid = true;
        const fields = formId === 'loginForm' 
            ? ['loginEmail', 'loginPassword']
            : ['signupName', 'signupEmail', 'signupPassword', 'signupPasswordConfirm'];

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        // Check terms for signup
        if (formId === 'signupForm') {
            const terms = document.getElementById('agreeTerms');
            const termsError = document.getElementById('agreeTermsError');
            if (!terms?.checked) {
                termsError.textContent = 'You must agree to the terms';
                termsError.classList.add('show');
                isValid = false;
            } else {
                termsError.classList.remove('show');
            }
        }

        return isValid;
    }

    async handleUpdatePassword(e) {
        e.preventDefault();
        
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        if (password !== confirmPassword) {
            this.showMessage('error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            this.showMessage('error', 'Password must be at least 6 characters');
            return;
        }

        this.setLoading(true);

        try {
            const { error } = await this.supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            this.showMessage('success', 'Password updated successfully!');
            
            // Wait a bit then redirect to login
            setTimeout(() => {
                window.location.href = 'Auth.html';
            }, 2000);

        } catch (error) {
            console.error('Update password error:', error);
            this.showMessage('error', error.message);
        } finally {
            this.setLoading(false);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        if (!this.validateForm('loginForm')) return;

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe')?.checked;
        const submitBtn = document.getElementById('loginSubmit');

        this.setLoading(true, submitBtn);
        this.hideMessage('error');

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            if (rememberMe) {
                localStorage.setItem('userEmail', email);
                localStorage.setItem('rememberMe', 'true');
            }

            this.showMessage('success', 'Login successful! Redirecting...');
            this.currentUser = data.user;
            
            setTimeout(() => {
                window.location.replace(this.getAbsoluteUrl('index.html'));
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            this.setLoading(false, submitBtn);
            this.showMessage('error', this.getErrorMessage(error));
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        if (!this.validateForm('signupForm')) return;

        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const phone = document.getElementById('signupPhone').value.trim();
        const submitBtn = document.getElementById('signupSubmit');

        this.setLoading(true, submitBtn);
        this.hideMessage('error');

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        display_name: name.split(' ')[0],
                        phone: phone || null
                    }
                }
            });

            if (error) throw error;

            this.setLoading(false, submitBtn);
            this.showMessage('success', 'Account created successfully! Redirecting...');
            
            setTimeout(() => {
                window.location.replace(this.getAbsoluteUrl('index.html'));
            }, 1500);

        } catch (error) {
            console.error('Signup error:', error);
            this.setLoading(false, submitBtn);
            this.showMessage('error', this.getErrorMessage(error));
        }
    }

    async handleGoogleAuth() {
        if (!this.supabase) {
            this.showMessage('error', 'Authentication service not available');
            return;
        }

        this.setLoading(true);

        try {
            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/index.html'
                }
            });

            if (error) throw error;

        } catch (error) {
            console.error('Google auth error:', error);
            this.setLoading(false);
            this.showMessage('error', 'Google sign-in failed. Please try again.');
        }
    }

    loadRememberedEmail() {
        const savedEmail = localStorage.getItem('userEmail');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        
        if (savedEmail && this.authMode === 'login') {
            const emailInput = document.getElementById('loginEmail');
            const rememberCheckbox = document.getElementById('rememberMe');
            
            if (emailInput) emailInput.value = savedEmail;
            if (rememberCheckbox) rememberCheckbox.checked = rememberMe;
        }
    }

    setLoading(isLoading, button = null) {
        const overlay = document.getElementById('loadingOverlay');
        overlay?.classList.toggle('show', isLoading);

        if (button) {
            button.classList.toggle('loading', isLoading);
            button.disabled = isLoading;
        }
    }

    showMessage(type, message) {
        const container = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
        const textElement = document.getElementById(type === 'success' ? 'successText' : 'errorText');
        
        if (container && textElement) {
            textElement.textContent = message;
            container.classList.add('show');
            
            if (type === 'success') {
                setTimeout(() => this.hideMessage('success'), 5000);
            }
        }
    }

    hideMessage(type) {
        const container = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
        container?.classList.remove('show');
    }

    getErrorMessage(error) {
        const messages = {
            'Invalid login credentials': 'Invalid email or password',
            'Email not confirmed': 'Please verify your email address',
            'User already registered': 'An account with this email already exists',
            'Password should be at least 6 characters': 'Password must be at least 6 characters'
        };
        return messages[error.message] || error.message || 'An error occurred. Please try again.';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new PremiumAuthManager();
});
