// ============================================================
// REDitors Waitlist System - ENHANCED WITH REFERRAL SYSTEM
// Now includes: Custom referral input + URL generation + Save notice
// ============================================================

class PreOrderManager {
    constructor() {
        this.supabase = null;
        this.launchDate = new Date('2026-03-01T15:00:00Z');
        this.countdownInterval = null;
        this.googleSheetsUrl = 'https://script.google.com/macros/s/AKfycbyvb4y9g3r3msXTnYP9trTnGtcIchdCPghyVI21aJmQbPlFoKO02uIdZ6LMOGZ5X-i0-Q/exec';
        this.isSubmitting = false;
        this.baseReferralUrl = window.location.origin + window.location.pathname; // Current page URL
        this.init();
    }

    async init() {
        console.log('🚀 Initializing REDitors Waitlist System v2.0');
        this.setupCountdown();
        await this.waitForSupabase();
        this.setupEventListeners();
        this.setupFAQ();
        await this.updateWaitlistStats();
        this.checkReferralCodeInURL(); // Check if user came via referral link
        console.log('✅ REDitors Waitlist Ready with Referral System');
    }

    // ============================================================
    // SUPABASE CONNECTION
    // ============================================================
    
    waitForSupabase() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            const check = setInterval(() => {
                attempts++;
                
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    clearInterval(check);
                    console.log('✅ Supabase Connected');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(check);
                    console.error('❌ Supabase connection timeout');
                    resolve();
                }
            }, 100);
        });
    }

    // ============================================================
    // REFERRAL CODE FROM URL
    // ============================================================
    
    checkReferralCodeInURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode) {
            console.log('🔗 Referral code detected in URL:', refCode);
            // Store in sessionStorage so it persists during session
            sessionStorage.setItem('referral_code', refCode);
            
            // Show a welcome message
            this.showToast(`🎁 You've been referred! Use code: ${refCode}`, 'success');
            
            // Pre-fill the referral input if modal is opened
            setTimeout(() => {
                const referralInput = document.getElementById('referredByCode');
                if (referralInput) {
                    referralInput.value = refCode;
                }
            }, 500);
        }
    }

    // ============================================================
    // COUNTDOWN TIMER
    // ============================================================
    
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

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    
    setupEventListeners() {
        const joinButtons = document.querySelectorAll(
            '#joinWaitlistBtn, #joinWaitlistBtnNav, #finalCtaBtn, .tier-btn'
        );
        
        joinButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
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
                if (window.reditors) {
                    window.reditors.checkWaitlistStatus();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal('waitlistModal');
                this.closeModal('successModal');
            }
        });
    }

    setupWaitlistForm() {
        const joinBtn = document.getElementById('joinWaitlistSubmitBtn');
        const emailInput = document.getElementById('waitlistEmail');
        const nameInput = document.getElementById('waitlistName');
        const referralInput = document.getElementById('referredByCode');
        
        if (joinBtn) {
            joinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleJoinWaitlist();
            });
        }
        
        // Enter key to submit
        [emailInput, nameInput, referralInput].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.handleJoinWaitlist();
                    }
                });
            }
        });

        // Pre-fill referral code from URL if available
        if (referralInput) {
            const storedRefCode = sessionStorage.getItem('referral_code');
            if (storedRefCode) {
                referralInput.value = storedRefCode;
            }
        }
    }

    // ============================================================
    // JOIN WAITLIST - WITH REFERRAL SYSTEM
    // ============================================================
    
    async handleJoinWaitlist() {
        if (this.isSubmitting) {
            console.log('⚠️ Already submitting...');
            return;
        }

        const emailInput = document.getElementById('waitlistEmail');
        const nameInput = document.getElementById('waitlistName');
        const referredByInput = document.getElementById('referredByCode');
        const joinBtn = document.getElementById('joinWaitlistSubmitBtn');
        
        if (!emailInput || !joinBtn) {
            console.error('❌ Form elements not found');
            return;
        }

        const email = emailInput.value.trim().toLowerCase();
        const name = nameInput ? nameInput.value.trim() : '';
        const referredByCode = referredByInput ? referredByInput.value.trim().toUpperCase() : '';
        
        // Validate email
        if (!this.validateEmail(email)) {
            return;
        }
        
        // Validate referral code if provided
        if (referredByCode && !await this.validateReferralCode(referredByCode)) {
            this.showToast('⚠️ Invalid referral code. You can still join without one!', 'error');
            return;
        }
        
        // Set submitting state
        this.isSubmitting = true;
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<span>⏳ Joining...</span>';
        
        try {
            if (!this.supabase) {
                throw new Error('Database not connected. Please refresh the page.');
            }

            console.log('📝 Processing signup for:', email);

            // ============================================================
            // STEP 1: Check if email already exists
            // ============================================================
            
            const { data: existingUser, error: checkError } = await this.supabase
                .from('waitlist')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
                throw new Error('Database error: ' + checkError.message);
            }
            
            // ============================================================
            // STEP 2: Handle existing user
            // ============================================================
            
            if (existingUser) {
                console.log('✅ User already exists');
                localStorage.setItem('waitlist_email', email);
                
                this.showToast('✓ You\'re already on the waitlist!', 'success');
                this.closeModal('waitlistModal');
                this.showSuccessModalWithReferral(existingUser);
                
                if (window.reditors) {
                    await window.reditors.checkWaitlistStatus();
                }
                
                this.resetForm();
                return;
            }
            
            // ============================================================
            // STEP 3: Create new waitlist entry with referral
            // ============================================================
            
            console.log('📝 Creating new waitlist entry...');
            
            // Generate unique referral code for this user
            const userReferralCode = await this.generateUniqueReferralCode(name || email);
            
            // Get user's IP address
            const ipAddress = await this.getUserIP();
            
            // Build insert object
            const insertData = {
                email: email,
                name: name || null,
                tier: 'early-bird',
                referral_code: userReferralCode,
                referred_by: referredByCode || null, // Who referred this user
                referral_count: 0,
                email_verified: false,
                invite_sent: false,
                converted_to_user: false,
                source: 'website',
                campaign: 'preorder',
                ip_address: ipAddress,
                user_agent: navigator.userAgent,
                browser: this.detectBrowser(),
                device: this.detectDevice(),
                os: this.detectOS()
            };
            
            console.log('💾 Inserting data with referral code:', userReferralCode);
            
            // ============================================================
            // STEP 4: Insert into Supabase
            // ============================================================
            
            const { data: newUser, error: insertError } = await this.supabase
                .from('waitlist')
                .insert([insertData])
                .select()
                .single();
            
            if (insertError) {
                console.error('❌ Insert error:', insertError);
                throw new Error('Failed to join waitlist: ' + insertError.message);
            }
            
            if (!newUser) {
                throw new Error('No data returned after insert');
            }
            
            console.log('✅ Successfully added to waitlist!');
            console.log('📊 Position:', newUser.waitlist_position);
            console.log('🔗 Referral code:', newUser.referral_code);
            
            // ============================================================
            // STEP 5: Save to localStorage
            // ============================================================
            
            localStorage.setItem('waitlist_email', email);
            
            // ============================================================
            // STEP 6: Google Sheets backup
            // ============================================================
            
            this.sendToGoogleSheets(
                newUser.email,
                newUser.name,
                newUser.waitlist_position,
                newUser.referral_code
            ).catch(err => console.warn('Google Sheets sync failed:', err));
            
            // ============================================================
            // STEP 7: Show success with referral URL
            // ============================================================
            
            this.showToast('🎉 Welcome to the waitlist!', 'success');
            this.closeModal('waitlistModal');
            this.showSuccessModalWithReferral(newUser);
            
            await this.updateWaitlistStats();
            
            if (window.reditors) {
                await window.reditors.checkWaitlistStatus();
            }
            
            this.resetForm();
            
            console.log('✅ Signup completed successfully');
            
        } catch (error) {
            console.error('❌ Join waitlist error:', error);
            this.showToast(error.message || 'Something went wrong. Please try again.', 'error');
        } finally {
            this.isSubmitting = false;
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.innerHTML = '<span>Join Waitlist</span>';
            }
        }
    }

    // ============================================================
    // REFERRAL CODE VALIDATION
    // ============================================================
    
    async validateReferralCode(code) {
        if (!code || !this.supabase) return false;
        
        try {
            const { data, error } = await this.supabase
                .from('waitlist')
                .select('referral_code')
                .eq('referral_code', code)
                .maybeSingle();
            
            if (error) {
                console.error('Referral validation error:', error);
                return false;
            }
            
            return !!data;
        } catch (error) {
            console.error('Error validating referral code:', error);
            return false;
        }
    }

    // ============================================================
    // GENERATE UNIQUE REFERRAL CODE
    // ============================================================
    
    async generateUniqueReferralCode(nameOrEmail) {
        let code = '';
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!isUnique && attempts < maxAttempts) {
            // Generate code based on name/email + random chars
            const prefix = nameOrEmail.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
            const random = Math.random().toString(36).substring(2, 6).toUpperCase();
            code = (prefix + random).substring(0, 8).padEnd(8, '0');
            
            // Check if code already exists
            if (this.supabase) {
                const { data } = await this.supabase
                    .from('waitlist')
                    .select('referral_code')
                    .eq('referral_code', code)
                    .maybeSingle();
                
                isUnique = !data;
            } else {
                isUnique = true; // Fallback if no DB connection
            }
            
            attempts++;
        }
        
        if (!isUnique) {
            // Fallback to completely random code
            code = Math.random().toString(36).substring(2, 10).toUpperCase();
        }
        
        console.log('🔑 Generated referral code:', code);
        return code;
    }

    // ============================================================
    // VALIDATION
    // ============================================================
    
    validateEmail(email) {
        if (!email) {
            this.showToast('Please enter your email', 'error');
            const emailInput = document.getElementById('waitlistEmail');
            if (emailInput) emailInput.focus();
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showToast('Please enter a valid email address', 'error');
            const emailInput = document.getElementById('waitlistEmail');
            if (emailInput) emailInput.focus();
            return false;
        }
        
        return true;
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Edg')) return 'Edge';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Opera')) return 'Opera';
        return 'Unknown';
    }

    detectDevice() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'Tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return 'Mobile';
        }
        return 'Desktop';
    }

    detectOS() {
        const ua = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        
        if (platform.includes('mac')) return 'macOS';
        if (platform.includes('win')) return 'Windows';
        if (platform.includes('linux')) return 'Linux';
        if (ua.includes('android')) return 'Android';
        if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
        
        return 'Unknown';
    }

    resetForm() {
        const emailInput = document.getElementById('waitlistEmail');
        const nameInput = document.getElementById('waitlistName');
        const referralInput = document.getElementById('referredByCode');
        
        if (emailInput) emailInput.value = '';
        if (nameInput) nameInput.value = '';
        if (referralInput) referralInput.value = '';
    }

    // ============================================================
    // GOOGLE SHEETS BACKUP
    // ============================================================
    
    async sendToGoogleSheets(email, name, position, referralCode) {
        try {
            await fetch(this.googleSheetsUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    name: name || 'Not provided',
                    position: position || 'N/A',
                    tier: 'EARLY-BIRD',
                    referral_code: referralCode,
                    timestamp: new Date().toISOString(),
                    source: 'website',
                    campaign: 'launch-waitlist'
                })
            });
            
            console.log('✅ Sent to Google Sheets');
        } catch (error) {
            console.warn('⚠️ Google Sheets sync failed:', error);
        }
    }

    // ============================================================
    // MODALS
    // ============================================================
    
    openWaitlistModal() {
        const modal = document.getElementById('waitlistModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Pre-fill referral code if from URL
            const refCode = sessionStorage.getItem('referral_code');
            const referralInput = document.getElementById('referredByCode');
            if (refCode && referralInput) {
                referralInput.value = refCode;
            }
            
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

    // ============================================================
    // SUCCESS MODAL WITH REFERRAL URL
    // ============================================================
    
    showSuccessModalWithReferral(userData) {
        const modal = document.getElementById('successModal');
        const messageEl = document.getElementById('successMessage');
        const detailsEl = document.getElementById('successDetails');
        
        // Generate referral URL
        const referralUrl = `${this.baseReferralUrl}?ref=${userData.referral_code}`;
        
        if (messageEl) {
            messageEl.innerHTML = `
                <strong>🎉 Welcome to the waitlist!</strong><br>
                You're all set for early access.
            `;
        }
        
        if (detailsEl) {
            const displayName = userData.name ? 
                `<p style="margin: 0 0 12px 0;"><strong>👋 Name:</strong> ${userData.name}</p>` : '';
            
            detailsEl.innerHTML = `
                <div style="text-align: left; margin-top: 20px; padding: 20px; background: rgba(68, 255, 68, 0.1); border-radius: 12px; border: 1px solid rgba(68, 255, 68, 0.3);">
                    <p style="margin: 0 0 12px 0;"><strong>📧 Email:</strong> ${userData.email}</p>
                    ${displayName}
                    <p style="margin: 0 0 12px 0;"><strong>📊 Position:</strong> #${userData.waitlist_position}</p>
                    <p style="margin: 0;"><strong>🎁 Referrals:</strong> ${userData.referral_count || 0}</p>
                </div>
                
                <!-- REFERRAL URL SECTION -->
                <div style="margin-top: 24px; padding: 20px; background: rgba(255, 215, 0, 0.1); border-radius: 12px; border: 2px solid rgba(255, 215, 0, 0.4);">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #ffd700;">
                        🚀 Your Unique Referral Link
                    </h3>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #ccc;">
                        Share this link to move up in the waitlist!
                    </p>
                    
                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                        <input 
                            type="text" 
                            id="referralUrlInput" 
                            value="${referralUrl}" 
                            readonly 
                            style="flex: 1; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,215,0,0.3); border-radius: 6px; color: #fff; font-size: 13px; font-family: monospace;"
                        >
                        <button 
                            id="copyReferralBtn" 
                            style="padding: 12px 20px; background: #ffd700; color: #000; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; white-space: nowrap;"
                        >
                            📋 Copy
                        </button>
                    </div>
                    
                    <div style="padding: 12px; background: rgba(255, 0, 0, 0.1); border-radius: 6px; border: 1px solid rgba(255, 0, 0, 0.3);">
                        <p style="margin: 0; font-size: 12px; color: #ff6b6b; font-weight: 600;">
                            ⚠️ IMPORTANT: Save this URL! You can share it to earn rewards and move up the waitlist.
                        </p>
                    </div>
                    
                    <p style="margin: 12px 0 0 0; font-size: 12px; color: #999;">
                        Your referral code: <strong style="color: #ffd700; font-family: monospace;">${userData.referral_code}</strong>
                    </p>
                </div>
                
                <p style="margin-top: 16px; font-size: 14px; color: #999;">
                    We'll notify you when REDitors launches!
                </p>
            `;
            
            // Add copy functionality
            setTimeout(() => {
                const copyBtn = document.getElementById('copyReferralBtn');
                const urlInput = document.getElementById('referralUrlInput');
                
                if (copyBtn && urlInput) {
                    copyBtn.addEventListener('click', () => {
                        urlInput.select();
                        document.execCommand('copy');
                        
                        copyBtn.textContent = '✓ Copied!';
                        copyBtn.style.background = '#22c55e';
                        copyBtn.style.color = '#fff';
                        
                        setTimeout(() => {
                            copyBtn.textContent = '📋 Copy';
                            copyBtn.style.background = '#ffd700';
                            copyBtn.style.color = '#000';
                        }, 2000);
                    });
                }
            }, 100);
        }
        
        if (modal) {
            modal.classList.add('active');
        }
    }

    // ============================================================
    // STATISTICS
    // ============================================================
    
    async updateWaitlistStats() {
        if (!this.supabase) {
            console.warn('⚠️ No database connection for stats');
            return;
        }
        
        try {
            const { count: totalCount, error: countError } = await this.supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true });
            
            if (countError) throw countError;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count: todayCount, error: todayError } = await this.supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());
            
            if (todayError) throw todayError;
            
            const waitlistCountEl = document.getElementById('waitlistCount');
            const todaySignupsEl = document.getElementById('todaySignups');
            
            if (waitlistCountEl) {
                this.animateNumber(waitlistCountEl, totalCount || 0);
            }
            
            if (todaySignupsEl) {
                this.animateNumber(todaySignupsEl, todayCount || 0);
            }
            
            this.updateProgressBar(totalCount || 0);
            
            console.log('📊 Stats updated:', { total: totalCount, today: todayCount });
            
        } catch (error) {
            console.error('❌ Stats update error:', error);
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

    // ============================================================
    // FAQ
    // ============================================================
    
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

// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    window.preOrderManager = new PreOrderManager();
    console.log('✅ PreOrder Manager with Referral System Ready');
});