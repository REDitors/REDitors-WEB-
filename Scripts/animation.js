// ====================================
// Animation System for REDitors
// Handles all page animations and transitions
// ====================================

class AnimationController {
    constructor() {
        this.init();
    }

    init() {
        this.setupAOS();
        this.setupScrollAnimations();
        this.setupHoverEffects();
        this.setupPageTransitions();
    }

    /**
     * Initialize AOS (Animate On Scroll)
     */
    setupAOS() {
        if (typeof AOS !== 'undefined') {
            // If AOS library is loaded
            AOS.init({
                duration: 800,
                easing: 'ease-out',
                once: true,
                offset: 100
            });
        } else {
            // Fallback custom implementation
            this.customAOS();
        }
    }

    /**
     * Custom AOS Implementation
     */
    customAOS() {
        const elements = document.querySelectorAll('[data-aos]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('aos-animate');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });

        elements.forEach(el => observer.observe(el));
    }

    /**
     * Setup scroll-based animations
     */
    setupScrollAnimations() {
        // Parallax effect for hero
        const hero = document.querySelector('.hero-header');
        const heroContent = document.querySelector('.hero-content');

        if (hero && heroContent) {
            window.addEventListener('scroll', throttle(() => {
                const scrolled = window.pageYOffset;
                const rate = scrolled * 0.5;
                
                if (scrolled < window.innerHeight) {
                    heroContent.style.transform = `translateY(${rate}px)`;
                    heroContent.style.opacity = 1 - (scrolled / window.innerHeight);
                }
            }, 10));
        }

        // Fade in sections on scroll
        this.animateSectionsOnScroll();
    }

    /**
     * Animate sections as they come into view
     */
    animateSectionsOnScroll() {
        const sections = document.querySelectorAll('section');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1
        });

        sections.forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(section);
        });
    }

    /**
     * Setup hover effects for interactive elements
     */
    setupHoverEffects() {
        // Bento grid items
        const bentoItems = document.querySelectorAll('.bento-item');
        bentoItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                this.animateBentoItem(item, 'enter');
            });
            
            item.addEventListener('mouseleave', () => {
                this.animateBentoItem(item, 'leave');
            });
        });

        // Workflow cards
        const workflowCards = document.querySelectorAll('.workflow-card');
        workflowCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateX(10px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateX(0) scale(1)';
            });
        });

        // Pricing cards
        const pricingCards = document.querySelectorAll('.pricing-card');
        pricingCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    /**
     * Animate bento item on hover
     */
    animateBentoItem(item, state) {
        if (state === 'enter') {
            item.style.transform = 'translateY(-8px) scale(1.02)';
            item.style.boxShadow = '0 20px 60px rgba(255, 255, 255, 0.15)';
        } else {
            item.style.transform = 'translateY(0) scale(1)';
            item.style.boxShadow = '';
        }
    }

    /**
     * Setup page transition animations
     */
    setupPageTransitions() {
        // Smooth page load
        window.addEventListener('load', () => {
            document.body.classList.add('loaded');
        });

        // Link transitions
        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href && href !== '#') {
                    e.preventDefault();
                    this.smoothScrollTo(href);
                }
            });
        });
    }

    /**
     * Smooth scroll to element
     */
    smoothScrollTo(target) {
        const element = document.querySelector(target);
        if (!element) return;

        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition - 80; // 80px offset for nav
        const duration = 1000;
        let start = null;

        function animation(currentTime) {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = ease(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        }

        function ease(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }

        requestAnimationFrame(animation);
    }

    /**
     * Stagger animation for lists
     */
    staggerAnimation(elements, delay = 100) {
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * delay);
        });
    }

    /**
     * Reveal text animation
     */
    revealText(element) {
        const text = element.textContent;
        element.textContent = '';
        element.style.opacity = '1';

        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.opacity = '0';
            span.style.display = 'inline-block';
            span.style.animation = `fadeInChar 0.5s ease forwards ${index * 0.03}s`;
            element.appendChild(span);
        });
    }
}

// Utility: Throttle function
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

// Add necessary CSS animations
function addAnimationStyles() {
    if (document.getElementById('animation-styles')) return;

    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.textContent = `
        @keyframes fadeInChar {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .loaded {
            animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .bento-item,
        .workflow-card,
        .pricing-card {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
    `;
    document.head.appendChild(style);
}

// Initialize animation controller
document.addEventListener('DOMContentLoaded', () => {
    addAnimationStyles();
    window.animationController = new AnimationController();
});