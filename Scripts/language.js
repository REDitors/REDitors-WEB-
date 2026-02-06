// ====================================
// Language System for REDitors
// Handles internationalization and translations
// ====================================

class LanguageManager {
    constructor() {
        this.currentLang = 'en';
        this.langSwitch = document.getElementById('langSwitch');
        this.translations = {};
        this.init();
    }

    init() {
        // Load saved language preference
        const savedLang = localStorage.getItem('preferredLanguage') || this.detectUserLanguage();
        this.currentLang = savedLang;
        
        // Set initial language
        if (this.langSwitch) {
            this.langSwitch.value = this.currentLang;
        }

        // Load translations
        this.loadTranslations();

        // Setup event listeners
        this.setupEventListeners();

        // Apply initial translation
        this.applyTranslations();
    }

    detectUserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        const langCode = browserLang.split('-')[0];
        
        // Check if we support this language
        const supportedLangs = ['en', 'jp', 'fr', 'de', 'es', 'ar'];
        return supportedLangs.includes(langCode) ? langCode : 'en';
    }

    loadTranslations() {
        // English translations
        this.translations.en = {
            'hero.title': 'CINEMA IS RAW.',
            'hero.description': 'The first video editor designed exclusively for monochrome storytelling. No colors. No distractions. Just pure light.',
            'hero.badge': 'Professional Grade',
            'hero.cta.trial': 'Start Free Trial',
            'hero.cta.download': 'Download Now',
            'hero.stats.users': 'Active Users',
            'hero.stats.resolution': 'K Resolution',
            'hero.stats.latency': 's Latency',
            'features.title': 'BUILT FOR PROFESSIONALS',
            'features.description': 'Every feature engineered for cinema-grade production',
            'workflow.title': 'STREAMLINED WORKFLOW',
            'pricing.title': 'TRANSPARENT PRICING',
            'footer.tagline': 'Cinema is RAW.'
        };

        // Japanese translations
        this.translations.jp = {
            'hero.title': 'シネマは生だ',
            'hero.description': 'モノクロームストーリーテリング専用に設計された最初のビデオエディター。色なし。気晴らしなし。純粋な光だけ。',
            'hero.badge': 'プロフェッショナルグレード',
            'hero.cta.trial': '無料トライアルを開始',
            'hero.cta.download': '今すぐダウンロード',
            'hero.stats.users': 'アクティブユーザー',
            'hero.stats.resolution': 'K 解像度',
            'hero.stats.latency': 's レイテンシ',
            'features.title': 'プロフェッショナル向けに構築',
            'features.description': 'シネマグレードの制作用に設計されたすべての機能',
            'workflow.title': '合理化されたワークフロー',
            'pricing.title': '透明な価格設定',
            'footer.tagline': 'シネマは生だ'
        };

        // French translations
        this.translations.fr = {
            'hero.title': 'LE CINÉMA EST BRUT',
            'hero.description': 'Le premier éditeur vidéo conçu exclusivement pour la narration monochrome. Pas de couleurs. Pas de distractions. Juste la lumière pure.',
            'hero.badge': 'Grade Professionnel',
            'hero.cta.trial': 'Commencer l\'essai gratuit',
            'hero.cta.download': 'Télécharger maintenant',
            'hero.stats.users': 'Utilisateurs actifs',
            'hero.stats.resolution': 'K Résolution',
            'hero.stats.latency': 's Latence',
            'features.title': 'CONÇU POUR LES PROFESSIONNELS',
            'features.description': 'Chaque fonctionnalité conçue pour la production cinématographique',
            'workflow.title': 'FLUX DE TRAVAIL RATIONALISÉ',
            'pricing.title': 'TARIFICATION TRANSPARENTE',
            'footer.tagline': 'Le cinéma est brut'
        };

        // German translations
        this.translations.de = {
            'hero.title': 'KINO IST RAW',
            'hero.description': 'Der erste Videoeditor, der ausschließlich für monochromes Storytelling entwickelt wurde. Keine Farben. Keine Ablenkungen. Nur reines Licht.',
            'hero.badge': 'Professionelle Qualität',
            'hero.cta.trial': 'Kostenlose Testversion starten',
            'hero.cta.download': 'Jetzt herunterladen',
            'hero.stats.users': 'Aktive Benutzer',
            'hero.stats.resolution': 'K Auflösung',
            'hero.stats.latency': 's Latenz',
            'features.title': 'FÜR PROFIS ENTWICKELT',
            'features.description': 'Jede Funktion für kinoreife Produktion entwickelt',
            'workflow.title': 'OPTIMIERTER WORKFLOW',
            'pricing.title': 'TRANSPARENTE PREISE',
            'footer.tagline': 'Kino ist raw'
        };

        // Spanish translations
        this.translations.es = {
            'hero.title': 'EL CINE ES CRUDO',
            'hero.description': 'El primer editor de video diseñado exclusivamente para narrativa monocromática. Sin colores. Sin distracciones. Solo luz pura.',
            'hero.badge': 'Grado Profesional',
            'hero.cta.trial': 'Comenzar prueba gratuita',
            'hero.cta.download': 'Descargar ahora',
            'hero.stats.users': 'Usuarios activos',
            'hero.stats.resolution': 'K Resolución',
            'hero.stats.latency': 's Latencia',
            'features.title': 'CONSTRUIDO PARA PROFESIONALES',
            'features.description': 'Cada característica diseñada para producción de grado cinematográfico',
            'workflow.title': 'FLUJO DE TRABAJO OPTIMIZADO',
            'pricing.title': 'PRECIOS TRANSPARENTES',
            'footer.tagline': 'El cine es crudo'
        };

        // Arabic translations
        this.translations.ar = {
            'hero.title': 'السينما خام',
            'hero.description': 'أول محرر فيديو مصمم حصريًا لسرد القصص أحادي اللون. لا ألوان. لا ملهيات. فقط ضوء نقي.',
            'hero.badge': 'درجة احترافية',
            'hero.cta.trial': 'ابدأ تجربة مجانية',
            'hero.cta.download': 'تحميل الآن',
            'hero.stats.users': 'مستخدمين نشطين',
            'hero.stats.resolution': 'دقة K',
            'hero.stats.latency': 'زمن الاستجابة',
            'features.title': 'مصمم للمحترفين',
            'features.description': 'كل ميزة مصممة للإنتاج السينمائي',
            'workflow.title': 'سير عمل مبسط',
            'pricing.title': 'أسعار شفافة',
            'footer.tagline': 'السينما خام'
        };
    }

    setupEventListeners() {
        if (this.langSwitch) {
            this.langSwitch.addEventListener('change', (e) => {
                this.switchLanguage(e.target.value);
            });
        }
    }

    switchLanguage(langCode) {
        this.currentLang = langCode;
        localStorage.setItem('preferredLanguage', langCode);
        this.applyTranslations();

        // Update page direction for RTL languages
        if (langCode === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
        }

        // Show notification
        this.showLanguageNotification(langCode);
    }

    applyTranslations() {
        const translations = this.translations[this.currentLang];
        if (!translations) return;

        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                el.textContent = translations[key];
            }
        });

        // Update specific elements manually (for compatibility)
        this.updateSpecificElements(translations);
    }

    updateSpecificElements(translations) {
        // Update hero title
        const heroTitle = document.querySelector('.hero-title-outline');
        if (heroTitle && translations['hero.title']) {
            heroTitle.textContent = translations['hero.title'].split(' ').pop();
        }

        // Update hero description
        const heroDesc = document.getElementById('heroDesc');
        if (heroDesc && translations['hero.description']) {
            heroDesc.textContent = translations['hero.description'];
        }

        // Update badge
        const badgeText = document.querySelector('.badge-text');
        if (badgeText && translations['hero.badge']) {
            badgeText.textContent = translations['hero.badge'];
        }

        // Update footer tagline
        const footerTagline = document.querySelector('.footer-tagline');
        if (footerTagline && translations['footer.tagline']) {
            footerTagline.textContent = translations['footer.tagline'];
        }
    }

    showLanguageNotification(langCode) {
        const langNames = {
            'en': 'English',
            'jp': '日本語',
            'fr': 'Français',
            'de': 'Deutsch',
            'es': 'Español',
            'ar': 'العربية'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #fff;
            color: #000;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-weight: 600;
        `;
        notification.textContent = `Language changed to ${langNames[langCode]}`;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    translate(key) {
        const translations = this.translations[this.currentLang];
        return translations && translations[key] ? translations[key] : key;
    }
}

// Initialize language manager
document.addEventListener('DOMContentLoaded', () => {
    window.languageManager = new LanguageManager();
});