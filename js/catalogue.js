// Catalogue Application
const catalogueApp = {
    CORRECT_PASSWORD: 'ArtisanCatalogue1999-26',
    isLoggedIn: false,
    touchStartY: 0,

    init() {
        this.setupEventListeners();
        this.checkLoginStatus();
        this.setupMobileOptimizations();
    },

    // Check if user is already logged in (session storage)
    checkLoginStatus() {
        const loggedIn = sessionStorage.getItem('catalogueLoggedIn');
        if (loggedIn === 'true') {
            this.isLoggedIn = true;
            this.showCatalogue();
        }
    },

    // Mobile-specific optimizations
    setupMobileOptimizations() {
        // Prevent zoom on input focus (iOS)
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                document.body.classList.add('input-focused');
            });
            input.addEventListener('blur', () => {
                document.body.classList.remove('input-focused');
            });
        });

        // Touch swipe handling for modals
        const modals = document.querySelectorAll('[id$="-modal"]');
        modals.forEach(modal => {
            modal.addEventListener('touchstart', (e) => {
                this.touchStartY = e.touches[0].clientY;
            }, { passive: true });

            modal.addEventListener('touchmove', (e) => {
                const touchY = e.touches[0].clientY;
                const diff = this.touchStartY - touchY;
                
                // Close modal on swipe down
                if (diff < -100 && modal.scrollTop === 0) {
                    this.closeModal(modal.id);
                }
            }, { passive: true });
        });

        // Double-tap to zoom prevention
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    },

    // Show password modal
    showPasswordModal() {
        this.openModal('password-modal');
        // Delay focus to allow transition
        setTimeout(() => {
            const input = document.getElementById('catalogue-password');
            if (input) {
                input.focus();
                // Position modal properly on mobile
                if (window.innerWidth <= 768) {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
    },

    // Verify password
    verifyPassword() {
        const passwordInput = document.getElementById('catalogue-password');
        const errorEl = document.getElementById('password-error');
        const enteredPassword = passwordInput.value.trim();

        if (enteredPassword === this.CORRECT_PASSWORD) {
            this.isLoggedIn = true;
            sessionStorage.setItem('catalogueLoggedIn', 'true');
            errorEl.classList.add('hidden');
            passwordInput.value = '';
            this.closeModal('password-modal');
            this.showCatalogue();
        } else {
            errorEl.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }
    },

    // Show catalogue content
    showCatalogue() {
        document.getElementById('options-section').classList.add('hidden');
        document.getElementById('request-form-section').classList.add('hidden');
        document.getElementById('catalogue-content').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Show request form
    showRequestForm() {
        document.getElementById('options-section').classList.add('hidden');
        document.getElementById('catalogue-content').classList.add('hidden');
        document.getElementById('request-form-section').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Show main options
    showOptions() {
        document.getElementById('catalogue-content').classList.add('hidden');
        document.getElementById('request-form-section').classList.add('hidden');
        document.getElementById('options-section').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Logout
    logout() {
        this.isLoggedIn = false;
        sessionStorage.removeItem('catalogueLoggedIn');
        this.showOptions();
    },

    // Modal helpers with accessibility
    openModal(id) {
        const modal = document.getElementById(id);
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        modal.setAttribute('aria-hidden', 'false');
        
        // Trap focus within modal
        this.trapFocus(modal);
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        modal.setAttribute('aria-hidden', 'true');
        
        // Clear error message when closing
        if (id === 'password-modal') {
            document.getElementById('password-error').classList.add('hidden');
            document.getElementById('catalogue-password').value = '';
        }
    },

    // Focus trap for accessibility
    trapFocus(element) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        element.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        });

        if (firstFocusable) {
            firstFocusable.focus();
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Password input - submit on Enter key
        document.getElementById('catalogue-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.verifyPassword();
            }
        });

        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ['password-modal'].forEach(id => {
                    this.closeModal(id);
                });
            }
        });

        // Close modal when clicking outside
        document.getElementById('password-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'password-modal') {
                this.closeModal('password-modal');
            }
        });

        // Mobile menu toggle
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => {
                const isHidden = mobileMenu.classList.contains('hidden');
                if (isHidden) {
                    mobileMenu.classList.remove('hidden');
                    mobileBtn.setAttribute('aria-expanded', 'true');
                } else {
                    mobileMenu.classList.add('hidden');
                    mobileBtn.setAttribute('aria-expanded', 'false');
                }
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                    mobileBtn.setAttribute('aria-expanded', 'false');
                }
            });
            
            // Close menu when clicking a link
            mobileMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    mobileMenu.classList.add('hidden');
                    mobileBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }

        // Form submission handling with better UX
        const form = document.getElementById('catalogue-request-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                // Validate before submitting
                const email = form.querySelector('#user-email').value;
                if (!this.isValidEmail(email)) {
                    alert('Please enter a valid email address');
                    form.querySelector('#user-email').focus();
                    return;
                }
                
                // Show loading state
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
                submitBtn.innerHTML = `
                    <svg class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                `;

                try {
                    const formData = new FormData(form);
                    const response = await fetch(form.action, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    if (response.ok) {
                        // Show success message
                        form.classList.add('hidden');
                        document.getElementById('form-success').classList.remove('hidden');
                        form.reset();
                        
                        // Scroll to success message on mobile
                        if (window.innerWidth <= 768) {
                            document.getElementById('form-success').scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        throw new Error('Form submission failed');
                    }
                } catch (error) {
                    console.error('Error submitting form:', error);
                    alert('There was an error sending your request. Please try again or email us directly at arvind@artisanalliance.in');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('loading');
                    submitBtn.innerHTML = originalText;
                }
            });
        }

        // Handle visibility change (pause/resume)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Save any form data
                const form = document.getElementById('catalogue-request-form');
                if (form) {
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData);
                    sessionStorage.setItem('catalogueFormDraft', JSON.stringify(data));
                }
            }
        });

        // Restore form data if exists
        const savedDraft = sessionStorage.getItem('catalogueFormDraft');
        if (savedDraft) {
            const form = document.getElementById('catalogue-request-form');
            if (form) {
                const data = JSON.parse(savedDraft);
                Object.keys(data).forEach(key => {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) input.value = data[key];
                });
            }
        }
    },

    // Email validation helper
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    catalogueApp.init();
});

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.body.classList.add('page-hidden');
    } else {
        document.body.classList.remove('page-hidden');
    }
});
