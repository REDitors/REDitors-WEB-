// ====================================
// Credits Purchase Manager
// Handles credit packages and Stripe payments
// ====================================

class CreditsManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.userProfile = null;
        this.packages = [];
        this.init();
    }

    async init() {
        await this.waitForSupabase();
        await this.checkSession();
        await this.loadPackages();
        this.renderPackages();
    }

    waitForSupabase() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    clearInterval(check);
                    console.log('✓ Credits Manager: Supabase connected');
                    resolve();
                }
            }, 100);
            setTimeout(() => { clearInterval(check); resolve(); }, 10000);
        });
    }

    async checkSession() {
        if (!this.supabase) {
            this.redirectToLogin();
            return;
        }

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) throw error;
            
            if (session && session.user) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                this.displayUserInfo();
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Session check error:', error);
            this.redirectToLogin();
        }
    }

    async loadUserProfile() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // User profile doesn't exist, create it
                    await this.createUserProfile();
                } else {
                    throw error;
                }
            } else {
                this.userProfile = data;
            }
        } catch (error) {
            console.error('Profile load error:', error);
        }
    }

    async createUserProfile() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .insert([
                    {
                        id: this.currentUser.id,
                        email: this.currentUser.email,
                        display_name: this.currentUser.user_metadata?.display_name || this.currentUser.email.split('@')[0],
                        credits: 10,
                        created_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            this.userProfile = data;
            console.log('✓ Profile created with 10 welcome credits');
        } catch (error) {
            console.error('Failed to create profile:', error);
        }
    }

    displayUserInfo() {
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');
        const currentCredits = document.getElementById('currentCredits');

        if (userInfo) userInfo.style.display = 'flex';
        
        const displayName = this.userProfile?.display_name || 
                           this.currentUser.user_metadata?.display_name || 
                           this.currentUser.email.split('@')[0];
        
        if (userName) userName.textContent = displayName;
        if (userEmail) userEmail.textContent = this.currentUser.email;
        if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();
        if (currentCredits) currentCredits.textContent = this.userProfile?.credits || 0;
    }

    async loadPackages() {
        try {
            const { data, error } = await this.supabase
                .from('credit_packages')
                .select('*')
                .eq('active', true)
                .order('credits', { ascending: true });

            if (error) throw error;
            
// Example: /api/create-checkout-session
   app.post('/create-checkout-session', async (req, res) => {
       const session = await stripe.checkout.sessions.create({
           payment_method_types: ['card'],
           line_items: [{
               price_data: {
                   currency: 'usd',
                   product_data: {
                       name: req.body.packageName,
                   },
                   unit_amount: req.body.price * 100,
               },
               quantity: 1,
           }],
           mode: 'payment',
           success_url: 'https://reditors.com/Credits.html?success=true',
           cancel_url: 'https://reditors.com/Credits.html?canceled=true',
       });
       res.json({ url: session.url });
   });

            this.packages = data || [];
        } catch (error) {
            console.error('Failed to load packages:', error);
            // Fallback to default packages
            this.packages = [
                {
                    id: '1',
                    name: 'Starter',
                    credits: 50,
                    price_usd: 10.00,
                    price_per_credit: 0.20,
                    popular: false,
                    description: 'Perfect for getting started'
                },
                {
                    id: '2',
                    name: 'Pro',
                    credits: 200,
                    price_usd: 35.00,
                    price_per_credit: 0.175,
                    popular: true,
                    description: 'Most popular for regular users'
                },
                {
                    id: '3',
                    name: 'Business',
                    credits: 500,
                    price_usd: 80.00,
                    price_per_credit: 0.16,
                    popular: false,
                    description: 'Best value for professionals'
                },
                {
                    id: '4',
                    name: 'Enterprise',
                    credits: 1000,
                    price_usd: 150.00,
                    price_per_credit: 0.15,
                    popular: false,
                    description: 'For teams and studios'
                }
            ];
        }
    }

    renderPackages() {
        const grid = document.getElementById('packagesGrid');
        if (!grid) return;

        grid.innerHTML = this.packages.map(pkg => `
            <div class="package-card ${pkg.popular ? 'popular' : ''}" onclick="creditsManager.purchasePackage('${pkg.id}', '${pkg.name}', ${pkg.credits}, ${pkg.price_usd})">
                ${pkg.popular ? '<div class="popular-badge">Most Popular</div>' : ''}
                <div class="package-name">${pkg.name}</div>
                <div class="package-credits">${pkg.credits} <span>credits</span></div>
                <div class="package-price">$${pkg.price_usd.toFixed(2)}</div>
                <div class="package-price-per">$${pkg.price_per_credit.toFixed(3)} per credit</div>
                <ul class="package-features">
                    <li><i data-lucide="check"></i> ${pkg.credits} minutes of transcription</li>
                    <li><i data-lucide="check"></i> Never expires</li>
                    <li><i data-lucide="check"></i> Instant delivery</li>
                    <li><i data-lucide="check"></i> Priority support</li>
                    ${pkg.popular ? '<li><i data-lucide="star"></i> Best value</li>' : ''}
                </ul>
                <button class="buy-btn">Purchase Now</button>
            </div>
        `).join('');

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async purchasePackage(packageId, packageName, credits, price) {
        if (!this.currentUser) {
            this.showNotification('Please login first', 'error');
            return;
        }

        // Show loading
        this.showLoading(true);

        try {
            // Here you would integrate with Stripe
            // For now, we'll simulate a purchase for testing
            
            // OPTION 1: Direct credit addition (for testing)
            // await this.addCreditsDirectly(credits, packageName, price);
            
            // OPTION 2: Stripe Checkout (production)
            await this.initiateStripeCheckout(packageId, packageName, credits, price);
            
        } catch (error) {
            console.error('Purchase error:', error);
            this.showNotification('Purchase failed: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async initiateStripeCheckout(packageId, packageName, credits, price) {
        // This is where you'd integrate Stripe
        // You need to:
        // 1. Create a Stripe Checkout session on your backend
        // 2. Redirect user to Stripe
        // 3. Handle webhook for successful payment
        
        this.showNotification('Stripe integration pending - contact support@reditors.com for manual purchase', 'error');
        
        // Example of what the implementation would look like:
        /*
        const response = await fetch('YOUR_BACKEND_URL/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                packageId: packageId,
                userId: this.currentUser.id,
                email: this.currentUser.email,
                credits: credits,
                price: price
            })
        });
        
        const session = await response.json();
        
        // Redirect to Stripe Checkout
        window.location.href = session.url;
        */
    }

    async addCreditsDirectly(credits, description, price) {
        // This method is for TESTING ONLY
        // In production, credits should only be added via Stripe webhook
        
        try {
            const newCredits = (this.userProfile?.credits || 0) + credits;
            
            // Update user credits
            const { data, error } = await this.supabase
                .from('users')
                .update({ credits: newCredits })
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            // Log transaction
            await this.supabase
                .from('transactions')
                .insert([
                    {
                        user_id: this.currentUser.id,
                        amount: credits,
                        type: 'purchase',
                        description: `Purchased ${description} package`,
                        metadata: { price: price },
                        created_at: new Date().toISOString()
                    }
                ]);

            this.userProfile = data;
            this.displayUserInfo();
            
            this.showNotification(`Successfully added ${credits} credits!`, 'success');
            
        } catch (error) {
            throw new Error('Failed to add credits: ' + error.message);
        }
    }

    redirectToLogin() {
        window.location.href = 'Auth.html?redirect=Credits.html';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Initialize
let creditsManager;
document.addEventListener('DOMContentLoaded', () => {
    creditsManager = new CreditsManager();
});