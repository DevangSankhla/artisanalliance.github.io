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
const navBrandText = document.getElementById('nav-brand-text');
const navLinks = document.querySelectorAll('.nav-link');

// Check if we're on the home page (has hero gallery)
const isHomePage = document.querySelector('.gallery-slider') !== null;

// Debug logging
console.log('Main.js loaded', { isHomePage, navbar: !!navbar, mobileMenuBtn: !!mobileMenuBtn, mobileMenu: !!mobileMenu });

// Navigation Scroll Effect with throttling
let lastScrollY = window.scrollY;
let ticking = false;

function updateNavbar() {
    if (!navbar) return;
    const scrollY = window.scrollY;
    
    if (scrollY > 50) {
        navbar.classList.add('nav-scrolled');
        navbar.classList.remove('py-4', 'md:py-5', 'py-6');
        navbar.classList.add('py-3');
        
        // Change text colors to dark when scrolled (for home page)
        if (isHomePage) {
            if (navBrandText) {
                navBrandText.classList.remove('text-stone-100');
                navBrandText.classList.add('text-stone-800');
            }
            navLinks.forEach(link => {
                link.classList.remove('text-stone-100', 'hover:text-amber-400');
                link.classList.add('text-stone-800', 'hover:text-amber-900');
            });
            if (mobileMenuBtn) {
                mobileMenuBtn.classList.remove('text-stone-100');
                mobileMenuBtn.classList.add('text-stone-800');
            }
        }
    } else {
        navbar.classList.remove('nav-scrolled');
        navbar.classList.remove('py-3');
        navbar.classList.add('py-4', 'md:py-5');
        
        // Change text colors back to white when at top (for home page)
        if (isHomePage) {
            if (navBrandText) {
                navBrandText.classList.remove('text-stone-800');
                navBrandText.classList.add('text-stone-100');
            }
            navLinks.forEach(link => {
                link.classList.remove('text-stone-800', 'hover:text-amber-900');
                link.classList.add('text-stone-100', 'hover:text-amber-400');
            });
            if (mobileMenuBtn) {
                mobileMenuBtn.classList.remove('text-stone-800');
                mobileMenuBtn.classList.add('text-stone-100');
            }
        }
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

// Initial navbar state on page load
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});

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
    console.log('Mobile menu initialized');
    mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
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
} else {
    console.warn('Mobile menu elements not found', { mobileMenuBtn: !!mobileMenuBtn, mobileMenu: !!mobileMenu });
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
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    console.log('Reveal elements found:', revealElements.length);
    revealElements.forEach((el) => {
        observer.observe(el);
    });
});

// Initialize Leaflet Map with error handling
document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.log('Map element not found on this page');
        return;
    }
    if (typeof L === 'undefined') {
        console.warn('Leaflet library not loaded');
        mapElement.innerHTML = '<div class="flex items-center justify-center h-full text-stone-500">Map library loading...</div>';
        return;
    }
    
    try {
        // Coordinates for Artisan Alliance - Boranada Industrial Area, Jodhpur
        const lat = 26.1757775;
        const lng = 72.9224947;
        
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

// Scroll Progress Bar
function updateScrollProgress() {
    const scrollProgress = document.getElementById('scroll-progress');
    if (!scrollProgress) return;
    
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    scrollProgress.style.width = scrollPercent + '%';
}

window.addEventListener('scroll', throttle(updateScrollProgress, 50), { passive: true });

// Active Page Indicator
function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage || 
            (currentPage === '' && linkHref === 'index.html') ||
            (currentPage === 'index.html' && linkHref === 'index.html')) {
            link.classList.add('text-amber-600', 'border-b-2', 'border-amber-600');
        }
    });
}

setActiveNavLink();

// Page Transition Animation
window.addEventListener('beforeunload', () => {
    document.body.classList.add('opacity-0', 'transition-opacity', 'duration-300');
});

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.remove('opacity-0');
    document.body.classList.add('opacity-100', 'transition-opacity', 'duration-500');
});

// Hero Gallery Swipe Gestures for Mobile
(function setupHeroGallerySwipe() {
    const track = document.getElementById('galleryTrack');
    if (!track) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    track.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    track.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped left - next image
                track.style.transform = 'translateX(-100%)';
            } else {
                // Swiped right - previous image
                track.style.transform = 'translateX(100%)';
            }
            // Reset after animation
            setTimeout(() => {
                track.style.transform = '';
            }, 300);
        }
    }
})();

// Touch Ripple Effect
function createRipple(event) {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.classList.add('ripple');
    
    const ripple = button.querySelector('.ripple');
    if (ripple) {
        ripple.remove();
    }
    
    button.appendChild(circle);
}

// Add ripple to all buttons
document.querySelectorAll('button, a').forEach(btn => {
    btn.addEventListener('click', createRipple);
});

// Pull-to-Refresh functionality
(function setupPullToRefresh() {
    let touchStartY = 0;
    let touchEndY = 0;
    const minPullDistance = 150;
    
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (window.scrollY === 0 && touchStartY > 0) {
            touchEndY = e.touches[0].clientY;
            const pullDistance = touchEndY - touchStartY;
            
            if (pullDistance > 0 && pullDistance < minPullDistance) {
                document.body.style.transform = `translateY(${pullDistance * 0.4}px)`;
            }
        }
    }, { passive: true });
    
    document.addEventListener('touchend', () => {
        const pullDistance = touchEndY - touchStartY;
        document.body.style.transform = '';
        document.body.style.transition = 'transform 0.3s ease';
        
        if (pullDistance > minPullDistance) {
            // Show refresh indicator
            location.reload();
        }
        
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
        
        touchStartY = 0;
        touchEndY = 0;
    }, { passive: true });
})();

// Floating Action Button for Quick Contact
(function addFloatingActionButton() {
    if (window.innerWidth > 768) return; // Only mobile
    
    const fab = document.createElement('a');
    fab.href = 'https://wa.me/919829024724';
    fab.className = 'fixed bottom-20 right-4 bg-green-500 text-white rounded-full p-4 shadow-lg z-50 flex items-center justify-center hover:bg-green-600 transition-colors md:hidden';
    fab.innerHTML = `
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    `;
    fab.setAttribute('aria-label', 'Chat on WhatsApp');
    fab.setAttribute('target', '_blank');
    fab.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(fab);
})();
