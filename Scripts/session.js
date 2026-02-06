// ====================================
// REDitors Session Manager - FIXED & IMPROVED
// Handles user authentication state on main pages
// ====================================

class SessionManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.initPromise = this.init();
    }

    async init() {
        try {
            // Wait for Supabase
            await this.waitForSupabase();
            
            // Check session
            await this.checkSession();
            
            // Update UI
            this.updateNavigationUI();
            
            // Listen for auth changes
            this.listenForAuthChanges();
            
            this.isInitialized = true;
            console.log('✓ Session Manager: Initialized');
        } catch (error) {
            console.error('Session Manager initialization error:', error);
        }
    }

    waitForSupabase() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    clearInterval(check);
                    console.log('✓ Session Manager: Supabase connected');
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(check);
                console.warn('⚠ Session Manager: Supabase timeout');
                resolve();
            }, 5000);
        });
    }

    async checkSession() {
        if (!this.supabase) {
            console.log('ℹ Session Manager: Supabase not available');
            return;
        }

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) throw error;
            
            if (session) {
                this.currentUser = session.user;
                console.log('✓ Active session:', this.currentUser.email);
                return true;
            } else {
                this.currentUser = null;
                console.log('ℹ No active session');
                return false;
            }
        } catch (error) {
            console.error('Session check error:', error);
            return false;
        }
    }

    listenForAuthChanges() {
        if (!this.supabase) return;

        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_IN') {
                this.currentUser = session.user;
                this.updateNavigationUI();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.updateNavigationUI();
            }
        });
    }

    updateNavigationUI() {
        const navRight = document.querySelector('.nav-right');
        if (!navRight) return;

        // Remove existing auth section if present
        const existingAuthSection = navRight.querySelector('.auth-section');
        if (existingAuthSection) {
            existingAuthSection.remove();
        }

        if (this.currentUser) {
            // User is logged in - show user menu
            this.renderUserMenu(navRight);
        } else {
            // User is not logged in - show login button
            this.renderLoginButton(navRight);
        }
    }

    renderUserMenu(container) {
        const authSection = document.createElement('div');
        authSection.className = 'auth-section';
        
        const userInitial = this.getUserInitial();
        const userName = this.getUserName();
        const userEmail = this.currentUser.email;
        
        authSection.innerHTML = `
            <div class="user-menu">
                <div class="user-avatar" title="${userName || userEmail}">
                    ${userInitial}
                </div>
                <div class="user-dropdown">
                    <div class="user-info">
                        <div class="user-name">${userName || 'User'}</div>
                        <div class="user-email">${userEmail}</div>
                    </div>
                    <div class="dropdown-divider"></div>
                    <a href="Profile.html" class="dropdown-item">
                        <span class="dropdown-icon">👤</span>
                        Profile
                    </a>
                    <a href="settings.html" class="dropdown-item">
                        <span class="dropdown-icon">⚙️</span>
                        Settings
                    </a>
                    <a href="ForgotPassword.html" class="dropdown-item">
                        <span class="dropdown-icon">🔑</span>
                        Reset Password
                    </a>
                    <a href="index.html#projects" class="dropdown-item">
                        <span class="dropdown-icon">📁</span>
                        My Projects
                    </a>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item" id="signOutBtn">
                        <span class="dropdown-icon">🚪</span>
                        Sign Out
                    </button>
                </div>
            </div>
        `;
        
        // Insert before mobile menu toggle or at the end
        const mobileToggle = container.querySelector('.mobile-menu-toggle');
        if (mobileToggle) {
            container.insertBefore(authSection, mobileToggle);
        } else {
            container.appendChild(authSection);
        }
        
        // Add sign out handler
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.handleSignOut());
        }
    }

    renderLoginButton(container) {
        const authSection = document.createElement('div');
        authSection.className = 'auth-section';
        
        authSection.innerHTML = `
            <a href="Auth.html" class="nav-btn-secondary">Login</a>
            <a href="Auth.html?signup=true" class="nav-btn-primary">Sign Up Free</a>
        `;
        
        // Insert before mobile menu toggle or at the end
        const mobileToggle = container.querySelector('.mobile-menu-toggle');
        if (mobileToggle) {
            container.insertBefore(authSection, mobileToggle);
        } else {
            container.appendChild(authSection);
        }
    }

    getUserInitial() {
        if (this.currentUser.user_metadata?.display_name) {
            return this.currentUser.user_metadata.display_name.charAt(0).toUpperCase();
        } else if (this.currentUser.user_metadata?.full_name) {
            return this.currentUser.user_metadata.full_name.charAt(0).toUpperCase();
        } else if (this.currentUser.email) {
            return this.currentUser.email.charAt(0).toUpperCase();
        }
        return 'U';
    }

    getUserName() {
        if (this.currentUser.user_metadata?.display_name) {
            return this.currentUser.user_metadata.display_name;
        } else if (this.currentUser.user_metadata?.full_name) {
            return this.currentUser.user_metadata.full_name;
        }
        return null;
    }

    async handleSignOut() {
        if (!this.supabase) return;

        const confirmSignOut = confirm('Are you sure you want to sign out?');
        if (!confirmSignOut) return;

        try {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) throw error;
            
            console.log('✓ Signed out successfully');
            this.currentUser = null;
            this.updateNavigationUI();
            
            // Show notification
            this.showNotification('Signed out successfully');
            
            // Redirect to home after 1 second
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('Sign out error:', error);
            this.showNotification('Error signing out', 'error');
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `auth-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#44ff44' : '#ff4444'};
            color: #000;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-weight: 600;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Public API
    isAuthenticated() {
        return this.currentUser !== null;
    }

    getUser() {
        return this.currentUser;
    }

    async waitForInit() {
        await this.initPromise;
        return this.isInitialized;
    }
}

// Initialize session manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if NOT on auth page
    if (!window.location.pathname.includes('Auth.html') && 
        !window.location.pathname.includes('ForgotPassword.html')) {
        window.sessionManager = new SessionManager();
    }
});

// Add notification animation styles
if (!document.querySelector('#auth-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'auth-notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .user-dropdown {
            min-width: 220px;
        }
        
        .user-info {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 8px;
        }
        
        .user-name {
            font-weight: 700;
            font-size: 0.95rem;
            margin-bottom: 4px;
            color: var(--accent);
        }
        
        .user-email {
            font-size: 0.75rem;
            color: var(--text-dim);
            word-break: break-all;
        }
        
        .dropdown-divider {
            height: 1px;
            background: var(--border);
            margin: 8px 0;
        }
        
        .dropdown-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            color: var(--text);
            text-decoration: none;
            background: none;
            border: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 6px;
            font-size: 0.9rem;
        }
        
        .dropdown-item:hover {
            background: var(--gray);
            color: var(--accent);
            transform: translateX(4px);
        }
        
        .dropdown-icon {
            font-size: 1rem;
            width: 20px;
            text-align: center;
        }
    `;
    document.head.appendChild(style);
}