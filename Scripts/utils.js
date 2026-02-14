// ====================================
// Utility Functions - IMPROVED & OPTIMIZED
// ====================================

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const context = this;
        const later = () => {
            timeout = null;
            if (!immediate) {
                func.apply(context, args);
            }
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) {
            func.apply(context, args);
        }
    };
}

/**
 * Throttle function to limit function execution rate
 * IMPROVED: Better timing and edge case handling
 */
function throttle(func, limit) {
    let inThrottle;
    let lastFunc;
    let lastRan;
    
    return function(...args) {
        const context = this;
        
        if (!inThrottle) {
            func.apply(context, args);
            lastRan = Date.now();
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, Math.max(limit - (Date.now() - lastRan), 0));
        }
    };
}

/**
 * Request Animation Frame based throttle
 * IMPROVED: Better cleanup and performance
 */
function rafThrottle(func) {
    let rafId = null;
    return function(...args) {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
            func.apply(this, args);
            rafId = null;
        });
    };
}

/**
 * Check if element is in viewport
 * IMPROVED: Better accuracy and options
 */
function isInViewport(element, offset = 0) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
        rect.top >= -offset &&
        rect.left >= -offset &&
        rect.bottom <= windowHeight + offset &&
        rect.right <= windowWidth + offset
    );
}

/**
 * Smooth scroll to element
 * IMPROVED: Better easing and fallback
 */
function smoothScrollTo(target, duration = 1000, offset = 80) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    
    if (!element) {
        console.warn('Target element not found:', target);
        return;
    }
    
    // Use native smooth scroll if supported
    if ('scrollBehavior' in document.documentElement.style) {
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
        return;
    }
    
    // Custom smooth scroll implementation
    const startPosition = window.pageYOffset;
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutCubic(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        }
    }

    function easeInOutCubic(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t + b;
        t -= 2;
        return c / 2 * (t * t * t + 2) + b;
    }

    requestAnimationFrame(animation);
}

/**
 * Wait/Sleep function
 * @param {number} ms - Milliseconds to wait
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get random number between min and max
 */
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Get random float between min and max
 */
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Clamp number between min and max
 */
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

/**
 * Linear interpolation
 */
function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

/**
 * Map value from one range to another
 */
function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Animate counter
 * IMPROVED: Better performance and accuracy
 */
function animateCounter(element, target, duration = 2000, onComplete) {
    if (!element) return;
    
    const start = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const current = Math.floor(start + (target - start) * easeProgress);
        element.textContent = formatNumber(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = formatNumber(target);
            if (onComplete) onComplete();
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Detect OS
 * IMPROVED: Better detection
 */
function detectOS() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    if (platform.includes('mac')) return 'macOS';
    if (platform.includes('win')) return 'Windows';
    if (platform.includes('linux')) return 'Linux';
    if (userAgent.includes('android')) return 'Android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
    
    return 'Unknown';
}

/**
 * Detect browser
 */
function detectBrowser() {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    
    return 'Unknown';
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get scroll percentage
 */
function getScrollPercentage() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    return scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
}

/**
 * Copy to clipboard
 * IMPROVED: Better error handling
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

/**
 * Get element offset top
 */
function getOffsetTop(element) {
    let offsetTop = 0;
    while (element) {
        offsetTop += element.offsetTop;
        element = element.offsetParent;
    }
    return offsetTop;
}

/**
 * Check if element is visible
 */
function isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

/**
 * Get current breakpoint
 */
function getBreakpoint() {
    const width = window.innerWidth;
    
    if (width < 576) return 'xs';
    if (width < 768) return 'sm';
    if (width < 992) return 'md';
    if (width < 1200) return 'lg';
    if (width < 1536) return 'xl';
    return '2xl';
}

/**
 * Preload images
 */
function preloadImages(urls) {
    return Promise.all(
        urls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
                img.src = url;
            });
        })
    );
}

/**
 * Local storage with JSON support
 * IMPROVED: Better error handling
 */
const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }
};

/**
 * Cookie utilities
 */
const cookie = {
    get(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    },
    
    set(name, value, days = 7, options = {}) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        
        const cookieOptions = {
            expires: expires.toUTCString(),
            path: '/',
            ...options
        };
        
        let cookieString = `${name}=${encodeURIComponent(value)}`;
        for (const [key, val] of Object.entries(cookieOptions)) {
            cookieString += `; ${key}=${val}`;
        }
        
        document.cookie = cookieString;
    },
    
    remove(name) {
        this.set(name, '', -1);
    }
};

/**
 * Generate unique ID
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Truncate text
 */
function truncate(text, length, suffix = '...') {
    if (!text || text.length <= length) return text;
    return text.substr(0, length).trim() + suffix;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if device is touch enabled
 */
function isTouchDevice() {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
}

/**
 * Check if device is mobile
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Performance monitoring
 */
const perf = {
    mark(name) {
        if (window.performance && performance.mark) {
            performance.mark(name);
        }
    },
    
    measure(name, startMark, endMark) {
        if (window.performance && performance.measure) {
            try {
                performance.measure(name, startMark, endMark);
                const measure = performance.getEntriesByName(name)[0];
                return measure ? measure.duration : 0;
            } catch (e) {
                console.warn('Performance measure error:', e);
                return 0;
            }
        }
        return 0;
    },
    
    clear() {
        if (window.performance) {
            performance.clearMarks();
            performance.clearMeasures();
        }
    }
};

/**
 * Simple AOS (Animate On Scroll) implementation
 * IMPROVED: Better initialization and cleanup
 */
const AOS = {
    elements: [],
    observer: null,
    initialized: false,
    
    init(options = {}) {
        if (this.initialized) return;
        
        const defaults = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px',
            once: true,
            duration: 800,
            easing: 'ease-out'
        };
        
        const settings = { ...defaults, ...options };
        
        // Don't animate if user prefers reduced motion
        if (prefersReducedMotion()) {
            const elements = document.querySelectorAll('[data-aos]');
            elements.forEach(el => el.classList.add('aos-animate'));
            return;
        }
        
        this.elements = document.querySelectorAll('[data-aos]');
        
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('aos-animate');
                        if (settings.once) {
                            this.observer.unobserve(entry.target);
                        }
                    } else if (!settings.once) {
                        entry.target.classList.remove('aos-animate');
                    }
                });
            }, {
                threshold: settings.threshold,
                rootMargin: settings.rootMargin
            });
            
            this.elements.forEach(el => this.observer.observe(el));
            this.initialized = true;
        } else {
            // Fallback for older browsers
            this.elements.forEach(el => el.classList.add('aos-animate'));
        }
    },
    
    refresh() {
        if (!this.initialized) return;
        
        this.elements = document.querySelectorAll('[data-aos]');
        if (this.observer) {
            this.elements.forEach(el => {
                if (!el.classList.contains('aos-animate')) {
                    this.observer.observe(el);
                }
            });
        }
    },
    
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.elements = [];
        this.initialized = false;
    }
};

// Add utility styles
if (!document.querySelector('#utility-styles')) {
    const style = document.createElement('style');
    style.id = 'utility-styles';
    style.textContent = `
        [data-aos] {
            opacity: 0;
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        [data-aos].aos-animate {
            opacity: 1;
        }
        
        [data-aos="fade-up"] {
            transform: translateY(30px);
        }
        
        [data-aos="fade-up"].aos-animate {
            transform: translateY(0);
        }
        
        [data-aos="fade-down"] {
            transform: translateY(-30px);
        }
        
        [data-aos="fade-down"].aos-animate {
            transform: translateY(0);
        }
        
        [data-aos="fade-left"] {
            transform: translateX(30px);
        }
        
        [data-aos="fade-left"].aos-animate {
            transform: translateX(0);
        }
        
        [data-aos="fade-right"] {
            transform: translateX(-30px);
        }
        
        [data-aos="fade-right"].aos-animate {
            transform: translateX(0);
        }
        
        [data-aos="zoom-in"] {
            transform: scale(0.8);
        }
        
        [data-aos="zoom-in"].aos-animate {
            transform: scale(1);
        }
        
        @media (prefers-reduced-motion: reduce) {
            [data-aos] {
                transition: none !important;
                transform: none !important;
                opacity: 1 !important;
            }
        }
    `;
    document.head.appendChild(style);
}

console.log('✓ Utilities loaded (IMPROVED)');

// Export for use in modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        rafThrottle,
        isInViewport,
        smoothScrollTo,
        wait,
        random,
        randomFloat,
        clamp,
        lerp,
        map,
        formatNumber,
        animateCounter,
        detectOS,
        detectBrowser,
        prefersReducedMotion,
        getScrollPercentage,
        copyToClipboard,
        getOffsetTop,
        isVisible,
        getBreakpoint,
        preloadImages,
        storage,
        cookie,
        generateId,
        truncate,
        capitalize,
        isTouchDevice,
        isMobile,
        perf,
        AOS
    };
}