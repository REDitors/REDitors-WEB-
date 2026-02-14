// ====================================
// REDitors Pre-Order System - FIXED VERSION WITH REAL USER ACCOUNTS
// Integrates with Supabase Auth + users table + waitlist table
// ====================================

class PreOrderManager {
    constructor() {
        this.supabase = null;
        this.selectedTier = 'early-bird';
        this.launchDate = new Date('2026-03-01T15:00:00Z');
        this.countdownInterval = null;
        this.init();
    }

    async init() {
        this.setupCountdown();
        await this.waitForSupabase();
        this.setupEventListeners();
        this.setupFAQ();
        await this.updateWaitlistStats();
        console.log('✅ Pre-Order Manager Initialized (FIXED WITH REAL AUTH)');
    }

    waitForSupabase() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    clearInterval(check);
                    console.log('✅ Supabase Connected');
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(check);
                console.warn('⚠️ Supabase timeout');
                resolve();
            }, 5000);
        });
    }

    // ===== COUNTDOWN TIMER =====
    setupCountdown() {
        this.updateCountdown();
        this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    }

    updateCountdown() {
        const now = new Date().getTime();
        const distance = this.launchDate.getTime() - now;
        
        if (distance < 0) {
            clearInterval(this.countdownInterval);
            this.showLaunchMessage();
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }

    showLaunchMessage() {
        const countdownContainer = document.querySelector('.countdown-container');
        if (countdownContainer) {
            countdownContainer.innerHTML = `
                <div class="launch-message">
                    <h2 style="font-size: 2.5rem; color: #44ff44; margin-bottom: 16px;">
                        🎉 WE'RE LIVE!
                    </h2>
                    <p style="font-size: 1.25rem;">REDitors is now available!</p>
                </div>
            `;
        }
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        const joinButtons = document.querySelectorAll('#joinWaitlistBtn, #joinWaitlistBtnNav, #finalCtaBtn, .tier-btn');
        joinButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tier = e.target.getAttribute('data-tier');
                if (tier) this.selectedTier = tier;
                this.openWaitlistModal();
            });
        });

        const learnMoreBtn = document.getElementById('learnMoreBtn');
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                this.showToast('Video teaser coming soon! 🎬');
            });
        }

        this.setupModalControls();
        this.setupTierSelection();
        this.setupAuthForms();
    }

    setupModalControls() {
        const modalClose = document.getElementById('modalClose');
        const modalOverlay = document.getElementById('modalOverlay');
        const successCloseBtn = document.getElementById('successCloseBtn');
        
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal('waitlistModal'));
        if (modalOverlay) modalOverlay.addEventListener('click', () => this.closeModal('waitlistModal'));
        if (successCloseBtn) successCloseBtn.addEventListener('click', () => {
            this.closeModal('successModal');
            // Refresh the app to show profile
            if (window.reditors) {
                window.reditors.checkAuthAndLoadProfile();
            }
        });
    }

    setupTierSelection() {
        const tierOptions = document.querySelectorAll('.tier-option');
        tierOptions.forEach(option => {
            option.addEventListener('click', () => {
                tierOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedTier = option.getAttribute('data-tier');
            });
        });
        
        const defaultTier = document.querySelector('.tier-option[data-tier="founder"]');
        if (defaultTier) {
            defaultTier.classList.add('selected');
            this.selectedTier = 'founder';
        }
    }

    setupAuthForms() {
        const switchToLogin = document.getElementById('switchToLogin');
        const switchToSignup = document.getElementById('switchToSignup');
        
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthForm('login');
            });
        }
        
        if (switchToSignup) {
            switchToSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthForm('signup');
            });
        }
        
        const signupBtn = document.getElementById('signupSubmitBtn');
        const loginBtn = document.getElementById('loginSubmitBtn');
        
        if (signupBtn) {
            signupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }
        
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Handle enter key
        const inputs = document.querySelectorAll('#signupEmail, #signupPassword, #signupName, #loginEmail, #loginPassword');
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const form = input.closest('.auth-form');
                    if (form.id === 'signupForm') {
                        this.handleSignup();
                    } else {
                        this.handleLogin();
                    }
                }
            });
        });
    }

    toggleAuthForm(form) {
        const signupForm = document.getElementById('signupForm');
        const loginForm = document.getElementById('loginForm');
        
        if (form === 'login') {
            signupForm.classList.remove('active');
            loginForm.classList.add('active');
        } else {
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
        }
    }

    // ===== SIGNUP - CREATES REAL SUPABASE AUTH USER =====
    async handleSignup() {
        const email = document.getElementById('signupEmail').value.trim().toLowerCase();
        const password = document.getElementById('signupPassword').value;
        const name = document.getElementById('signupName').value.trim();
        
        if (!this.validateSignup(email, password)) return;
        
        const signupBtn = document.getElementById('signupSubmitBtn');
        signupBtn.disabled = true;
        signupBtn.innerHTML = '<span>⏳ Creating account...</span>';
        
        try {
            // Generate referral code BEFORE signup
            const referralCode = 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
            
            // Get referred_by code from URL or session
            const urlParams = new URLSearchParams(window.location.search);
            const referredBy = urlParams.get('ref') || sessionStorage.getItem('referral_code') || null;
            
            // 1. Create Supabase Auth user
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: name || null,
                        referral_code: referralCode,
                        referred_by: referredBy,
                        tier: this.selectedTier
                    }
                }
            });
            
            if (authError) throw authError;
            
            if (!authData.user) {
                throw new Error('User creation failed');
            }
            
            console.log('✅ Auth user created:', authData.user.id);
            
            // 2. Create/update user in public.users table
            const { error: userError } = await this.supabase
                .from('users')
                .upsert({
                    id: authData.user.id,
                    email: email,
                    display_name: name || null,
                    referral_code: referralCode,
                    referred_by: referredBy,
                    email_verified: false,
                    subscription_tier: this.selectedTier,
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });
            
            if (userError) {
                console.error('User table error:', userError);
                // Continue even if this fails - the trigger should handle it
            }
            
            // 3. Add to waitlist table
            const { error: waitlistError } = await this.supabase
                .from('waitlist')
                .insert({
                    email: email,
                    name: name || null,
                    tier: this.selectedTier,
                    referral_code: referralCode,
                    referred_by: referredBy,
                    user_id: authData.user.id,
                    source: 'website',
                    campaign: 'preorder',
                    user_agent: navigator.userAgent
                });
            
            if (waitlistError) {
                console.warn('Waitlist insertion warning:', waitlistError);
                // Continue even if this fails
            }
            
            // 4. Update referrer's count if applicable
            if (referredBy) {
                await this.incrementReferralCount(referredBy);
            }
            
            // 5. Send to Google Sheets
            await this.sendToGoogleSheets(email, name, this.selectedTier);
            
            // 6. Update stats
            await this.updateWaitlistStats();
            
            // 7. Show success
            this.closeModal('waitlistModal');
            this.showSuccessModal(email, referralCode, authData.user.id);
            
        } catch (error) {
            console.error('Signup error:', error);
            
            if (error.message?.includes('already registered') || error.message?.includes('duplicate')) {
                this.showToast('✓ You already have an account! Please sign in.', 'error');
                this.toggleAuthForm('login');
            } else {
                this.showToast('⚠️ Error: ' + (error.message || 'Signup failed'), 'error');
            }
        } finally {
            signupBtn.disabled = false;
            signupBtn.innerHTML = '<span>Join Waitlist</span>';
        }
    }

    validateSignup(email, password) {
        if (!email) {
            this.showToast('⚠️ Please enter your email', 'error');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showToast('⚠️ Please enter a valid email', 'error');
            return false;
        }
        
        if (!password || password.length < 6) {
            this.showToast('⚠️ Password must be at least 6 characters', 'error');
            return false;
        }
        
        return true;
    }

    async incrementReferralCount(referralCode) {
        try {
            // Update in users table
            const { error: usersError } = await this.supabase.rpc('increment_referral_count', {
                ref_code: referralCode
            });
            
            if (usersError) {
                // Fallback: direct update
                const { error: updateError } = await this.supabase
                    .from('users')
                    .update({ 
                        referral_count: this.supabase.raw('referral_count + 1')
                    })
                    .eq('referral_code', referralCode);
                
                if (updateError) console.warn('Referral count update failed:', updateError);
            }
            
            // Also update waitlist table
            await this.supabase
                .from('waitlist')
                .update({ 
                    referral_count: this.supabase.raw('referral_count + 1')
                })
                .eq('referral_code', referralCode);
                
        } catch (e) {
            console.error('Referral increment error:', e);
        }
    }

    // ===== SEND TO GOOGLE SHEETS =====
    async sendToGoogleSheets(email, name, tier) {
        const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyvb4y9g3r3msXTnYP9trTnGtcIchdCPghyVI21aJmQbPlFoKO02uIdZ6LMOGZ5X-i0-Q/exec';
        
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    name: name || 'Not provided',
                    tier: tier.toUpperCase(),
                    timestamp: new Date().toISOString()
                })
            });
            console.log('✅ Sent to Google Sheets');
        } catch (error) {
            console.error('Google Sheets error:', error);
        }
    }

    // ===== LOGIN - USES REAL SUPABASE AUTH =====
    async handleLogin() {
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showToast('⚠️ Please fill in all fields', 'error');
            return;
        }
        
        const loginBtn = document.getElementById('loginSubmitBtn');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>⏳ Signing in...</span>';
        
        try {
            // Sign in with Supabase Auth
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            if (!data.user) {
                throw new Error('Login failed');
            }
            
            console.log('✅ User logged in:', data.user.id);
            
            // Show success
            this.showToast('✓ Welcome back!', 'success');
            this.closeModal('waitlistModal');
            
            // Refresh app to load user profile
            if (window.reditors) {
                await window.reditors.checkAuthAndLoadProfile();
            }
            
        } catch (error) {
            console.error('Login error:', error);
            
            if (error.message?.includes('Invalid login credentials')) {
                this.showToast('⚠️ Invalid email or password', 'error');
            } else if (error.message?.includes('Email not confirmed')) {
                this.showToast('⚠️ Please verify your email first', 'error');
            } else {
                this.showToast('⚠️ Login failed. Please try again.', 'error');
            }
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Sign In & Continue</span>';
        }
    }

    // ===== MODALS =====
    openWaitlistModal() {
        const modal = document.getElementById('waitlistModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showSuccessModal(email, referralCode, userId) {
        const modal = document.getElementById('successModal');
        const messageEl = document.getElementById('successMessage');
        const detailsEl = document.getElementById('successDetails');
        
        if (modal && messageEl) {
            messageEl.innerHTML = `
                <strong>Welcome aboard!</strong><br>
                Your account has been created successfully.
            `;
        }
        
        if (detailsEl) {
            detailsEl.innerHTML = `
                <div style="text-align: left; margin-top: 20px; padding: 20px; background: rgba(68, 255, 68, 0.1); border-radius: 12px; border: 1px solid rgba(68, 255, 68, 0.3);">
                    <p style="margin: 0 0 12px 0;"><strong>📧 Email:</strong> ${email}</p>
                    <p style="margin: 0 0 12px 0;"><strong>🎯 Tier:</strong> ${this.getTierName(this.selectedTier)}</p>
                    <p style="margin: 0;"><strong>🔗 Referral Code:</strong> <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; font-family: monospace;">${referralCode}</code></p>
                </div>
                <p style="margin-top: 16px; font-size: 14px; color: #999;">
                    Check your email for verification link!
                </p>
            `;
        }
        
        if (modal) {
            modal.classList.add('active');
        }
    }

    getTierName(tier) {
        const names = {
            'early-bird': '🌟 Early Bird',
            'founder': '👑 Founder',
            'vip': '💎 VIP Elite'
        };
        return names[tier] || tier;
    }

    // ===== WAITLIST STATS =====
    async updateWaitlistStats() {
        if (!this.supabase) return;
        
        try {
            // Get total count from waitlist
            const { count: totalCount } = await this.supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true });
            
            // Get today's signups
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count: todayCount } = await this.supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());
            
            // Update UI
            const waitlistCountEl = document.getElementById('waitlistCount');
            const todaySignupsEl = document.getElementById('todaySignups');
            
            if (waitlistCountEl) {
                this.animateNumber(waitlistCountEl, totalCount || 0);
            }
            
            if (todaySignupsEl) {
                this.animateNumber(todaySignupsEl, todayCount || 0);
            }
            
            // Update progress bar
            this.updateProgressBar(totalCount || 0);
            
        } catch (error) {
            console.error('Stats error:', error);
        }
    }

    updateProgressBar(count) {
        const maxSpots = 1000;
        const percentage = Math.min((count / maxSpots) * 100, 100);
        const spotsLeft = Math.max(maxSpots - count, 0);
        
        const progressFill = document.querySelector('.progress-fill');
        const progressLabel = document.getElementById('progressLabel');
        const spotsLeftEl = document.querySelector('.spots-left');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        
        if (progressLabel) {
            progressLabel.textContent = `${count.toLocaleString()} joined`;
        }
        
        if (spotsLeftEl) {
            spotsLeftEl.textContent = `${spotsLeft.toLocaleString()} spots remaining`;
        }
    }

    animateNumber(element, targetValue) {
        const duration = 1000;
        const startValue = parseInt(element.textContent) || 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuad = progress * (2 - progress);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuad);
            
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // ===== FAQ =====
    setupFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (question) {
                question.addEventListener('click', () => {
                    const isActive = item.classList.contains('active');
                    
                    faqItems.forEach(i => i.classList.remove('active'));
                    
                    if (!isActive) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }

    // ===== TOAST NOTIFICATIONS =====
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.preOrderManager = new PreOrderManager();
});