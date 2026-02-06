// ====================================
// Password Reset System
// ====================================

class PasswordResetManager {
    constructor() {
        this.supabase = null;
        this.init();
    }

    async init() {
        await this.waitForSupabase();
        this.setupEventListeners();
    }

    waitForSupabase() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    clearInterval(check);
                    console.log('✓ Reset Manager: Supabase connected');
                    resolve();
                }
            }, 100);
            setTimeout(() => { clearInterval(check); resolve(); }, 10000);
        });
    }

    setupEventListeners() {
        document.getElementById('forgotPasswordForm')?.addEventListener('submit', (e) => this.handleReset(e));
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async handleReset(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('resetEmail');
        const email = emailInput.value.trim();
        const submitBtn = document.getElementById('resetSubmit');

        if (!email) {
            this.showMessage('error', 'Please enter your email address');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showMessage('error', 'Please enter a valid email address');
            return;
        }

        this.setLoading(true, submitBtn);
        this.hideMessage('error');
        this.hideMessage('success');

        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/Auth.html'
            });

            if (error) throw error;

            this.showMessage('success', 'Password reset link sent! Please check your email.');
            emailInput.value = '';

        } catch (error) {
            console.error('Reset error:', error);
            this.showMessage('error', error.message || 'Failed to send reset email. Please try again.');
        } finally {
            this.setLoading(false, submitBtn);
        }
    }

    setLoading(isLoading, button = null) {
        if (button) {
            const textSpan = button.querySelector('.button-text');
            const loaderSpan = button.querySelector('.button-loader');
            
            if (isLoading) {
                button.disabled = true;
                if (textSpan) textSpan.style.opacity = '0';
                if (loaderSpan) loaderSpan.style.display = 'block';
            } else {
                button.disabled = false;
                if (textSpan) textSpan.style.opacity = '1';
                if (loaderSpan) loaderSpan.style.display = 'none';
            }
        }
    }

    showMessage(type, message) {
        const container = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
        const textElement = document.getElementById(type === 'success' ? 'successText' : 'errorText');
        
        if (container && textElement) {
            textElement.textContent = message;
            container.classList.add('show');
            
            if (type === 'success') {
                setTimeout(() => this.hideMessage('success'), 8000);
            }
        }
    }

    hideMessage(type) {
        const container = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
        container?.classList.remove('show');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.passwordResetManager = new PasswordResetManager();
});