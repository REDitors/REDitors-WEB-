// ============================================================
// REDitors Master Script - SIMPLE VERSION
// No authentication, no profile system
// Just navigation and animations
// ============================================================

class REDitorsApp {
    constructor() {
        this.init();
    }

    async init() {
        console.log('🚀 Initializing REDitors App');
        
        // Initialize basic modules only
        this.initNavigation();
        this.initAnimations();
        this.initUIComponents();
        
        console.log('✅ REDitors App Ready');
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
