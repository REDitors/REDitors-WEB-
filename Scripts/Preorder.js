// ====================================
// REDitors ULTRA-SIMPLE Waitlist
// Only email + name → database
// No position tracking, no extra fields
// ====================================

class PreOrderManager {
    constructor() {
        this.supabase = null;
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
        console.log('✅ REDitors Waitlist Ready');
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
                console.error('❌ Supabase connection timeout');
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
        const joinButtons = document.querySelectorAll(
            '#joinWaitlistBtn, #joinWaitlistBtnNav, #finalCtaBtn, .tier-btn'
        );
        
        joinButtons.forEach(btn => {
            btn.addEventListener('click', () => {
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
        this.setupWaitlistForm();
    }

    setupModalControls() {
        const modalClose = document.getElementById('modalClose');
        const modalOverlay = document.getElementById('modalOverlay');
        const successCloseBtn = document.getElementById('successCloseBtn');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal('waitlistModal'));
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal('waitlistModal'));
        }
        
        if (successCloseBtn) {
            successCloseBtn.addEventListener('click', () => {
                this.closeModal('successModal');
            });
        }
    }

    setupWaitlistForm() {
        const joinBtn = document.getElementById('joinWaitlistSubmitBtn');
        const emailInput = document.getElementById('waitlistEmail');
        const nameInput = document.getElementById('waitlistName');
        
        if (joinBtn) {
            joinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleJoinWaitlist();
            });
        }
        
        [emailInput, nameInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleJoinWaitlist();
                    }
                });
            }
        });
    }

    // ===== ULTRA-SIMPLE JOIN - ONLY EMAIL + NAME =====
    async handleJoinWaitlist() {
        const email = document.getElementById('waitlistEmail')?.value.trim().toLowerCase();
        const name = document.getElementById('waitlistName')?.value.trim();
        
        if (!this.validateEmail(email)) return;
        
        const joinBtn = document.getElementById('joinWaitlistSubmitBtn');
        if (!joinBtn) return;
        
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<span>⏳ Joining...</span>';
        
        try {
            if (!this.supabase) {
                throw new Error('Database connection not available. Please refresh the page.');
            }

            console.log('📝 Adding to waitlist:', email);

            // Check if email already exists (only check email field)
            const { data: existingUser } = await this.supabase
                .from('waitlist')
                .select('email, name')
                .eq('email', email)
                .maybeSingle();
            
            if (existingUser) {
                console.log('✅ Email already registered');
                this.showToast('✓ You\'re already on the waitlist!', 'success');
                this.closeModal('waitlistModal');
                this.showSuccessModal(email, name || existingUser.name);
                return;
            }
            
            // Generate referral code
            const referralCode = this.generateReferralCode();
            
            // MINIMAL INSERT - Only the fields we absolutely need
            const insertData = {
                email: email,
                name: name || null,
                referral_code: referralCode
            };
            
            console.log('💾 Inserting:', insertData);
            
            // Insert and don't try to read back any columns we're not sure exist
            const { error: insertError } = await this.supabase
                .from('waitlist')
                .insert([insertData]);
            
            if (insertError) {
                console.error('Insert error:', insertError);
                throw insertError;
            }
            
            console.log('✅ Added to waitlist!');
            
            // Show success
            this.showToast('✓ Successfully joined the waitlist!', 'success');
            this.closeModal('waitlistModal');
            this.showSuccessModal(email, name);
            
            // Update stats
            await this.updateWaitlistStats();
            
        } catch (error) {
            console.error('❌ Error:', error);
            
            let errorMessage = 'Failed to join waitlist. Please try again.';
            
            if (error.message.includes('duplicate') || error.code === '23505') {
                errorMessage = 'This email is already registered!';
            } else if (error.message.includes('connection')) {
                errorMessage = 'Connection error. Please check your internet.';
            }
            
            this.showToast(errorMessage, 'error');
            
        } finally {
            joinBtn.disabled = false;
            joinBtn.innerHTML = '<span>Join Waitlist</span>';
        }
    }

    generateReferralCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    validateEmail(email) {
        if (!email) {
            this.showToast('Please enter your email', 'error');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showToast('Please enter a valid email', 'error');
            return false;
        }
        
        return true;
    }

    // ===== MODALS =====
    openWaitlistModal() {
        const modal = document.getElementById('waitlistModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                const emailInput = document.getElementById('waitlistEmail');
                if (emailInput) emailInput.focus();
            }, 100);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showSuccessModal(email, name) {
        const modal = document.getElementById('successModal');
        const messageEl = document.getElementById('successMessage');
        const detailsEl = document.getElementById('successDetails');
        
        if (modal && messageEl) {
            messageEl.innerHTML = `
                <strong>Welcome to the waitlist!</strong><br>
                You're all set for early access.
            `;
        }
        
        if (detailsEl) {
            const displayName = name ? `<p style="margin: 0 0 12px 0;"><strong>👋 Name:</strong> ${name}</p>` : '';
            
            detailsEl.innerHTML = `
                <div style="text-align: left; margin-top: 20px; padding: 20px; background: rgba(68, 255, 68, 0.1); border-radius: 12px; border: 1px solid rgba(68, 255, 68, 0.3);">
                    <p style="margin: 0 0 12px 0;"><strong>📧 Email:</strong> ${email}</p>
                    ${displayName}
                    <p style="margin: 12px 0 0 0; font-size: 14px; color: #999;">
                        We'll notify you when REDitors launches!
                    </p>
                </div>
            `;
        }
        
        if (modal) {
            modal.classList.add('active');
        }
    }

    // ===== STATS =====
    async updateWaitlistStats() {
        if (!this.supabase) {
            console.warn('No database connection for stats');
            return;
        }
        
        try {
            // Get total count
            const { count: totalCount, error: countError } = await this.supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true });
            
            if (countError) throw countError;
            
            // Get today's signups
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count: todayCount, error: todayError } = await this.supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());
            
            if (todayError) throw todayError;
            
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
            
            console.log('📊 Stats updated:', { total: totalCount, today: todayCount });
            
        } catch (error) {
            console.error('Stats update error:', error);
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

    // ===== TOAST =====
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.preOrderManager = new PreOrderManager();
});
