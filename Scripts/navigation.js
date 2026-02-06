// Navigation Effects and Interactions

class NavigationController {
    constructor() {
        this.nav = document.getElementById('mainNav');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('section[id]');
        this.lastScrollTop = 0;
        
        if (!this.nav) return;
        
        this.init();
    }
    
    init() {
        this.handleScroll();
        this.highlightActiveSection();
        this.handleNavHover();
    }
    
    handleScroll() {
        let ticking = false;
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.updateNavOnScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }
    
    updateNavOnScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove scrolled class
        if (scrollTop > 100) {
            this.nav.classList.add('scrolled');
        } else {
            this.nav.classList.remove('scrolled');
        }
        
        // Hide/show nav on scroll direction (optional)
        if (scrollTop > this.lastScrollTop && scrollTop > 300) {
            // Scrolling down
            this.nav.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            this.nav.style.transform = 'translateY(0)';
        }
        
        this.lastScrollTop = scrollTop;
    }
    
    highlightActiveSection() {
        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px -50% 0px',
            threshold: 0
        };
        
        const observerCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    this.setActiveLink(id);
                }
            });
        };
        
        const observer = new IntersectionObserver(observerCallback, observerOptions);
        
        this.sections.forEach(section => {
            observer.observe(section);
        });
    }
    
    setActiveLink(id) {
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
                link.classList.add('active');
            }
        });
    }
    
    handleNavHover() {
        this.navLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                this.navLinks.forEach(l => {
                    if (l !== link) {
                        l.style.opacity = '0.5';
                    }
                });
            });
            
            link.addEventListener('mouseleave', () => {
                this.navLinks.forEach(l => {
                    l.style.opacity = '1';
                });
            });
        });
    }
}

// Progress Bar
class ScrollProgressBar {
    constructor() {
        this.createProgressBar();
        this.updateProgress();
    }
    
    createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.id = 'scrollProgress';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            height: 2px;
            background: var(--accent);
            z-index: 10000;
            width: 0%;
            transition: width 0.1s ease;
        `;
        document.body.appendChild(progressBar);
        this.progressBar = progressBar;
    }
    
    updateProgress() {
        window.addEventListener('scroll', throttle(() => {
            const scrollPercentage = getScrollPercentage();
            this.progressBar.style.width = scrollPercentage + '%';
        }, 50));
    }
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
    new NavigationController();
    new ScrollProgressBar();
});