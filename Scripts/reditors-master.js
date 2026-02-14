// ============================================================
// REDitors Master Script - PRODUCTION READY
// Simple waitlist check from database - No auth complexity
// ============================================================

class REDitorsApp {
    constructor() {
        this.supabase = null;
        this.userEmail = null;
        this.waitlistData = null;
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
        
        // Check if user is in waitlist
        await this.checkWaitlistStatus();
        
        // Initialize all modules
        this.initNavigation();
        this.initAnimations();
        this.initUIComponents();
        this.initProfileSystem();
        
        // Load real statistics
        await this.loadRealStats();
        
        console.log('✅ REDitors App Ready');
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
    // WAITLIST STATUS CHECK
    // ============================================================
    
    async checkWaitlistStatus() {
        const savedEmail = localStorage.getItem('waitlist_email');
        
        if (!savedEmail || !this.supabase) {
            this.showGuestUI();
            return;
        }
        
        try {
            // Check if email exists in waitlist
            const { data, error } = await this.supabase
                .from('waitlist')
                .select('*')
                .eq('email', savedEmail.toLowerCase())
                .maybeSingle();
            
            if (error) {
                console.error('Waitlist check error:', error);
                this.showGuestUI();
                return;
            }
            
            if (!data) {
                // Email not found, clear localStorage
                localStorage.removeItem('waitlist_email');
                this.showGuestUI();
                return;
            }
            
            // User found in waitlist!
            this.userEmail = data.email;
            this.waitlistData = data;
            this.showUserUI();
            
            console.log('✅ User on waitlist:', this.userEmail, 'Position:', data.position);
            
        } catch (error) {
            console.error('Error checking waitlist:', error);
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
            const initial = this.userEmail.charAt(0).toUpperCase();
            const avatar = profileBtn.querySelector('.profile-avatar');
            if (avatar) {
                avatar.textContent = initial;
                avatar.title = this.userEmail;
            }
            
            // Update text if exists
            const profileText = profileBtn.querySelector('.profile-text');
            if (profileText) {
                profileText.textContent = this.waitlistData?.name || 'Profile';
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
        const leaveWaitlistBtn = document.getElementById('signOutBtn');
        
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
        
        if (leaveWaitlistBtn) {
            leaveWaitlistBtn.addEventListener('click', () => {
                this.handleLeaveWaitlist();
            });
        }
    }

    async showProfileModal() {
        if (!this.userEmail || !this.waitlistData) {
            this.showToast('Please join the waitlist first', 'error');
            return;
        }
        
        const modal = document.getElementById('profileModal');
        if (!modal) return;
        
        // Refresh data before showing
        await this.refreshWaitlistData();
        
        // Update profile data in modal
        this.updateProfileData();
        
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    async refreshWaitlistData() {
        if (!this.userEmail || !this.supabase) return;
        
        try {
            const { data, error } = await this.supabase
                .from('waitlist')
                .select('*')
                .eq('email', this.userEmail)
                .maybeSingle();
            
            if (!error && data) {
                this.waitlistData = data;
                console.log('✅ Profile data refreshed');
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    updateProfileData() {
        if (!this.waitlistData) return;
        
        // Update avatar initial
        const avatarInitial = document.getElementById('profileAvatarInitial');
        if (avatarInitial) {
            const initial = (this.waitlistData.name || this.userEmail || 'U').charAt(0).toUpperCase();
            avatarInitial.textContent = initial;
        }
        
        // Update email
        const emailEl = document.getElementById('profileEmail');
        if (emailEl) {
            emailEl.textContent = this.userEmail;
        }
        
        // Update name (if provided)
        const nameEl = document.getElementById('profileName');
        const nameField = document.getElementById('profileNameField');
        if (nameEl && nameField) {
            if (this.waitlistData.name) {
                nameEl.textContent = this.waitlistData.name;
                nameField.style.display = 'block';
            } else {
                nameField.style.display = 'none';
            }
        }
        
        // Update position
        const positionEl = document.getElementById('profilePosition');
        if (positionEl) {
            positionEl.textContent = `#${this.waitlistData.position || 'N/A'}`;
        }
        
        // Update joined date
        const joinedEl = document.getElementById('profileJoined');
        if (joinedEl && this.waitlistData.created_at) {
            const date = new Date(this.waitlistData.created_at);
            joinedEl.textContent = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Update tier if element exists
        const tierEl = document.getElementById('profileTier');
        if (tierEl && this.waitlistData.tier) {
            const tierDisplay = {
                'early-bird': '🌟 Early Bird',
                'founder': '👑 Founder',
                'vip': '💎 VIP',
                'beta-tester': '🧪 Beta Tester'
            };
            tierEl.textContent = tierDisplay[this.waitlistData.tier] || this.waitlistData.tier;
        }
    }

    closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    handleLeaveWaitlist() {
        if (confirm('Are you sure you want to leave the waitlist? You can always rejoin later.')) {
            // Clear localStorage
            localStorage.removeItem('waitlist_email');
            
            // Clear data
            this.userEmail = null;
            this.waitlistData = null;
            
            // Close modal
            this.closeProfileModal();
            
            // Show guest UI
            this.showGuestUI();
            
            // Show message
            this.showToast('✓ You\'ve left the waitlist. You can rejoin anytime!', 'success');
            
            console.log('✅ User left waitlist');
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
