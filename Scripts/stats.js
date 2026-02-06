// Stats and Analytics Features

class StatsManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.trackPageViews();
        this.trackTimeOnPage();
        this.trackScrollDepth();
        this.trackInteractions();
    }
    
    trackPageViews() {
        // Log page view
        console.log('Page View:', {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            referrer: document.referrer,
            userAgent: navigator.userAgent
        });
    }
    
    trackTimeOnPage() {
        const startTime = Date.now();
        
        window.addEventListener('beforeunload', () => {
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            console.log('Time on Page:', timeSpent, 'seconds');
        });
    }
    
    trackScrollDepth() {
        let maxScroll = 0;
        
        window.addEventListener('scroll', throttle(() => {
            const scrollPercentage = Math.floor(getScrollPercentage());
            
            if (scrollPercentage > maxScroll) {
                maxScroll = scrollPercentage;
                
                // Log milestones
                if ([25, 50, 75, 100].includes(scrollPercentage)) {
                    console.log(`Scroll Depth: ${scrollPercentage}%`);
                }
            }
        }, 500));
    }
    
    trackInteractions() {
        // Track button clicks
        document.querySelectorAll('button, .special-btn, .nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Button Click:', {
                    element: e.target.textContent.trim(),
                    timestamp: new Date().toISOString()
                });
            });
        });
        
        // Track section views
        const sections = document.querySelectorAll('section[id]');
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('Section View:', entry.target.id);
                }
            });
        }, { threshold: 0.5 });
        
        sections.forEach(section => sectionObserver.observe(section));
    }
}

// Performance Monitoring
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.init();
    }
    
    init() {
        this.measurePageLoad();
        this.measureResourceTiming();
        this.monitorFPS();
    }
    
    measurePageLoad() {
        window.addEventListener('load', () => {
            const perfData = performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            const connectTime = perfData.responseEnd - perfData.requestStart;
            const renderTime = perfData.domComplete - perfData.domLoading;
            
            this.metrics.pageLoad = {
                total: pageLoadTime,
                connect: connectTime,
                render: renderTime
            };
            
            console.log('Performance Metrics:', this.metrics.pageLoad);
        });
    }
    
    measureResourceTiming() {
        window.addEventListener('load', () => {
            const resources = performance.getEntriesByType('resource');
            const totalSize = resources.reduce((acc, r) => acc + (r.transferSize || 0), 0);
            
            this.metrics.resources = {
                count: resources.length,
                totalSize: (totalSize / 1024).toFixed(2) + ' KB'
            };
            
            console.log('Resource Metrics:', this.metrics.resources);
        });
    }
    
    monitorFPS() {
        let lastTime = performance.now();
        let frames = 0;
        
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                this.metrics.fps = fps;
                
                // Log if FPS drops below 30
                if (fps < 30) {
                    console.warn('Low FPS detected:', fps);
                }
                
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
    }
    
    getMetrics() {
        return this.metrics;
    }
}

// User Session Manager
class AnalyticsSessionManager {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.interactions = [];
        
        this.init();
    }
    
    init() {
        this.trackSession();
        this.setupBeforeUnload();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    trackSession() {
        console.log('Session Started:', {
            sessionId: this.sessionId,
            timestamp: new Date(this.sessionStart).toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`
        });
    }
    
    logInteraction(type, data) {
        this.interactions.push({
            type,
            data,
            timestamp: Date.now() - this.sessionStart
        });
    }
    
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            const sessionDuration = Date.now() - this.sessionStart;
            
            console.log('Session Summary:', {
                sessionId: this.sessionId,
                duration: Math.floor(sessionDuration / 1000) + 's',
                interactions: this.interactions.length
            });
        });
    }
}

// Initialize analytics
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not in development
    if (window.location.hostname !== 'localhost') {
        new StatsManager();
        new PerformanceMonitor();
        new AnalyticsSessionManager();
    }
});