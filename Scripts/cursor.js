// ====================================
// Custom Cursor System
// Creates professional custom cursor effects
// ====================================

class CustomCursor {
    constructor() {
        this.dot = document.getElementById('cursorDot');
        this.outline = document.getElementById('cursorOutline');
        this.delay = 8;
        this.dotPos = { x: 0, y: 0 };
        this.outlinePos = { x: 0, y: 0 };
        this.mousePos = { x: 0, y: 0 };
        
        // Check if on mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!this.isMobile && this.dot && this.outline) {
            this.init();
        } else {
            // Hide cursors on mobile
            if (this.dot) this.dot.style.display = 'none';
            if (this.outline) this.outline.style.display = 'none';
        }
    }

    init() {
        // Hide default cursor
        document.body.style.cursor = 'none';
        
        // Track mouse movement
        document.addEventListener('mousemove', (e) => {
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
            
            this.dot.style.left = e.clientX + 'px';
            this.dot.style.top = e.clientY + 'px';
        });

        // Smooth outline follow
        this.followMouse();

        // Add hover effects
        this.setupHoverEffects();

        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => {
            this.dot.style.opacity = '0';
            this.outline.style.opacity = '0';
        });

        document.addEventListener('mouseenter', () => {
            this.dot.style.opacity = '1';
            this.outline.style.opacity = '0.5';
        });
    }

    followMouse() {
        const render = () => {
            this.outlinePos.x += (this.mousePos.x - this.outlinePos.x) / this.delay;
            this.outlinePos.y += (this.mousePos.y - this.outlinePos.y) / this.delay;
            
            this.outline.style.left = this.outlinePos.x + 'px';
            this.outline.style.top = this.outlinePos.y + 'px';
            
            requestAnimationFrame(render);
        };
        
        requestAnimationFrame(render);
    }

    setupHoverEffects() {
        // Interactive elements
        const interactiveElements = document.querySelectorAll('a, button, .nav-link, .bento-item, .pricing-card, input, textarea, select');
        
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                this.dot.style.transform = 'translate(-50%, -50%) scale(1.5)';
                this.outline.style.transform = 'translate(-50%, -50%) scale(1.5)';
                this.outline.style.borderColor = '#fff';
            });
            
            el.addEventListener('mouseleave', () => {
                this.dot.style.transform = 'translate(-50%, -50%) scale(1)';
                this.outline.style.transform = 'translate(-50%, -50%) scale(1)';
                this.outline.style.borderColor = '#fff';
            });
        });

        // Click effect
        document.addEventListener('mousedown', () => {
            this.dot.style.transform = 'translate(-50%, -50%) scale(0.8)';
            this.outline.style.transform = 'translate(-50%, -50%) scale(0.8)';
        });

        document.addEventListener('mouseup', () => {
            this.dot.style.transform = 'translate(-50%, -50%) scale(1)';
            this.outline.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    }
}

// Initialize cursor
document.addEventListener('DOMContentLoaded', () => {
    window.customCursor = new CustomCursor();
});