// Form Auto-Save to localStorage
const FormAutoSave = {
    init() {
        document.querySelectorAll('form').forEach(form => {
            this.setupAutoSave(form);
            this.restoreFormData(form);
        });
    },
    
    setupAutoSave(form) {
        const formId = form.id || form.action;
        if (!formId) return;
        
        form.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => {
                    data[key] = value;
                });
                localStorage.setItem(`form_autosave_${formId}`, JSON.stringify(data));
            }
        });
        
        // Clear on successful submit
        form.addEventListener('submit', () => {
            localStorage.removeItem(`form_autosave_${formId}`);
        });
    },
    
    restoreFormData(form) {
        const formId = form.id || form.action;
        if (!formId) return;
        
        const saved = localStorage.getItem(`form_autosave_${formId}`);
        if (saved) {
            const data = JSON.parse(saved);
            Object.entries(data).forEach(([key, value]) => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input && !input.value) {
                    input.value = value;
                    input.classList.add('bg-amber-50');
                }
            });
        }
    }
};

// Inline Validation
const InlineValidation = {
    init() {
        document.querySelectorAll('input[type="email"]').forEach(input => {
            this.setupEmailValidation(input);
        });
        
        document.querySelectorAll('input[type="tel"]').forEach(input => {
            this.setupPhoneValidation(input);
        });
    },
    
    setupEmailValidation(input) {
        input.addEventListener('blur', () => {
            const email = input.value;
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            this.showValidation(input, isValid, 'Please enter a valid email address');
        });
    },
    
    setupPhoneValidation(input) {
        input.addEventListener('blur', () => {
            const phone = input.value.replace(/\D/g, '');
            const isValid = phone.length >= 10;
            this.showValidation(input, isValid, 'Please enter a valid phone number');
        });
    },
    
    showValidation(input, isValid, message) {
        let feedback = input.parentElement.querySelector('.validation-feedback');
        if (!feedback) {
            feedback = document.createElement('span');
            feedback.className = 'validation-feedback text-sm mt-1 block';
            input.parentElement.appendChild(feedback);
        }
        
        if (input.value === '') {
            feedback.textContent = '';
            input.classList.remove('border-red-500', 'border-green-500');
        } else if (isValid) {
            feedback.textContent = '✓ Valid';
            feedback.className = 'validation-feedback text-sm mt-1 block text-green-600';
            input.classList.remove('border-red-500');
            input.classList.add('border-green-500');
        } else {
            feedback.textContent = message;
            feedback.className = 'validation-feedback text-sm mt-1 block text-red-600';
            input.classList.remove('border-green-500');
            input.classList.add('border-red-500');
        }
    }
};

// Password Visibility Toggle
function setupPasswordToggles() {
    document.querySelectorAll('input[type="password"]').forEach(input => {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none';
        toggle.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
        `;
        toggle.setAttribute('aria-label', 'Toggle password visibility');
        
        toggle.addEventListener('click', () => {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            toggle.innerHTML = type === 'password' ? `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
            ` : `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.059 10.059 0 013.999-5.319m3.286-1.714A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.059 10.059 0 01-3.214 4.843M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"></path>
                </svg>
            `;
        });
        
        wrapper.appendChild(toggle);
    });
}

// Character Counter for Textareas
function setupCharacterCounters() {
    document.querySelectorAll('textarea[maxlength]').forEach(textarea => {
        const maxLength = textarea.getAttribute('maxlength');
        const counter = document.createElement('div');
        counter.className = 'text-xs text-stone-500 mt-1 text-right';
        counter.textContent = `0 / ${maxLength}`;
        textarea.parentNode.appendChild(counter);
        
        textarea.addEventListener('input', () => {
            const current = textarea.value.length;
            counter.textContent = `${current} / ${maxLength}`;
            if (current > maxLength * 0.9) {
                counter.classList.add('text-red-600');
            } else {
                counter.classList.remove('text-red-600');
            }
        });
    });
}

// Toast Notification System
const Toast = {
    container: null,
    
    init() {
        this.container = document.createElement('div');
        this.container.className = 'fixed top-4 right-4 z-[70] space-y-2';
        document.body.appendChild(this.container);
    },
    
    show(message, type = 'info', duration = 3000) {
        if (!this.container) this.init();
        
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-amber-600',
            warning: 'bg-yellow-500'
        };
        
        toast.className = `${colors[type]} text-white px-6 py-3 rounded-sm shadow-lg transform translate-x-full transition-transform duration-300 flex items-center space-x-2`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="ml-2 hover:opacity-80" onclick="this.parentElement.remove()">×</button>
        `;
        
        this.container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });
        
        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// Initialize all form enhancements
document.addEventListener('DOMContentLoaded', () => {
    FormAutoSave.init();
    InlineValidation.init();
    setupPasswordToggles();
    setupCharacterCounters();
    Toast.init();
});

// Export for global access
window.Toast = Toast;
