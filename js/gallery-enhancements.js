// Image Lazy Loading with Blur-up Effect
const ImageLoader = {
    init() {
        document.querySelectorAll('img[data-src], img[loading="lazy"]').forEach(img => {
            this.setupBlurUp(img);
        });
    },
    
    setupBlurUp(img) {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'img-blur-wrapper relative overflow-hidden';
        wrapper.style.backgroundColor = '#f5f5f4';
        
        // Create tiny placeholder (if data-tiny-src exists)
        if (img.dataset.tinySrc) {
            const tiny = document.createElement('img');
            tiny.src = img.dataset.tinySrc;
            tiny.className = 'absolute inset-0 w-full h-full object-cover blur-lg scale-110 transition-opacity duration-500';
            wrapper.appendChild(tiny);
            
            img.onload = () => {
                tiny.style.opacity = '0';
                setTimeout(() => tiny.remove(), 500);
            };
        }
        
        // Wrap the image
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        
        // Add skeleton loading
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-loader absolute inset-0';
        skeleton.style.cssText = `
            background: linear-gradient(90deg, #f5f5f4 25%, #e7e5e4 50%, #f5f5f4 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
        `;
        wrapper.appendChild(skeleton);
        
        img.onload = () => {
            skeleton.remove();
            img.classList.add('loaded');
        };
    }
};

// Skeleton Screen for Dynamic Content
const SkeletonScreen = {
    show(container, type = 'card') {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-container';
        skeleton.innerHTML = this.getSkeletonHTML(type);
        container.appendChild(skeleton);
        return skeleton;
    },
    
    hide(skeleton) {
        if (skeleton) {
            skeleton.style.opacity = '0';
            setTimeout(() => skeleton.remove(), 300);
        }
    },
    
    getSkeletonHTML(type) {
        if (type === 'gallery') {
            return `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${Array(6).fill().map(() => `
                        <div class="bg-stone-100 rounded-sm overflow-hidden">
                            <div class="aspect-video skeleton-pulse bg-stone-200"></div>
                            <div class="p-4 space-y-2">
                                <div class="h-4 w-3/4 skeleton-pulse bg-stone-200 rounded"></div>
                                <div class="h-3 w-1/2 skeleton-pulse bg-stone-200 rounded"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        return '';
    }
};

// Loading Button States
const LoadingButton = {
    setLoading(button, isLoading) {
        if (isLoading) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-current inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
            `;
            button.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            button.innerHTML = button.dataset.originalText || 'Submit';
            button.disabled = false;
            button.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
};

// Offline Detection
const OfflineDetector = {
    init() {
        this.banner = this.createBanner();
        
        window.addEventListener('online', () => this.hideBanner());
        window.addEventListener('offline', () => this.showBanner());
        
        // Check initial state
        if (!navigator.onLine) {
            this.showBanner();
        }
    },
    
    createBanner() {
        const banner = document.createElement('div');
        banner.className = 'fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 z-[80] transform -translate-y-full transition-transform duration-300';
        banner.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <span>You're offline. Some features may not work.</span>
            </div>
        `;
        document.body.appendChild(banner);
        return banner;
    },
    
    showBanner() {
        this.banner.classList.remove('-translate-y-full');
    },
    
    hideBanner() {
        this.banner.classList.add('-translate-y-full');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ImageLoader.init();
    OfflineDetector.init();
});

// Export
window.LoadingButton = LoadingButton;
window.SkeletonScreen = SkeletonScreen;
