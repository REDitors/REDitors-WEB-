// ====================================
// Profile Manager
// Handles user profile and statistics
// ====================================

class ProfileManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.userProfile = null;
        this.transcriptions = [];
        this.usageChart = null;
        this.init();
    }

    async init() {
        await this.waitForSupabase();
        await this.checkSession();
        await this.loadProfile();
        await this.loadTranscriptions();
        this.setupForm();
        this.renderUsageChart();
    }

    waitForSupabase() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    clearInterval(check);
                    console.log('✓ Profile Manager: Supabase connected');
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
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Session check error:', error);
            this.redirectToLogin();
        }
    }

    async loadProfile() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    await this.createProfile();
                } else {
                    throw error;
                }
            } else {
                this.userProfile = data;
                this.displayProfile();
            }
        } catch (error) {
            console.error('Profile load error:', error);
        }
    }

    async createProfile() {
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
            this.displayProfile();
        } catch (error) {
            console.error('Failed to create profile:', error);
        }
    }

    displayProfile() {
        const displayName = this.userProfile?.display_name || 
                           this.currentUser.user_metadata?.display_name || 
                           this.currentUser.email.split('@')[0];
        
        // Profile header
        document.getElementById('profileAvatar').textContent = displayName.charAt(0).toUpperCase();
        document.getElementById('profileName').textContent = displayName;
        document.getElementById('profileEmail').textContent = this.currentUser.email;

        // Stats
        document.getElementById('creditsBalance').textContent = this.userProfile?.credits || 0;
        document.getElementById('totalTranscriptions').textContent = this.userProfile?.total_transcriptions || 0;
        document.getElementById('totalMinutes').textContent = (this.userProfile?.total_minutes_transcribed || 0).toFixed(1);

        // Form
        document.getElementById('displayName').value = displayName;
        document.getElementById('email').value = this.currentUser.email;
        document.getElementById('apiKey').value = this.userProfile?.openai_api_key || '';
    }

    async loadTranscriptions() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('transcriptions')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            this.transcriptions = data || [];
            this.renderTranscriptions();
        } catch (error) {
            console.error('Failed to load transcriptions:', error);
        }
    }

    renderTranscriptions() {
        const container = document.getElementById('transcriptionList');
        if (!container) return;

        if (this.transcriptions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="file-text"></i>
                    <p>No transcriptions yet. Start using the plugin!</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        container.innerHTML = this.transcriptions.map(t => {
            const date = new Date(t.created_at).toLocaleDateString();
            const duration = (t.duration_seconds || 0).toFixed(1);
            return `
                <div class="transcription-item">
                    <div class="transcription-info">
                        <h4>${t.clip_name || 'Untitled'}</h4>
                        <div class="transcription-meta">
                            ${date} • ${duration}s • ${t.word_count || 0} words
                        </div>
                    </div>
                    <div class="transcription-credits">
                        -${t.credits_used || 0} credits
                    </div>
                </div>
            `;
        }).join('');
    }

    renderUsageChart() {
        const ctx = document.getElementById('usageChart');
        if (!ctx) return;

        // Prepare data for last 7 days
        const labels = [];
        const data = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            
            // Count transcriptions for this day
            const dayTranscriptions = this.transcriptions.filter(t => {
                const tDate = new Date(t.created_at);
                return tDate.toDateString() === date.toDateString();
            });
            
            data.push(dayTranscriptions.length);
        }

        this.usageChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Transcriptions',
                    data: data,
                    borderColor: '#ff0000',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#888'
                        },
                        grid: {
                            color: '#333'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#888'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    setupForm() {
        const form = document.getElementById('profileForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProfile();
        });
    }

    async saveProfile() {
        const displayName = document.getElementById('displayName').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();

        if (!displayName) {
            this.showNotification('Please enter a display name', 'error');
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('users')
                .update({
                    display_name: displayName,
                    openai_api_key: apiKey || null
                })
                .eq('id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;

            this.userProfile = data;
            this.displayProfile();
            this.showNotification('Profile updated successfully!', 'success');
        } catch (error) {
            console.error('Save error:', error);
            this.showNotification('Failed to save profile: ' + error.message, 'error');
        }
    }

    redirectToLogin() {
        window.location.href = 'Auth.html?redirect=Profile.html';
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#00d084' : '#ff4444'};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Add animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ProfileManager();
});