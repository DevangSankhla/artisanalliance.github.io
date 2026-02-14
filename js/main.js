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

// Gallery Auto-Scroll Enhancement
document.addEventListener('DOMContentLoaded', () => {
    const galleryTrack = document.getElementById('galleryTrack');
    
    if (galleryTrack) {
        // Smooth scroll behavior
        let isHovered = false;
        const gallerySlider = document.querySelector('.gallery-slider');
        
        gallerySlider.addEventListener('mouseenter', () => {
            isHovered = true;
            galleryTrack.style.animationPlayState = 'paused';
        });
        
        gallerySlider.addEventListener('mouseleave', () => {
            isHovered = false;
            galleryTrack.style.animationPlayState = 'running';
        });
        
        // Optional: Add click to pause/play functionality
        gallerySlider.addEventListener('click', () => {
            if (galleryTrack.style.animationPlayState === 'paused') {
                galleryTrack.style.animationPlayState = 'running';
            } else {
                galleryTrack.style.animationPlayState = 'paused';
            }
        });
    }
});
