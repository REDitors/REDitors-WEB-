// Hero Canvas Animation

class HeroCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 50;
        this.mouse = { x: null, y: null };
        
        this.init();
    }
    
    init() {
        this.resize();
        this.createParticles();
        this.addEventListeners();
        this.animate();
    }
    
    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new Particle(this.canvas.width, this.canvas.height));
        }
    }
    
    addEventListeners() {
        window.addEventListener('resize', debounce(() => {
            this.resize();
            this.particles = [];
            this.createParticles();
        }, 250));
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and draw particles
        this.particles.forEach((particle, index) => {
            particle.update(this.mouse);
            particle.draw(this.ctx);
            
            // Connect nearby particles
            for (let j = index + 1; j < this.particles.length; j++) {
                const dx = particle.x - this.particles[j].x;
                const dy = particle.y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 150) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / 150)})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

class Particle {
    constructor(canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
    
    update(mouse) {
        // Move particle
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Bounce off edges
        if (this.x < 0 || this.x > this.canvasWidth) {
            this.speedX *= -1;
        }
        if (this.y < 0 || this.y > this.canvasHeight) {
            this.speedY *= -1;
        }
        
        // Mouse interaction
        if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100) {
                const force = (100 - distance) / 100;
                this.x -= dx * force * 0.05;
                this.y -= dy * force * 0.05;
            }
        }
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }
}

// Initialize canvas animation
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('heroCanvas');
    if (canvas && !prefersReducedMotion()) {
        new HeroCanvas(canvas);
    }
});