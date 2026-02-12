// Navigation Scroll Effect
const navbar = document.getElementById('navbar');
const navLinks = navbar.querySelectorAll('a, span');
const logoText = navbar.querySelector('.text-stone-800');
const mobileBtn = document.getElementById('mobile-menu-btn');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('nav-scrolled');
        navbar.classList.remove('py-6');
        navbar.classList.add('py-3');
        
        // Change text colors for visibility on light background
        navLinks.forEach(link => {
            if (link.classList.contains('text-stone-100')) {
                link.classList.remove('text-stone-100');
                link.classList.add('text-stone-800');
            }
        });
        
        if (mobileBtn) {
            mobileBtn.classList.remove('text-stone-100');
            mobileBtn.classList.add('text-stone-800');
        }
    } else {
        navbar.classList.remove('nav-scrolled');
        navbar.classList.remove('py-3');
        navbar.classList.add('py-6');
        
        // Revert text colors for dark background
        navLinks.forEach(link => {
            if (link.classList.contains('text-stone-800') && !link.closest('.bg-amber-900')) {
                link.classList.remove('text-stone-800');
                link.classList.add('text-stone-100');
            }
        });
        
        if (mobileBtn) {
            mobileBtn.classList.remove('text-stone-800');
            mobileBtn.classList.add('text-stone-100');
        }
    }
});

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Close mobile menu when clicking a link
mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
    });
});

// Intersection Observer for Scroll Animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
    observer.observe(el);
});

// Initialize Leaflet Map
document.addEventListener('DOMContentLoaded', () => {
    // Coordinates for Boranada Industrial Area, Jodhpur
    const lat = 26.2389;
    const lng = 73.0243;
    
    const map = L.map('map', {
        scrollWheelZoom: false,
        zoomControl: true
    }).setView([lat, lng], 15);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
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
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80; // Account for fixed nav
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Form handling (if you add a form later)
// Placeholder for future contact form functionality
const handleFormSubmit = (e) => {
    e.preventDefault();
    // Add form submission logic here
    console.log('Form submitted');
};
