// ====================================
// REDitors Pre-Order System
// Countdown, Waitlist, Auth & Referrals
// ====================================

class PreOrderManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.selectedTier = 'early-bird';
        this.launchDate = new Date('2026-03-01T15:00:00Z'); // March 1, 2026 at 3PM GMT
        this.countdownInterval = null;
        
        this.init();
    }

    async init() {
        // Initialize countdown immediately (don't wait for Supabase)
        this.setupCountdown();
        
        // Wait for Supabase
        await this.waitForSupabase();
        
        // Initialize other components
        this.setupEventListeners();
        this.setupFAQ();
        this.updateWaitlistStats();
        
        // Check if user is logged in
        await this.checkAuth();
        
        console.log('✓ Pre-Order Manager Initialized');
        console.log('✓ Launch Date:', this.launchDate.toLocaleString());
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
                console.warn('⚠ Supabase not loaded, some features may not work');
                resolve();
            }, 5000);
        });
    }

    // ===== COUNTDOWN TIMER =====
    setupCountdown() {
        console.log('🕐 Setting up countdown timer...');
        console.log('Launch date:', this.launchDate);
        
        // Update immediately
        this.updateCountdown();
        
        // Then update every second
        this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
    }

    updateCountdown() {
        const now = new Date().getTime();
        const distance = this.launchDate.getTime() - now;
        
        // Debug logging
        if (!document.getElementById('days')) {
            console.error('❌ Countdown elements not found!');
            return;
        }
        
        if (distance < 0) {
            clearInterval(this.countdownInterval);
            this.showLaunchMessage();
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // Update countdown display
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
        
        // Update FAQ text
        const launchDaysText = document.getElementById('launchDaysText');
        if (launchDaysText) {
            launchDaysText.textContent = days;
        }
    }

    showLaunchMessage() {
        const countdownContainer = document.querySelector('.countdown-container');
        if (countdownContainer) {
            countdownContainer.innerHTML = `
                <div class="launch-message">
                    <h2 style="font-size: 2.5rem; color: #44ff44; margin-bottom: 16px;">
                        🎉 WE'RE LIVE!
                    </h2>
                    <p style="font-size: 1.25rem; color: var(--text-secondary);">
                        REDitors is now available!
                    </p>
                </div>
            `;
        }
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Join Waitlist buttons
        const joinButtons = document.querySelectorAll('#joinWaitlistBtn, #finalCtaBtn, .tier-btn, #getReferralLinkBtn');
        joinButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tier = e.target.getAttribute('data-tier');
                if (tier) {
                    this.selectedTier = tier;
                }
                this.openWaitlistModal();
            });
        });

        // Learn More / Watch Teaser
        const learnMoreBtn = document.getElementById('learnMoreBtn');
        if (learnMoreBtn) {
            learnMoreBtn.addEventListener('click', () => {
                this.showToast('Video teaser coming soon! 🎬');
            });
        }

        // Modal controls
        this.setupModalControls();
        
        // Tier selection
        this.setupTierSelection();
        
        // Auth forms
        this.setupAuthForms();
        
        // Copy referral link
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.copyReferralLink());
        }
    }

    setupModalControls() {
        const modal = document.getElementById('waitlistModal');
        const modalClose = document.getElementById('modalClose');
        const modalOverlay = document.getElementById('modalOverlay');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal('waitlistModal'));
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal('waitlistModal'));
        }
        
        // Success modal close
        const successCloseBtn = document.getElementById('successCloseBtn');
        if (successCloseBtn) {
            successCloseBtn.addEventListener('click', () => this.closeModal('successModal'));
        }
    }

    setupTierSelection() {
        const tierOptions = document.querySelectorAll('.tier-option');
        tierOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected from all
                tierOptions.forEach(opt => opt.classList.remove('selected'));
                // Add selected to clicked
                option.classList.add('selected');
                // Update selected tier
                this.selectedTier = option.getAttribute('data-tier');
            });
        });
        
        // Select default tier
        const defaultTier = document.querySelector('.tier-option[data-tier="founder"]');
        if (defaultTier) {
            defaultTier.classList.add('selected');
            this.selectedTier = 'founder';
        }
    }

    setupAuthForms() {
        // Form switching
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
        
        // Form submissions
        const signupBtn = document.getElementById('signupSubmitBtn');
        const loginBtn = document.getElementById('loginSubmitBtn');
        
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.handleSignup());
        }
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }
        
        // Enter key submissions
        const signupForm = document.getElementById('signupForm');
        const loginForm = document.getElementById('loginForm');
        
        if (signupForm) {
            signupForm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSignup();
            });
        }
        
        if (loginForm) {
            loginForm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }
    }

    setupFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all FAQs
                faqItems.forEach(i => i.classList.remove('active'));
                
                // Open clicked FAQ if it wasn't active
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }

    // ===== MODAL MANAGEMENT =====
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

    toggleAuthForm(type) {
        const signupForm = document.getElementById('signupForm');
        const loginForm = document.getElementById('loginForm');
        
        if (type === 'login') {
            signupForm.classList.remove('active');
            loginForm.classList.add('active');
        } else {
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
        }
    }

    // ===== AUTHENTICATION =====
    async checkAuth() {
        if (!this.supabase) return;

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                await this.loadUserData();
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    async handleSignup() {
        if (!this.supabase) {
            this.showToast('Authentication service unavailable', 'error');
            return;
        }

        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const name = document.getElementById('signupName').value;
        
        // Validation
        if (!email || !password) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        // Show loading
        const btn = document.getElementById('signupSubmitBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Creating account...</span>';
        btn.disabled = true;
        
        try {
            // Sign up user
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: name || null,
                        preorder_tier: this.selectedTier
                    }
                }
            });
            
            if (error) throw error;
            
            this.currentUser = data.user;
            
            // Save to waitlist
            await this.addToWaitlist();
            
            // Close modal and show success
            this.closeModal('waitlistModal');
            this.showSuccessModal();
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast(error.message || 'Signup failed', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async handleLogin() {
        if (!this.supabase) {
            this.showToast('Authentication service unavailable', 'error');
            return;
        }

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showToast('Please enter email and password', 'error');
            return;
        }
        
        const btn = document.getElementById('loginSubmitBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Signing in...</span>';
        btn.disabled = true;
        
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            this.currentUser = data.user;
            
            // Check if already on waitlist
            const { data: waitlistEntry } = await this.supabase
                .from('waitlist')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();
            
            if (waitlistEntry) {
                this.closeModal('waitlistModal');
                this.showToast('Welcome back! You\'re already on the waitlist.', 'success');
                await this.loadUserData();
            } else {
                // Add to waitlist
                await this.addToWaitlist();
                this.closeModal('waitlistModal');
                this.showSuccessModal();
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Login failed', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async addToWaitlist() {
        if (!this.supabase || !this.currentUser) return;

        try {
            const referralCode = this.generateReferralCode();
            
            const { error } = await this.supabase
                .from('waitlist')
                .insert([
                    {
                        user_id: this.currentUser.id,
                        email: this.currentUser.email,
                        tier: this.selectedTier,
                        referral_code: referralCode,
                        referral_count: 0,
                        created_at: new Date().toISOString()
                    }
                ]);
            
            if (error) throw error;
            
            console.log('✓ Added to waitlist');
            
            // Update stats
            await this.updateWaitlistStats();
            
        } catch (error) {
            console.error('Waitlist error:', error);
            throw error;
        }
    }

    async loadUserData() {
        if (!this.supabase || !this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('waitlist')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();
            
            if (error) throw error;
            
            if (data) {
                // Show referral link
                this.showReferralLink(data.referral_code, data.referral_count);
            }
            
        } catch (error) {
            console.error('Load user data error:', error);
        }
    }

    // ===== REFERRAL SYSTEM =====
    generateReferralCode() {
        return 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    showReferralLink(code, count) {
        const container = document.getElementById('referralLinkContainer');
        const linkInput = document.getElementById('referralLink');
        const referralCount = document.getElementById('referralCount');
        const getBtn = document.getElementById('getReferralLinkBtn');
        
        if (container && linkInput) {
            const referralUrl = `${window.location.origin}${window.location.pathname}?ref=${code}`;
            linkInput.value = referralUrl;
            container.style.display = 'block';
            
            if (getBtn) {
                getBtn.style.display = 'none';
            }
            
            if (referralCount) {
                referralCount.textContent = count || 0;
            }
        }
    }

    copyReferralLink() {
        const linkInput = document.getElementById('referralLink');
        if (linkInput) {
            linkInput.select();
            document.execCommand('copy');
            this.showToast('Referral link copied! 🎉', 'success');
        }
    }

    // ===== WAITLIST STATS =====
    async updateWaitlistStats() {
        // For demo purposes, using static numbers
        // In production, fetch from Supabase
        const totalSpots = 4000;
        const filledSpots = 2847;
        const percentage = Math.floor((filledSpots / totalSpots) * 100);
        const spotsLeft = totalSpots - filledSpots;
        
        // Update counter
        const waitlistCount = document.getElementById('waitlistCount');
        if (waitlistCount) {
            this.animateNumber(waitlistCount, filledSpots, 2000);
        }
        
        // Update progress bar
        const progressFill = document.querySelector('.progress-fill');
        if (progressFill) {
            setTimeout(() => {
                progressFill.style.width = percentage + '%';
            }, 500);
        }
        
        // Update spots left text
        const spotsLeftElements = document.querySelectorAll('.spots-left');
        spotsLeftElements.forEach(el => {
            el.textContent = `${spotsLeft.toLocaleString()} spots left`;
        });
    }

    animateNumber(element, target, duration) {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target.toLocaleString();
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }, 16);
    }

    // ===== SUCCESS MODAL =====
    showSuccessModal() {
        const modal = document.getElementById('successModal');
        const message = document.getElementById('successMessage');
        const details = document.getElementById('successDetails');
        
        if (modal && message && details) {
            // Get tier details
            const tierInfo = this.getTierInfo(this.selectedTier);
            
            message.textContent = `You've secured your ${tierInfo.name} spot! 🎉`;
            
            details.innerHTML = `
                <div style="text-align: left;">
                    <p style="margin-bottom: 12px;"><strong>✓ Confirmation sent to:</strong><br/>${this.currentUser.email}</p>
                    <p style="margin-bottom: 12px;"><strong>✓ Your tier:</strong> ${tierInfo.name}</p>
                    <p style="margin-bottom: 12px;"><strong>✓ Early access:</strong> ${tierInfo.earlyAccess}</p>
                    <p><strong>✓ Next steps:</strong> Check your email for confirmation and waitlist details</p>
                </div>
            `;
            
            modal.classList.add('active');
        }
    }

    getTierInfo(tier) {
        const tiers = {
            'early-bird': {
                name: 'Early Bird',
                price: 'FREE',
                earlyAccess: '48 hours before launch'
            },
            'founder': {
                name: 'Founder',
                price: '$49',
                earlyAccess: '72 hours before launch'
            },
            'vip': {
                name: 'VIP Elite',
                price: '$199',
                earlyAccess: '1 week before launch'
            }
        };
        
        return tiers[tier] || tiers['early-bird'];
    }

    // ===== TOAST NOTIFICATIONS =====
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ===== UTILITY FUNCTIONS =====
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== CHECK FOR REFERRAL CODE =====
function checkReferralCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
        // Store in session
        sessionStorage.setItem('referral_code', refCode);
        console.log('✓ Referral code detected:', refCode);
        
        // You could show a special message or highlight
        setTimeout(() => {
            if (window.preOrderManager) {
                window.preOrderManager.showToast('🎁 You\'ve been referred! Join now to help your friend earn rewards.', 'success');
            }
        }, 1000);
    }
}

// ===== INITIALIZE ON DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
    window.preOrderManager = new PreOrderManager();
    checkReferralCode();
    
    console.log('✓ Pre-Order Page Ready');
});

// ===== CLEANUP ON PAGE UNLOAD =====
window.addEventListener('beforeunload', () => {
    if (window.preOrderManager && window.preOrderManager.countdownInterval) {
        clearInterval(window.preOrderManager.countdownInterval);
    }
});