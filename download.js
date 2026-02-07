// Download Manager for REDitors Software
// Fixed version for inline download buttons

class DownloadManager {
    constructor() {
        // Direct installation paths
        this.installPaths = {
            'windows': '/install-windows',
            'macos': '/install-macos',
            'linux': '/install-linux'
        };
        
        this.windowsButton = document.getElementById('downloadWindows');
        this.macosButton = document.getElementById('downloadMacOS');
        
        this.init();
    }
    
    init() {
        this.detectOS();
        this.setupDownloadButtons();
    }
    
    /**
     * Detect user's operating system
     */
    detectOS() {
        const userAgent = navigator.userAgent.toLowerCase();
        let os = 'unknown';
        
        if (userAgent.includes('win')) {
            os = 'windows';
        } else if (userAgent.includes('mac')) {
            os = 'macos';
        } else if (userAgent.includes('linux')) {
            os = 'linux';
        }
        
        this.currentOS = os;
        
        // Update UI
        this.updateOSDetection(os);
    }
    
    /**
     * Get download path based on OS
     */
    getDownloadPath(os) {
        return this.installPaths[os] || this.installPaths['windows'];
    }
    
    /**
     * Update OS detection display
     */
    updateOSDetection(os) {
        const osDetect = document.getElementById('osDetect');
        if (!osDetect) return;
        
        const osNames = {
            'windows': 'WINDOWS',
            'macos': 'macOS',
            'linux': 'LINUX',
            'unknown': 'SYSTEM'
        };
        
        setTimeout(() => {
            osDetect.textContent = `${osNames[os]} DETECTED`;
            osDetect.style.animation = 'none';
        }, 2000);
    }
    
    /**
     * Setup download buttons functionality
     */
    setupDownloadButtons() {
        // Windows button
        if (this.windowsButton) {
            this.windowsButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.initiateDownload('windows');
            });
        }
        
        // macOS button
        if (this.macosButton) {
            this.macosButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.initiateDownload('macos');
            });
        }
    }
    
    /**
     * Initiate download for specific OS
     */
    initiateDownload(os) {
        // Show loading state
        this.showDownloadStatus('preparing', os);
        
        // Animate button
        const button = os === 'windows' ? this.windowsButton : this.macosButton;
        if (button) {
            button.style.transform = 'scale(0.97)';
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
        }
        
        // Start download after brief delay
        setTimeout(() => {
            this.startDownload(os);
        }, 500);
    }
    
    /**
     * Start the actual download
     */
    startDownload(os) {
        const downloadPath = this.getDownloadPath(os);
        
        // Navigate to the installation path
        window.location.href = downloadPath;
        
        // Show success notification
        this.showDownloadStatus('success', os);
        
        // Track download
        this.trackDownload(os);
    }
    
    /**
     * Show download status notification
     */
    showDownloadStatus(status, os) {
        const osNames = {
            'windows': 'Windows',
            'macos': 'macOS',
            'linux': 'Linux'
        };
        
        const messages = {
            'preparing': `⏳ Preparing ${osNames[os]} download...`,
            'success': `✓ Download started for ${osNames[os]}!`,
            'error': '✗ Download failed. Please try again.'
        };
        
        const colors = {
            'preparing': 'rgba(255, 255, 255, 0.1)',
            'success': '#ffffff',
            'error': '#ff4444'
        };
        
        const textColors = {
            'preparing': '#ffffff',
            'success': '#000000',
            'error': '#ffffff'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${colors[status]};
            color: ${textColors[status]};
            padding: 20px 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            animation: slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 600;
            font-family: 'Inter', sans-serif;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
        `;
        notification.textContent = messages[status];
        
        document.body.appendChild(notification);
        
        if (status === 'success') {
            // Add installation instructions
            setTimeout(() => {
                const instructions = document.createElement('div');
                instructions.style.cssText = `
                    position: fixed;
                    top: 170px;
                    right: 20px;
                    background: rgba(26, 26, 26, 0.95);
                    color: #fff;
                    padding: 15px 20px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    animation: slideInRight 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    font-size: 0.9rem;
                    max-width: 320px;
                    line-height: 1.6;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                `;
                instructions.innerHTML = this.getInstallationInstructions(os);
                document.body.appendChild(instructions);
                
                setTimeout(() => {
                    instructions.style.animation = 'fadeOut 0.5s ease';
                    setTimeout(() => instructions.remove(), 500);
                }, 8000);
            }, 600);
        }
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    /**
     * Get installation instructions based on OS
     */
    getInstallationInstructions(os) {
        const instructions = {
            'windows': '<strong>Next Steps:</strong><br/>1. Open the downloaded file<br/>2. Follow the installation wizard<br/>3. Launch REDitors',
            'macos': '<strong>Next Steps:</strong><br/>1. Open the .dmg file<br/>2. Drag REDitors to Applications<br/>3. Launch from Applications folder',
            'linux': '<strong>Next Steps:</strong><br/>1. Make the file executable<br/>2. Run the installer<br/>3. Launch REDitors'
        };
        
        return instructions[os] || '<strong>Next Steps:</strong><br/>Follow the installation instructions.';
    }
    
    /**
     * Track download for analytics
     */
    trackDownload(os) {
        console.log('Download Analytics:', {
            os: os,
            timestamp: new Date().toISOString(),
            downloadPath: this.getDownloadPath(os),
            userAgent: navigator.userAgent
        });
        
        // You can add Google Analytics or other tracking here
        if (typeof gtag !== 'undefined') {
            gtag('event', 'download', {
                'event_category': 'Downloads',
                'event_label': os,
                'value': 1
            });
        }
    }
}

// Initialize download manager
document.addEventListener('DOMContentLoaded', () => {
    new DownloadManager();
});

// Add CSS animations if not already present
if (!document.querySelector('#download-animations')) {
    const style = document.createElement('style');
    style.id = 'download-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-10px);
            }
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        
        /* Enhanced button styles */
        .cta-btn-secondary {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        
        .cta-btn-secondary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 255, 255, 0.1);
        }
        
        .cta-btn-secondary:active {
            transform: translateY(0) scale(0.98);
        }
        
        .cta-btn-secondary::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transition: left 0.5s;
        }
        
        .cta-btn-secondary:hover::before {
            left: 100%;
        }
    `;
    document.head.appendChild(style);
}
