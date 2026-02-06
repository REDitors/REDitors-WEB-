// Download Manager for REDitors Software

class DownloadManager {
    constructor() {
        this.githubRepo = 'remontagedz-cmyk/vvxcvxcv';
        this.githubURL = 'https://github.com/remontagedz-cmyk/vvxcvxcv.git';
        this.releaseURL = 'https://api.github.com/repos/remontagedz-cmyk/vvxcvxcv/releases/latest';
        this.downloadButton = document.getElementById('mainBtn');
        
        this.init();
    }
    
    init() {
        this.detectOS();
        this.setupDownloadButton();
        this.checkLatestRelease();
    }
    
    /**
     * Detect user's operating system
     */
    detectOS() {
        const userAgent = navigator.userAgent.toLowerCase();
        let os = 'unknown';
        let downloadURL = '';
        
        if (userAgent.includes('win')) {
            os = 'windows';
            downloadURL = this.getDownloadURL('windows');
        } else if (userAgent.includes('mac')) {
            os = 'macos';
            downloadURL = this.getDownloadURL('macos');
        } else if (userAgent.includes('linux')) {
            os = 'linux';
            downloadURL = this.getDownloadURL('linux');
        }
        
        this.currentOS = os;
        this.downloadURL = downloadURL;
        
        // Update UI
        this.updateOSDetection(os);
    }
    
    /**
     * Get download URL based on OS
     */
    getDownloadURL(os) {
        // These URLs point to the latest release downloads
        const baseURL = `https://github.com/${this.githubRepo}/releases/latest/download/`;
        
        const downloads = {
            'windows': `${baseURL}REDitors-Windows-x64.exe`,
            'macos': `${baseURL}REDitors-macOS.dmg`,
            'linux': `${baseURL}REDitors-Linux-x64.AppImage`
        };
        
        return downloads[os] || this.getZipDownload();
    }
    
    /**
     * Fallback: Download repository as ZIP
     */
    getZipDownload() {
        return `https://github.com/${this.githubRepo}/archive/refs/heads/main.zip`;
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
     * Setup download button functionality
     */
    setupDownloadButton() {
        if (!this.downloadButton) return;
        
        this.downloadButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.initiateDownload();
        });
    }
    
    /**
     * Check for latest release from GitHub API
     */
    async checkLatestRelease() {
        try {
            const response = await fetch(this.releaseURL);
            const data = await response.json();
            
            if (data.tag_name) {
                this.latestVersion = data.tag_name;
                this.releaseAssets = data.assets;
                this.updateDownloadURLFromRelease(data);
            }
        } catch (error) {
            console.log('Using fallback download method');
            // Fallback to ZIP download
        }
    }
    
    /**
     * Update download URL from GitHub release assets
     */
    updateDownloadURLFromRelease(releaseData) {
        if (!releaseData.assets || releaseData.assets.length === 0) {
            this.downloadURL = this.getZipDownload();
            return;
        }
        
        const assets = releaseData.assets;
        let selectedAsset = null;
        
        // Find the appropriate asset for the current OS
        if (this.currentOS === 'windows') {
            selectedAsset = assets.find(asset => 
                asset.name.toLowerCase().includes('windows') || 
                asset.name.toLowerCase().includes('win') ||
                asset.name.toLowerCase().includes('.exe')
            );
        } else if (this.currentOS === 'macos') {
            selectedAsset = assets.find(asset => 
                asset.name.toLowerCase().includes('macos') || 
                asset.name.toLowerCase().includes('mac') ||
                asset.name.toLowerCase().includes('.dmg')
            );
        } else if (this.currentOS === 'linux') {
            selectedAsset = assets.find(asset => 
                asset.name.toLowerCase().includes('linux') ||
                asset.name.toLowerCase().includes('.appimage')
            );
        }
        
        if (selectedAsset) {
            this.downloadURL = selectedAsset.browser_download_url;
        } else {
            // If no specific asset found, use the first one or ZIP
            this.downloadURL = assets[0]?.browser_download_url || this.getZipDownload();
        }
    }
    
    /**
     * Initiate download
     */
    initiateDownload() {
        // Show loading state
        this.showDownloadStatus('preparing');
        
        // Animate button
        this.downloadButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.downloadButton.style.transform = '';
        }, 100);
        
        // Start download
        setTimeout(() => {
            this.startDownload();
        }, 500);
    }
    
    /**
     * Start the actual download
     */
    startDownload() {
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = this.downloadURL;
        link.download = this.getFileName();
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show success notification
        this.showDownloadStatus('success');
        
        // Track download
        this.trackDownload();
    }
    
    /**
     * Get appropriate filename
     */
    getFileName() {
        const fileNames = {
            'windows': 'REDitors-Setup.exe',
            'macos': 'REDitors-Installer.dmg',
            'linux': 'REDitors-Linux.AppImage',
            'unknown': 'REDitors-Source.zip'
        };
        
        return fileNames[this.currentOS];
    }
    
    /**
     * Show download status notification
     */
    showDownloadStatus(status) {
        const messages = {
            'preparing': '⏳ Preparing download...',
            'success': '✓ Download started for ' + this.currentOS.toUpperCase() + '!',
            'error': '✗ Download failed. Please try again.'
        };
        
        const colors = {
            'preparing': '#666',
            'success': '#fff',
            'error': '#ff0000'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${colors[status]};
            color: ${status === 'success' ? '#000' : '#fff'};
            padding: 20px 30px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            z-index: 10000;
            animation: slideInRight 0.5s ease;
            font-weight: 600;
            font-family: 'Inter', sans-serif;
        `;
        notification.textContent = messages[status];
        
        document.body.appendChild(notification);
        
        if (status === 'success') {
            // Add installation instructions
            setTimeout(() => {
                const instructions = document.createElement('div');
                instructions.style.cssText = `
                    position: fixed;
                    top: 160px;
                    right: 20px;
                    background: #1a1a1a;
                    color: #fff;
                    padding: 15px 20px;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    animation: slideInRight 0.5s ease;
                    font-size: 0.9rem;
                    max-width: 300px;
                    line-height: 1.6;
                `;
                instructions.innerHTML = this.getInstallationInstructions();
                document.body.appendChild(instructions);
                
                setTimeout(() => {
                    instructions.style.animation = 'fadeOut 0.5s ease';
                    setTimeout(() => instructions.remove(), 500);
                }, 8000);
            }, 500);
        }
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
    
    /**
     * Get installation instructions based on OS
     */
    getInstallationInstructions() {
        const instructions = {
            'windows': '📝 Run the .exe file and follow the installation wizard.',
            'macos': '📝 Open the .dmg file and drag REDitors to Applications folder.',
            'linux': '📝 Make the AppImage executable: <code>chmod +x REDitors*.AppImage</code>',
            'unknown': '📝 Extract the ZIP file and follow the README instructions.'
        };
        
        return instructions[this.currentOS];
    }
    
    /**
     * Track download for analytics
     */
    trackDownload() {
        console.log('Download Analytics:', {
            os: this.currentOS,
            version: this.latestVersion || 'latest',
            timestamp: new Date().toISOString(),
            downloadURL: this.downloadURL
        });
    }
    
    /**
     * Create download modal with options
     */
    createDownloadModal() {
        const modal = document.createElement('div');
        modal.id = 'downloadModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a1a; padding: 40px; border-radius: 15px; max-width: 500px; width: 90%;">
                <h2 style="margin: 0 0 20px; font-size: 2rem; font-weight: 900;">Download REDitors</h2>
                <p style="color: #666; margin-bottom: 30px;">Choose your platform:</p>
                
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button class="download-option" data-os="windows" style="padding: 15px 20px; background: #fff; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: left; transition: all 0.3s;">
                        🪟 Windows (64-bit)
                    </button>
                    <button class="download-option" data-os="macos" style="padding: 15px 20px; background: #fff; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: left; transition: all 0.3s;">
                        🍎 macOS
                    </button>
                    <button class="download-option" data-os="linux" style="padding: 15px 20px; background: #fff; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: left; transition: all 0.3s;">
                        🐧 Linux (AppImage)
                    </button>
                    <button class="download-option" data-os="source" style="padding: 15px 20px; background: #333; color: #fff; border: 1px solid #555; border-radius: 8px; font-weight: bold; cursor: pointer; text-align: left; transition: all 0.3s;">
                        📦 Source Code (ZIP)
                    </button>
                </div>
                
                <button id="closeModal" style="margin-top: 30px; padding: 10px 20px; background: transparent; color: #666; border: 1px solid #333; border-radius: 8px; cursor: pointer; width: 100%;">
                    Cancel
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelectorAll('.download-option').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateX(10px)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateX(0)';
            });
            btn.addEventListener('click', () => {
                const os = btn.dataset.os;
                if (os === 'source') {
                    window.open(this.getZipDownload(), '_blank');
                } else {
                    this.currentOS = os;
                    this.downloadURL = this.getDownloadURL(os);
                    this.startDownload();
                }
                modal.remove();
            });
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
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
                transform: translateX(100%);
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
            }
            to {
                opacity: 0;
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
    `;
    document.head.appendChild(style);
}