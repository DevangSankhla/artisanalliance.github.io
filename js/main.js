// Utility: Throttle function for performance
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

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Navigation Elements
const navbar = document.getElementById('navbar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

// Navigation Scroll Effect with throttling
let lastScrollY = window.scrollY;
let ticking = false;

function updateNavbar() {
    const scrollY = window.scrollY;
    
    if (scrollY > 50) {
        navbar.classList.add('nav-scrolled');
        navbar.classList.remove('py-4', 'md:py-5', 'py-6');
        navbar.classList.add('py-3');
    } else {
        navbar.classList.remove('nav-scrolled');
        navbar.classList.remove('py-3');
        navbar.classList.add('py-4', 'md:py-5');
    }
    
    // Hide/show navbar on scroll direction (mobile)
    if (window.innerWidth <= 768) {
        if (scrollY > lastScrollY && scrollY > 100) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
    }
    
    lastScrollY = scrollY;
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(updateNavbar);
        ticking = true;
    }
}, { passive: true });

// Mobile Menu Toggle with overlay
let menuOverlay = null;

function createMenuOverlay() {
    menuOverlay = document.createElement('div');
    menuOverlay.className = 'mobile-menu-overlay';
    menuOverlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(menuOverlay);
    
    menuOverlay.addEventListener('click', closeMobileMenu);
}

function openMobileMenu() {
    if (!menuOverlay) createMenuOverlay();
    
    mobileMenu.classList.remove('hidden');
    menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    mobileMenuBtn.setAttribute('aria-expanded', 'true');
    
    // Focus first link for accessibility
    setTimeout(() => {
        const firstLink = mobileMenu.querySelector('a');
        if (firstLink) firstLink.focus();
    }, 100);
}

function closeMobileMenu() {
    mobileMenu.classList.add('hidden');
    if (menuOverlay) menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileMenuBtn.focus();
}

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        if (mobileMenu.classList.contains('hidden')) {
            openMobileMenu();
        } else {
            closeMobileMenu();
        }
    });
    
    // Close mobile menu when clicking a link
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
            closeMobileMenu();
        }
    });
}

// Intersection Observer for Scroll Animations with better performance
const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Add staggered delay for child elements if they exist
            const children = entry.target.querySelectorAll('.stagger-child');
            if (children.length > 0) {
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.classList.add('revealed');
                    }, index * 100);
                });
            }
            
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        observer.observe(el);
    });
});

// Initialize Leaflet Map with error handling
document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('map');
    if (!mapElement || typeof L === 'undefined') return;
    
    try {
        // Coordinates for Boranada Industrial Area, Jodhpur
        const lat = 26.2389;
        const lng = 73.0243;
        
        const map = L.map('map', {
            scrollWheelZoom: false,
            zoomControl: true
        }).setView([lat, lng], 15);
        
        // Add OpenStreetMap tiles with error handling
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            crossOrigin: true
        }).addTo(map);
        
        // Custom icon
        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: #92400e; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
        
        // Add marker
        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        
        // Add popup
        marker.bindPopup(`
            <div style="text-align: center; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; color: #92400e; font-family: serif; font-size: 1.2rem; font-weight: 600;">Artisan Alliance</h3>
                <p style="margin: 0; color: #57534e; font-size: 0.9rem; line-height: 1.4;">
                    G-134-135 III Phase<br>
                    Boranada Industrial Area<br>
                    Jodhpur, Rajasthan
                </p>
            </div>
        `).openPopup();
        
        // Smooth zoom animation on load
        setTimeout(() => {
            map.flyTo([lat, lng], 16, {
                duration: 2,
                easeLinearity: 0.25
            });
        }, 1000);
        
        // Handle window resize
        window.addEventListener('resize', debounce(() => {
            map.invalidateSize();
        }, 250));
        
    } catch (error) {
        console.error('Map initialization error:', error);
        mapElement.innerHTML = '<div class="flex items-center justify-center h-full text-stone-500">Map loading error. Please refresh.</div>';
    }
});

// Smooth scroll for anchor links with offset calculation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const navHeight = navbar ? navbar.offsetHeight : 80;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Update URL without jumping
            history.pushState(null, '', href);
        }
    });
});

// Scroll to Top Button
function initScrollToTop() {
    const scrollBtn = document.createElement('button');
    scrollBtn.className = 'scroll-to-top';
    scrollBtn.setAttribute('aria-label', 'Scroll to top');
    scrollBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 15l-6-6-6 6"/>
        </svg>
    `;
    document.body.appendChild(scrollBtn);
    
    // Show/hide button based on scroll position
    function toggleScrollButton() {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }
    
    window.addEventListener('scroll', throttle(toggleScrollButton, 100), { passive: true });
    
    // Scroll to top on click
    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Initialize scroll to top button
document.addEventListener('DOMContentLoaded', initScrollToTop);

// Gallery Auto-Scroll Enhancement with touch support
document.addEventListener('DOMContentLoaded', () => {
    const galleryTrack = document.getElementById('galleryTrack');
    const gallerySlider = document.querySelector('.gallery-slider');
    
    if (!galleryTrack || !gallerySlider) return;
    
    let isHovered = false;
    let touchStartX = 0;
    let touchEndX = 0;
    
    // Mouse interactions
    gallerySlider.addEventListener('mouseenter', () => {
        isHovered = true;
        galleryTrack.style.animationPlayState = 'paused';
    });
    
    gallerySlider.addEventListener('mouseleave', () => {
        isHovered = false;
        galleryTrack.style.animationPlayState = 'running';
    });
    
    // Touch interactions for mobile swipe
    gallerySlider.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        galleryTrack.style.animationPlayState = 'paused';
    }, { passive: true });
    
    gallerySlider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
        galleryTrack.style.animationPlayState = 'running';
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            // Could implement manual slide navigation here
            // For now, just let the animation continue
        }
    }
    
    // Pause when tab is not visible (performance)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            galleryTrack.style.animationPlayState = 'paused';
        } else if (!isHovered) {
            galleryTrack.style.animationPlayState = 'running';
        }
    });
});

// Lazy load images that are below the fold
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px'
    });
    
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    });
}

// Form validation helper
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

// Handle offline/online status
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
});

// Preload critical resources
function preloadResources() {
    const criticalImages = [
        'assets/logo.png'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Preload on DOM ready
document.addEventListener('DOMContentLoaded', preloadResources);
