// ============================================================
// REDitors Master Script - FIXED VERSION WITH REAL AUTH
// Integrates with Supabase Auth + users table
// Real user profiles and referral system
// ============================================================

class REDitorsApp {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.userData = null;
        this.stats = {
            total: 0,
            today: 0,
            spotsLeft: 0
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing REDitors App');
        
        // Wait for Supabase
        await this.waitForSupabase();
        
        // Check authentication and load user profile
        await this.checkAuthAndLoadProfile();
        
        // Initialize all modules
        this.initNavigation();
        this.initAnimations();
        this.initUIComponents();
        this.initProfileSystem();
        
        // Load real statistics
        await this.loadRealStats();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Check for referral code in URL
        this.checkReferralCode();
        
        console.log('✅ REDitors App Initialized');
    }

    // ============================================================
    // SUPABASE CONNECTION
    // ============================================================
    
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

    // ============================================================
    // AUTHENTICATION & PROFILE SYSTEM
    // ============================================================
    
    async checkAuthAndLoadProfile() {
        if (!this.supabase) {
            this.showGuestUI();
            return;
        }
        
        try {
            // Check current session
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (!session) {
                this.showGuestUI();
                return;
            }
            
            // User is authenticated - load their profile from users table
            const { data: userData, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (error || !userData) {
                console.error('Error loading user profile:', error);
                this.showGuestUI();
                return;
            }
            
            // Get waitlist position
            const { data: waitlistData } = await this.supabase
                .from('waitlist')
                .select('position')
                .eq('user_id', session.user.id)
                .single();
            
            // Set current user data
            this.currentUser = session.user;
            this.userData = {
                ...userData,
                position: waitlistData?.position || 0
            };
            
            this.showUserUI();
            
            console.log('✅ User authenticated:', this.currentUser.email);
            console.log('📊 User data:', this.userData);
            
        } catch (error) {
            console.error('Error checking auth:', error);
            this.showGuestUI();
        }
    }

    showGuestUI() {
        const profileBtn = document.getElementById('profileBtn');
        const guestButtons = document.getElementById('guestButtons');
        
        if (profileBtn) profileBtn.style.display = 'none';
        if (guestButtons) guestButtons.style.display = 'flex';
    }

    showUserUI() {
        const profileBtn = document.getElementById('profileBtn');
        const guestButtons = document.getElementById('guestButtons');
        
        if (profileBtn) {
            profileBtn.style.display = 'flex';
            
            // Update profile button with initial
            const initial = (this.userData.display_name || this.userData.email || 'U').charAt(0).toUpperCase();
            const avatar = profileBtn.querySelector('.profile-avatar');
            if (avatar) {
                avatar.textContent = initial;
                avatar.title = this.userData.email;
            }
            
            // Update text if exists
            const profileText = profileBtn.querySelector('.profile-text');
            if (profileText) {
                profileText.textContent = this.userData.display_name || 'Profile';
            }
        }
        
        if (guestButtons) guestButtons.style.display = 'none';
    }

    // ============================================================
    // PROFILE MODAL SYSTEM
    // ============================================================
    
    initProfileSystem() {
        const profileBtn = document.getElementById('profileBtn');
        const profileModal = document.getElementById('profileModal');
        const profileClose = document.getElementById('profileClose');
        const signOutBtn = document.getElementById('signOutBtn');
        const copyReferralBtn = document.getElementById('copyReferralBtn');
        
        if (profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showProfileModal();
            });
        }
        
        if (profileClose) {
            profileClose.addEventListener('click', () => {
                this.closeProfileModal();
            });
        }
        
        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) {
                    this.closeProfileModal();
                }
            });
        }
        
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => {
                this.handleSignOut();
            });
        }
        
        if (copyReferralBtn) {
            copyReferralBtn.addEventListener('click', () => {
                this.copyReferralLink();
            });
        }
    }

    async showProfileModal() {
        if (!this.currentUser || !this.userData) {
            this.showToast('Please sign in first', 'error');
            return;
        }
        
        const modal = document.getElementById('profileModal');
        if (!modal) return;
        
        // Refresh user data before showing
        await this.refreshUserData();
        
        // Update profile data in modal
        this.updateProfileData();
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async refreshUserData() {
        if (!this.currentUser) return;
        
        try {
            // Reload user data from database
            const { data: userData, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();
            
            if (!error && userData) {
                // Get waitlist position
                const { data: waitlistData } = await this.supabase
                    .from('waitlist')
                    .select('position')
                    .eq('user_id', this.currentUser.id)
                    .single();
                
                this.userData = {
                    ...userData,
                    position: waitlistData?.position || 0
                };
                
                console.log('✅ User data refreshed');
            }
        } catch (error) {
            console.error('Error refreshing user data:', error);
        }
    }

    updateProfileData() {
        if (!this.userData) return;
        
        // Update avatar initial
        const avatarInitial = document.getElementById('profileAvatarInitial');
        if (avatarInitial) {
            const initial = (this.userData.display_name || this.userData.email || 'U').charAt(0).toUpperCase();
            avatarInitial.textContent = initial;
        }
        
        // Update email
        const emailEl = document.getElementById('profileEmail');
        if (emailEl) {
            emailEl.textContent = this.userData.email;
        }
        
        // Update tier
        const tierEl = document.getElementById('profileTier');
        if (tierEl) {
            tierEl.textContent = this.getTierDisplay(this.userData.subscription_tier);
        }
        
        // Update position
        const positionEl = document.getElementById('profilePosition');
        if (positionEl) {
            positionEl.textContent = `#${this.userData.position || 'N/A'}`;
        }
        
        // Update referral code
        const referralCodeEl = document.getElementById('profileReferralCode');
        if (referralCodeEl) {
            referralCodeEl.textContent = this.userData.referral_code || 'LOADING...';
        }
        
        // Update referral count
        const referralCountEl = document.getElementById('profileReferralCount');
        if (referralCountEl) {
            referralCountEl.textContent = this.userData.referral_count || 0;
        }
        
        // Update referral link
        const referralLinkEl = document.getElementById('profileReferralLink');
        if (referralLinkEl && this.userData.referral_code) {
            const baseUrl = window.location.origin + window.location.pathname;
            const referralUrl = `${baseUrl}?ref=${this.userData.referral_code}`;
            referralLinkEl.value = referralUrl;
        }
    }

    getTierDisplay(tier) {
        const tiers = {
            'free': '🌟 Free',
            'early-bird': '🌟 Early Bird',
            'starter': '⭐ Starter',
            'founder': '👑 Founder',
            'pro': '💼 Pro',
            'vip': '💎 VIP Elite',
            'business': '🏢 Business',
            'enterprise': '🏆 Enterprise',
            'lifetime': '♾️ Lifetime'
        };
        return tiers[tier] || tier;
    }

    closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async handleSignOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) throw error;
            
            // Clear user data
            this.currentUser = null;
            this.userData = null;
            
            // Close profile modal
            this.closeProfileModal();
            
            // Show guest UI
            this.showGuestUI();
            
            // Show success message
            this.showToast('✓ Signed out successfully', 'success');
            
            console.log('✅ User signed out');
            
        } catch (error) {
            console.error('Sign out error:', error);
            this.showToast('⚠️ Error signing out', 'error');
        }
    }

    copyReferralLink() {
        const referralLinkEl = document.getElementById('profileReferralLink');
        
        if (!referralLinkEl) return;
        
        referralLinkEl.select();
        referralLinkEl.setSelectionRange(0, 99999); // For mobile
        
        navigator.clipboard.writeText(referralLinkEl.value).then(() => {
            this.showToast('✓ Referral link copied!', 'success');
            
            // Visual feedback on button
            const copyBtn = document.getElementById('copyReferralBtn');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error('Copy failed:', err);
            this.showToast('⚠️ Failed to copy', 'error');
        });
    }

    // ============================================================
    // REFERRAL CODE HANDLING
    // ============================================================
    
    checkReferralCode() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode) {
            // Store in session
            sessionStorage.setItem('referral_code', refCode);
            
            // Show toast
            this.showToast(`✓ Referral code ${refCode} applied!`, 'success');
            
            // Clean URL (optional)
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            console.log('✅ Referral code stored:', refCode);
        }
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    
    initNavigation() {
        const nav = document.getElementById('mainNav');
        const mobileToggle = document.getElementById('mobileMenuToggle');
        
        if (!nav) return;
        
        // Sticky nav on scroll
        let lastScrollTop = 0;
        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > 100) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            
            lastScrollTop = scrollTop;
        });
        
        // Mobile menu toggle
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                nav.classList.toggle('mobile-active');
            });
        }
    }

    // ============================================================
    // ANIMATIONS
    // ============================================================
    
    initAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        // Observe all animate-on-scroll elements
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }

    // ============================================================
    // UI COMPONENTS
    // ============================================================
    
    initUIComponents() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                e.preventDefault();
                const target = document.querySelector(href);
                
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ============================================================
    // STATISTICS
    // ============================================================
    
    async loadRealStats() {
        if (!this.supabase) return;
        
        try {
            // Get total waitlist count
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
            
            this.stats.total = totalCount || 0;
            this.stats.today = todayCount || 0;
            
            console.log('📊 Stats loaded:', this.stats);
            
        } catch (error) {
            console.error('Stats loading error:', error);
        }
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    
    setupEventListeners() {
        // Any additional global event listeners can go here
    }

    // ============================================================
    // TOAST NOTIFICATIONS
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.reditors = new REDitorsApp();
});

// Listen for auth state changes
if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && window.reditors) {
            // User signed in - reload profile
            window.reditors.checkAuthAndLoadProfile();
        } else if (event === 'SIGNED_OUT' && window.reditors) {
            // User signed out - show guest UI
            window.reditors.showGuestUI();
        }
    });
}