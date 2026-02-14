// ============================================================
// REDitors Complete Authentication System
// Login, Logout, Signup with Password
// ============================================================

class REDitorsAuth {
        constructor() {
            this.supabase = null;
            this.currentUser = null;
            this.init();
        }
    
        async init() {
            console.log('🔐 Initializing Authentication System');
            await this.waitForSupabase();
            await this.checkLoginStatus();
            this.initLoginModal();
            this.initLeaderboard();
            this.initSocialStats();
            console.log('✅ Auth System Ready');
        }
    
        waitForSupabase() {
            return new Promise((resolve) => {
                const check = setInterval(() => {
                    if (window.supabaseClient) {
                        this.supabase = window.supabaseClient;
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(check);
                    resolve();
                }, 5000);
            });
        }
    
        // ============================================================
        // CHECK LOGIN STATUS ON PAGE LOAD
        // ============================================================
        
        async checkLoginStatus() {
            const savedEmail = localStorage.getItem('user_email');
            const savedToken = localStorage.getItem('user_token');
            
            if (savedEmail && savedToken && this.supabase) {
                try {
                    // Verify user exists
                    const { data, error } = await this.supabase
                        .from('waitlist')
                        .select('*')
                        .eq('email', savedEmail)
                        .maybeSingle();
                    
                    if (!error && data) {
                        this.currentUser = data;
                        this.showLoggedInUI();
                        console.log('✅ User auto-logged in:', savedEmail);
                    } else {
                        this.logout();
                    }
                } catch (error) {
                    console.error('Login check error:', error);
                    this.logout();
                }
            } else {
                this.showLoggedOutUI();
            }
        }
    
        // ============================================================
        // HASH PASSWORD
        // ============================================================
        
        async hashPassword(password) {
            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }
    
        // ============================================================
        // LOGIN MODAL SETUP
        // ============================================================
        
        initLoginModal() {
            // Login button in nav (for existing users)
            const loginNavBtn = document.getElementById('loginNavBtn');
            if (loginNavBtn) {
                loginNavBtn.addEventListener('click', () => {
                    this.openLoginModal();
                });
            }
    
            // Login modal controls
            const loginModal = document.getElementById('loginModal');
            const loginClose = document.getElementById('loginClose');
            const loginOverlay = document.getElementById('loginOverlay');
            const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    
            if (loginClose) {
                loginClose.addEventListener('click', () => this.closeLoginModal());
            }
    
            if (loginOverlay) {
                loginOverlay.addEventListener('click', () => this.closeLoginModal());
            }
    
            if (loginSubmitBtn) {
                loginSubmitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogin();
                });
            }
    
            // Enter key to submit
            const loginEmailInput = document.getElementById('loginEmail');
            const loginPasswordInput = document.getElementById('loginPassword');
    
            [loginEmailInput, loginPasswordInput].forEach(input => {
                if (input) {
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            this.handleLogin();
                        }
                    });
                }
            });
    
            // "Already have account" link in signup modal
            const showLoginLink = document.getElementById('showLoginLink');
            if (showLoginLink) {
                showLoginLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.preOrderManager) {
                        window.preOrderManager.closeModal('waitlistModal');
                    }
                    this.openLoginModal();
                });
            }
    
            // "Create account" link in login modal
            const showSignupLink = document.getElementById('showSignupLink');
            if (showSignupLink) {
                showSignupLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.closeLoginModal();
                    if (window.preOrderManager) {
                        window.preOrderManager.openWaitlistModal();
                    }
                });
            }
        }
    
        // ============================================================
        // LOGIN
        // ============================================================
        
        async handleLogin() {
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            const loginBtn = document.getElementById('loginSubmitBtn');
    
            if (!emailInput || !passwordInput || !loginBtn) {
                console.error('Login form elements not found');
                return;
            }
    
            const email = emailInput.value.trim().toLowerCase();
            const password = passwordInput.value;
    
            // Validate
            if (!email) {
                this.showToast('Please enter your email', 'error');
                emailInput.focus();
                return;
            }
    
            if (!password) {
                this.showToast('Please enter your password', 'error');
                passwordInput.focus();
                return;
            }
    
            // Set loading state
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span>⏳ Logging in...</span>';
    
            try {
                if (!this.supabase) {
                    throw new Error('Database not connected. Please refresh the page.');
                }
    
                const passwordHash = await this.hashPassword(password);
                
                const { data, error } = await this.supabase
                    .from('waitlist')
                    .select('*')
                    .eq('email', email)
                    .eq('password_hash', passwordHash)
                    .maybeSingle();
                
                if (error || !data) {
                    throw new Error('Invalid email or password');
                }
    
                // Update last login
                await this.supabase
                    .from('waitlist')
                    .update({ last_login_at: new Date().toISOString() })
                    .eq('email', email);
    
                // Save to localStorage
                const token = btoa(email + ':' + Date.now());
                localStorage.setItem('user_email', email);
                localStorage.setItem('user_token', token);
    
                this.currentUser = data;
                this.showLoggedInUI();
                this.closeLoginModal();
                
                this.showToast('✓ Welcome back!', 'success');
                console.log('✅ User logged in:', email);
    
                // Clear form
                emailInput.value = '';
                passwordInput.value = '';
    
            } catch (error) {
                console.error('Login error:', error);
                this.showToast(error.message || 'Login failed. Please try again.', 'error');
            } finally {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Login</span>';
            }
        }
    
        // ============================================================
        // LOGOUT
        // ============================================================
        
        logout() {
            localStorage.removeItem('user_email');
            localStorage.removeItem('user_token');
            this.currentUser = null;
            this.showLoggedOutUI();
            this.showToast('✓ Logged out successfully', 'success');
            console.log('✅ User logged out');
        }
    
        // ============================================================
        // UI UPDATES
        // ============================================================
        
        showLoggedInUI() {
            const profileBtn = document.getElementById('profileBtn');
            const guestButtons = document.getElementById('guestButtons');
            
            if (profileBtn) {
                profileBtn.style.display = 'flex';
                
                const initial = this.currentUser.email.charAt(0).toUpperCase();
                const avatar = profileBtn.querySelector('.profile-avatar');
                if (avatar) {
                    avatar.textContent = initial;
                    avatar.title = this.currentUser.email;
                }
                
                const profileText = profileBtn.querySelector('.profile-text');
                if (profileText) {
                    profileText.textContent = this.currentUser.name || 'Profile';
                }
            }
            
            if (guestButtons) {
                guestButtons.style.display = 'none';
            }
    
            // Update profile button click to show profile modal
            if (profileBtn && window.reditors) {
                profileBtn.onclick = () => {
                    if (window.reditors.showProfileModal) {
                        window.reditors.showProfileModal();
                    }
                };
            }
        }
    
        showLoggedOutUI() {
            const profileBtn = document.getElementById('profileBtn');
            const guestButtons = document.getElementById('guestButtons');
            
            if (profileBtn) profileBtn.style.display = 'none';
            if (guestButtons) guestButtons.style.display = 'flex';
        }
    
        // ============================================================
        // MODAL CONTROLS
        // ============================================================
        
        openLoginModal() {
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                setTimeout(() => {
                    const emailInput = document.getElementById('loginEmail');
                    if (emailInput) emailInput.focus();
                }, 100);
            }
        }
    
        closeLoginModal() {
            const modal = document.getElementById('loginModal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    
        // ============================================================
        // LEADERBOARD
        // ============================================================
        
        async initLeaderboard() {
            await this.loadLeaderboard();
            setInterval(() => this.loadLeaderboard(), 30000);
    
            const joinToCompeteBtn = document.getElementById('joinToCompeteBtn');
            if (joinToCompeteBtn) {
                joinToCompeteBtn.addEventListener('click', () => {
                    if (window.preOrderManager) {
                        window.preOrderManager.openWaitlistModal();
                    }
                });
            }
        }
    
        async loadLeaderboard() {
            if (!this.supabase) return;
    
            const leaderboardList = document.getElementById('leaderboardList');
            if (!leaderboardList) return;
    
            try {
                const { data, error } = await this.supabase
                    .from('waitlist')
                    .select('email, name, referral_code, referral_count, waitlist_position, created_at')
                    .gt('referral_count', 0)
                    .order('referral_count', { ascending: false })
                    .order('created_at', { ascending: true })
                    .limit(5);
    
                if (error) throw error;
    
                if (!data || data.length === 0) {
                    leaderboardList.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px; color: #666;">
                            <div style="font-size: 3rem; margin-bottom: 15px;">🏆</div>
                            <p style="font-size: 1.1rem; margin-bottom: 10px;">No referrals yet!</p>
                            <p style="font-size: 0.95rem; color: #555;">Be the first to share your link and claim the top spot</p>
                        </div>
                    `;
                    return;
                }
    
                let html = '';
                data.forEach((user, index) => {
                    const rank = index + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '⭐';
                    const rankColor = rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#44ff44';
                    const prize = this.getPrizeTier(user.referral_count);
                    
                    const emailParts = user.email.split('@');
                    const maskedEmail = emailParts[0].charAt(0) + '***@' + emailParts[1];
                    
                    html += `
                        <div style="display: flex; align-items: center; gap: 20px; padding: 20px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                            <div style="font-size: 2.5rem; min-width: 60px; text-align: center;">${medal}</div>
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                                    <span style="font-weight: 700; font-size: 1.1rem; color: ${rankColor};">#${rank}</span>
                                    <span style="color: #fff; font-size: 1rem;">${user.name || 'Anonymous'}</span>
                                    <span style="color: #666; font-size: 0.85rem;">${maskedEmail}</span>
                                </div>
                                <div style="display: flex; gap: 15px; font-size: 0.9rem; color: #999;">
                                    <span>🎁 ${user.referral_count} referrals</span>
                                    <span>📊 Position #${user.waitlist_position}</span>
                                    ${prize ? `<span style="color: ${rankColor};">🏆 ${prize}</span>` : ''}
                                </div>
                            </div>
                            <div style="min-width: 80px; text-align: center; padding: 12px 20px; background: linear-gradient(135deg, ${rankColor}20, ${rankColor}10); border: 1px solid ${rankColor}40; border-radius: 8px;">
                                <div style="font-size: 1.5rem; font-weight: 700; color: ${rankColor};">${user.referral_count}</div>
                                <div style="font-size: 0.75rem; color: #999; margin-top: 2px;">refs</div>
                            </div>
                        </div>
                    `;
                });
    
                leaderboardList.innerHTML = html;
    
            } catch (error) {
                console.error('Leaderboard error:', error);
            }
        }
    
        getPrizeTier(count) {
            if (count >= 20) return 'Lifetime Pro';
            if (count >= 15) return '1 Year Pro';
            if (count >= 10) return '6 Months Pro';
            if (count >= 5) return 'Early Access';
            return null;
        }
    
        // ============================================================
        // SOCIAL STATS
        // ============================================================
        
        async initSocialStats() {
            await this.loadSocialStats();
            setInterval(() => this.loadSocialStats(), 60000);
        }
    
        async loadSocialStats() {
            if (!this.supabase) return;
    
            try {
                const { data, error } = await this.supabase
                    .from('waitlist_stats')
                    .select('*')
                    .single();
    
                if (!error && data) {
                    const socialTotalUsers = document.getElementById('socialTotalUsers');
                    const socialTotalReferrals = document.getElementById('socialTotalReferrals');
    
                    if (socialTotalUsers) {
                        socialTotalUsers.textContent = (data.total_signups || 0) + '+';
                    }
    
                    if (socialTotalReferrals) {
                        socialTotalReferrals.textContent = (data.total_referrals || 0) + '+';
                    }
                }
            } catch (error) {
                console.error('Stats error:', error);
            }
        }
    
        // ============================================================
        // TOAST NOTIFICATION
        // ============================================================
        
        showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            if (!toast) return;
            
            toast.textContent = message;
            toast.className = 'toast';
            
            if (type === 'error') {
                toast.classList.add('error');
            }
            
            setTimeout(() => toast.classList.add('show'), 10);
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }
    
    // ============================================================
    // INITIALIZE
    // ============================================================
    
    document.addEventListener('DOMContentLoaded', () => {
        window.reditorsAuth = new REDitorsAuth();
        console.log('✅ REDitors Auth with Login/Logout initialized');
    });