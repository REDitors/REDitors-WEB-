// ====================================
// Main Application Logic - FIXED
// All issues resolved
// ====================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log('🚀 Initializing REDitors App (FIXED)');
    
    // Loading Screen
    handleLoadingScreen();
    
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out',
            once: true,
            offset: 100
        });
    }
    
    // OS Detection
    displayOSInfo();
    
    // Smooth Scroll for Links
    initSmoothScroll();
    
    // CTA Button Interaction
    initCTAButton();
    
    // Stats Counter Animation
    initStatsCounter();
    
    // Mobile Menu
    initMobileMenu();
    
    // Theme Toggle
    initThemeToggle();
    
    // Scroll Effects
    initScrollEffects();
    
    // Custom Cursor (Desktop only)
    if (!isMobile() && !isTouchDevice()) {
        initCustomCursor();
    }
    
    // Console Easter Egg
    showConsoleMessage();
    
    // Initialize keyboard shortcuts
    initKeyboardShortcuts();

    // Initialize New Phantom Features
    initComparisonSlider();
    initFAQ();
    
    console.log('✅ App initialized successfully');
}

/**
 * Handle Loading Screen
 */
function handleLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return;
    
    const loadingProgress = document.getElementById('loadingProgress');
    const loadingText = document.getElementById('loadingText');
    
    const messages = [
        'INITIALIZING SYSTEM...',
        'LOADING ASSETS...',
        'CALIBRATING DISPLAY...',
        'PREPARING WORKSPACE...',
        'READY TO EDIT'
    ];
    
    let currentMessage = 0;
    
    const messageInterval = setInterval(() => {
        if (currentMessage < messages.length - 1 && loadingText) {
            currentMessage++;
            loadingText.textContent = messages[currentMessage];
        }
    }, 400);
    
    // Hide loading screen after content loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            clearInterval(messageInterval);
            loadingScreen.classList.add('hidden');
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 2000);
    });
    
    // Fallback: Hide after 3 seconds even if load event doesn't fire
    setTimeout(() => {
        clearInterval(messageInterval);
        if (!loadingScreen.classList.contains('hidden')) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 3000);
}

/**
 * Display OS Information
 */
function displayOSInfo() {
    const osDetect = document.getElementById('osDetect');
    if (!osDetect) return;
    
    setTimeout(() => {
        const os = detectOS();
        osDetect.textContent = `${os.toUpperCase()} DETECTED`;
        osDetect.style.animation = 'none';
    }, 2000);
}

/**
 * Initialize Smooth Scroll
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            if (href === '#' || href === '') return;
            
            e.preventDefault();
            const targetElement = document.querySelector(href);
            
            if (targetElement) {
                smoothScrollTo(targetElement, 1000, 80);
                
                // Close mobile menu if open
                const mobileMenu = document.getElementById('mobileMenu');
                const mobileMenuToggle = document.getElementById('mobileMenuToggle');
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    if (mobileMenuToggle) {
                        mobileMenuToggle.classList.remove('active');
                    }
                }
            }
        });
    });
}

/**
 * CTA Button Interaction
 */
function initCTAButton() {
    const mainBtn = document.getElementById('mainBtn');
    if (!mainBtn) return;
    
    mainBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Animate button
        mainBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            mainBtn.style.transform = '';
        }, 100);
        
        // Show download notification
        showDownloadNotification();
    });
}

/**
 * Show Download Notification
 */
function showDownloadNotification() {
    const os = detectOS();
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--accent, #ffffff);
        color: var(--bg, #050505);
        padding: 20px 30px;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-weight: 600;
        max-width: 300px;
    `;
    notification.textContent = `✓ Download initiated for ${os}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Initialize Stats Counter
 */
function initStatsCounter() {
    const statElements = document.querySelectorAll('.stat-number[data-count], .stat-value[data-count]');
    if (statElements.length === 0) return;
    
    let hasAnimated = false;
    
    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                statElements.forEach(el => {
                    const target = parseInt(el.getAttribute('data-count'));
                    if (!isNaN(target)) {
                        animateCounter(el, target, 2000);
                    }
                });
            }
        });
    };
    
    const observer = new IntersectionObserver(observerCallback, {
        threshold: 0.5
    });
    
    statElements.forEach(el => observer.observe(el));
}

/**
 * Initialize Mobile Menu
 */
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!mobileMenuToggle || !mobileMenu) return;
    
    mobileMenuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenuToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
            mobileMenu.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        }
    });
    
    // Close menu when clicking a link
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        });
    });
}

/**
 * Initialize Theme Toggle
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    let isDark = savedTheme !== 'light';
    
    // Set initial theme
    if (!isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIcon) themeIcon.textContent = '🌙';
    } else {
        if (themeIcon) themeIcon.textContent = '☀';
    }
    
    themeToggle.addEventListener('click', () => {
        isDark = !isDark;
        
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            if (themeIcon) themeIcon.textContent = '☀';
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            if (themeIcon) themeIcon.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        }
        
        // Show notification
        showNotification(isDark ? 'Dark mode enabled' : 'Light mode enabled');
    });
}

/**
 * Initialize Scroll Effects
 */
function initScrollEffects() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    
    let lastScrollTop = 0;
    const handleScroll = throttle(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add scrolled class
        if (scrollTop > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        
        // Hide/show nav on scroll (optional - can be disabled)
        if (scrollTop > lastScrollTop && scrollTop > 300) {
            // Scrolling down
            nav.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            nav.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, 100);
    
    window.addEventListener('scroll', handleScroll);
}

/**
 * Initialize Custom Cursor
 */
function initCustomCursor() {
    const cursorDot = document.createElement('div');
    const cursorOutline = document.createElement('div');
    
    cursorDot.className = 'cursor-dot';
    cursorOutline.className = 'cursor-outline';
    
    document.body.appendChild(cursorDot);
    document.body.appendChild(cursorOutline);
    
    let mouseX = 0;
    let mouseY = 0;
    let outlineX = 0;
    let outlineY = 0;
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top = mouseY + 'px';
    });
    
    // Smooth follow for outline
    function animateOutline() {
        outlineX += (mouseX - outlineX) * 0.15;
        outlineY += (mouseY - outlineY) * 0.15;
        
        cursorOutline.style.left = outlineX + 'px';
        cursorOutline.style.top = outlineY + 'px';
        
        requestAnimationFrame(animateOutline);
    }
    animateOutline();
    
    // Scale cursor on clickable elements
    document.querySelectorAll('a, button, .clickable').forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.5)';
        });
        
        el.addEventListener('mouseleave', () => {
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
}

/**
 * Initialize Keyboard Shortcuts
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // ESC to close mobile menu
        if (e.key === 'Escape') {
            const mobileMenu = document.getElementById('mobileMenu');
            const mobileMenuToggle = document.getElementById('mobileMenuToggle');
            if (mobileMenu && mobileMenu.classList.contains('active')) {
                mobileMenu.classList.remove('active');
                if (mobileMenuToggle) {
                    mobileMenuToggle.classList.remove('active');
                }
            }
        }
        
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchModal = document.getElementById('searchModal');
            const searchInput = document.getElementById('searchInput');
            
            if (searchModal) {
                searchModal.classList.add('active');
                if (searchInput) setTimeout(() => searchInput.focus(), 100);
            }
        }
    });
}

/**
 * Initialize Search Modal
 */
function initSearchModal() {
    const searchBtn = document.getElementById('searchBtn');
    const searchModal = document.getElementById('searchModal');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchBtn || !searchModal) return;
    
    // Open modal
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        searchModal.classList.add('active');
        if (searchInput) setTimeout(() => searchInput.focus(), 100);
    });
    
    // Close modal with button
    if (searchClose) {
        searchClose.addEventListener('click', () => {
            searchModal.classList.remove('active');
        });
    }
    
    // Close modal when clicking outside
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) {
            searchModal.classList.remove('active');
        }
    });
    
    // Close on Escape key (handled in global keyboard shortcuts mostly, but adding specific here too)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchModal.classList.contains('active')) {
            searchModal.classList.remove('active');
        }
    });

    // Mock search functionality
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = searchResults.querySelectorAll('.search-item');
            
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                if (text.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
}

/**
 * Initialize Notifications Panel
 */
function initNotificationsPanel() {
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');
    
    if (!notificationsBtn || !notificationsPanel) return;
    
    // Toggle panel
    notificationsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        notificationsPanel.classList.toggle('active');
    });
    
    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (notificationsPanel.classList.contains('active') && 
            !notificationsPanel.contains(e.target) && 
            !notificationsBtn.contains(e.target)) {
            notificationsPanel.classList.remove('active');
        }
    });
    
    // Mark all read functionality
    const markAllReadBtn = notificationsPanel.querySelector('.mark-all-read');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            const unreadItems = notificationsPanel.querySelectorAll('.notification-item.unread');
            unreadItems.forEach(item => {
                item.classList.remove('unread');
            });
            
            // Update badge
            const badge = notificationsBtn.querySelector('.notification-badge');
            if (badge) {
                badge.style.display = 'none';
            }
            
            showNotification('All notifications marked as read');
        });
    }
}

/**
 * Show Console Easter Egg
 */
function showConsoleMessage() {
    const styles = [
        'font-size: 20px',
        'font-weight: bold',
        'color: #fff',
        'background: #000',
        'padding: 10px 20px',
        'border-left: 5px solid #fff'
    ].join(';');
    
    console.log('%cREDitors - The Noir Edition (FIXED)', styles);
    console.log('%cCinema is RAW.', 'font-size: 14px; color: #999;');
    console.log('%c\nInterested in the code? We\'re hiring! \nEmail: careers@reditors.io', 'font-size: 12px; color: #666;');
    console.log('%c\n"In the darkness, we find the light." - REDitors Team', 'font-size: 11px; font-style: italic; color: #555;');
}

/**
 * Show Notification
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.title = '👋 Come back! - REDitors';
    } else {
        document.title = 'REDitors | The Noir Edition';
    }
});

// Performance monitoring (if PerformanceObserver is available)
if ('PerformanceObserver' in window) {
    try {
        const perfObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'paint') {
                    console.log(`⚡ ${entry.name}: ${entry.startTime.toFixed(2)}ms`);
                }
            }
        });
        
        perfObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
        // Performance observer not supported in this browser
    }
}

// Prevent errors from breaking the entire app
window.addEventListener('error', (e) => {
    console.error('App error:', e.message);
    // Don't show errors to users in production
});

console.log('✅ Main.js loaded successfully (FIXED)');

/**
 * Initialize Comparison Slider (Phantom-like Before/After)
 */
function initComparisonSlider() {
    const slider = document.querySelector('.comparison-slider');
    const beforeImage = document.querySelector('.comparison-image.before');
    const wrapper = document.querySelector('.comparison-wrapper');
    
    if (!slider || !beforeImage || !wrapper) return;

    // Fix for inner image width to prevent squashing
    const beforePlaceholder = beforeImage.querySelector('.placeholder-img');
    const updatePlaceholderWidth = () => {
        if (beforePlaceholder && wrapper) {
            beforePlaceholder.style.width = `${wrapper.getBoundingClientRect().width}px`;
        }
    };
    
    // Initial set and resize listener
    updatePlaceholderWidth();
    window.addEventListener('resize', updatePlaceholderWidth);
    
    let isDragging = false;
    
    const handleDrag = (e) => {
        if (!isDragging) return;
        // e.preventDefault(); // Optional: might block scroll on mobile
        
        const rect = wrapper.getBoundingClientRect();
        let clientX = e.clientX;
        
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
        }
        
        const x = clientX - rect.left;
        let percentage = (x / rect.width) * 100;
        
        // Clamp value
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;
        
        beforeImage.style.width = `${percentage}%`;
        slider.style.left = `${percentage}%`;
    };
    
    const stopDrag = () => {
        isDragging = false;
    };
    
    // Mouse events
    slider.addEventListener('mousedown', () => isDragging = true);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('mousemove', handleDrag);
    
    // Touch events
    slider.addEventListener('touchstart', (e) => {
        isDragging = true;
    });
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('touchmove', handleDrag);
}

/**
 * Initialize FAQ Accordion
 */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all others
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const icon = otherItem.querySelector('.faq-question i');
                    if (icon) icon.style.transform = 'rotate(0deg)';
                }
            });
            
            // Toggle current
            item.classList.toggle('active');
            
            // Rotate icon
            const icon = question.querySelector('i');
            if (icon) {
                icon.style.transform = isActive ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    });
}