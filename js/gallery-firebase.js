// Firebase Configuration 
const firebaseConfig = {
    apiKey: "AIzaSyApNYKCyxitXvn3B3oni_2e36mgwIDYn6c",
    authDomain: "artisan-alliance-gallery.firebaseapp.com",
    projectId: "artisan-alliance-gallery",
    storageBucket: "artisan-alliance-gallery.firebasestorage.app",
    messagingSenderId: "977086324856",
    appId: "1:977086324856:web:7ba62a3d5b10117c4b0d8d"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.error('Firebase initialization error:', error);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Gallery Application
const galleryApp = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'],
    
    galleries: [],
    currentGallery: null,
    selectedFiles: [],
    editSelectedFiles: [],
    currentUser: null,
    currentLightboxIndex: 0,
    currentLightboxGallery: null,
    touchStartX: 0,
    touchStartY: 0,

    init() {
        this.setupAuthListener();
        this.setupEventListeners();
        this.setupMobileOptimizations();
    },

    // Mobile-specific optimizations
    setupMobileOptimizations() {
        // Improve touch responsiveness
        document.addEventListener('touchstart', () => {}, { passive: true });
        
        // Handle iOS viewport issues
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
        });

        // Lightbox touch gestures
        const lightbox = document.getElementById('lightbox');
        if (lightbox) {
            lightbox.addEventListener('touchstart', (e) => {
                this.touchStartX = e.changedTouches[0].screenX;
                this.touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });

            lightbox.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].screenX;
                const touchEndY = e.changedTouches[0].screenY;
                const diffX = this.touchStartX - touchEndX;
                const diffY = this.touchStartY - touchEndY;

                // Horizontal swipe for navigation
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                        this.nextImage();
                    } else {
                        this.prevImage();
                    }
                }
                // Vertical swipe down to close
                else if (diffY < -100 && Math.abs(diffY) > Math.abs(diffX)) {
                    this.closeLightbox();
                }
            }, { passive: true });
        }
    },

    // Show create modal
    showCreateModal() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }
        this.openModal('create-modal');
        setTimeout(() => {
            const input = document.getElementById('gallery-name-input');
            if (input) {
                input.focus();
                if (window.innerWidth <= 768) {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
    },

    // Auth State Listener
    setupAuthListener() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUI();
            
            if (user) {
                this.loadGalleries();
            } else {
                this.showPublicGalleries();
            }
        }, (error) => {
            console.error('Auth state error:', error);
            this.showPublicGalleries();
        });
    },

   // Update UI based on auth state
    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const createGalleryBtn = document.getElementById('create-gallery-btn');
        const uploadBtn = document.getElementById('upload-btn');
        const authBar = document.getElementById('auth-bar');
        
        if (this.currentUser) {
            loginBtn?.classList.add('hidden');
            authBar?.classList.remove('hidden');
            
            // Show Create Gallery if no galleries, else show Upload
            if (this.galleries.length === 0) {
                createGalleryBtn?.classList.remove('hidden');
                if (createGalleryBtn) createGalleryBtn.style.display = 'inline-flex';
                uploadBtn?.classList.add('hidden');
            } else {
                createGalleryBtn?.classList.add('hidden');
                uploadBtn?.classList.remove('hidden');
                if (uploadBtn) uploadBtn.style.display = 'inline-flex';
            }
        } else {
            loginBtn?.classList.remove('hidden');
            createGalleryBtn?.classList.add('hidden');
            if (createGalleryBtn) createGalleryBtn.style.display = 'none';
            uploadBtn?.classList.add('hidden');
            if (uploadBtn) uploadBtn.style.display = 'none';
            authBar?.classList.add('hidden');
        }
    },

    // Login
    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        
        try {
            await auth.signInWithEmailAndPassword(email, password);
            this.closeModal('login-modal');
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
            errorEl?.classList.add('hidden');
        } catch (error) {
            if (errorEl) {
                errorEl.textContent = this.getFriendlyError(error.code) || error.message;
                errorEl.classList.remove('hidden');
            }
            // Haptic feedback on error
            if (navigator.vibrate) navigator.vibrate(50);
        }
    },

    // Get user-friendly error messages
    getFriendlyError(code) {
        const errors = {
            'auth/invalid-email': 'Please enter a valid email address',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/invalid-credential': 'Invalid email or password',
            'auth/too-many-requests': 'Too many attempts. Please try again later'
        };
        return errors[code];
    },

    // Logout
    async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    // Show login modal
    showLoginModal() {
        this.openModal('login-modal');
        setTimeout(() => {
            const input = document.getElementById('login-email');
            if (input) {
                input.focus();
                if (window.innerWidth <= 768) {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
    },

    // Load galleries from Firestore
    async loadGalleries() {
        document.getElementById('loading-state')?.classList.remove('hidden');
        document.getElementById('gallery-content')?.classList.add('hidden');
        
        try {
            const snapshot = await db.collection('galleries').orderBy('createdAt', 'desc').get();
            
            this.galleries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderGalleries();
            this.updateUI();
        } catch (error) {
            console.error('Error loading galleries:', error);
            this.showError('Error loading galleries. Please try again.');
        }
    },

    // Show public galleries (for non-logged in users)
    async showPublicGalleries() {
        document.getElementById('loading-state')?.classList.remove('hidden');
        document.getElementById('gallery-content')?.classList.add('hidden');
        
        try {
            const snapshot = await db.collection('galleries').orderBy('createdAt', 'desc').get();
            
            this.galleries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderGalleries();
        } catch (error) {
            console.error('Error loading galleries:', error);
            document.getElementById('loading-state')?.classList.add('hidden');
            document.getElementById('gallery-content')?.classList.remove('hidden');
        }
    },

    // Render galleries with lazy loading for images
    renderGalleries() {
        document.getElementById('loading-state')?.classList.add('hidden');
        document.getElementById('gallery-content')?.classList.remove('hidden');
        
        const count = document.getElementById('gallery-count');
        if (count) count.textContent = `${this.galleries.length} collection${this.galleries.length !== 1 ? 's' : ''}`;
        
        const container = document.getElementById('galleries-container');
        const emptyState = document.getElementById('empty-state');
        
        if (!container) return;
        
        if (this.galleries.length === 0) {
            container.innerHTML = '';
            emptyState?.classList.remove('hidden');
            return;
        }
        
        emptyState?.classList.add('hidden');
        
        container.innerHTML = this.galleries.map(gallery => {
            const mediaCount = gallery.media ? gallery.media.length : 0;
            
            return `
                <div class="gallery-section">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3">
                        <div>
                            <h2 class="text-2xl md:text-3xl font-serif text-stone-900">${gallery.name}</h2>
                            <p class="text-stone-600 mt-1 text-sm md:text-base">${mediaCount} item${mediaCount !== 1 ? 's' : ''}</p>
                        </div>
                        ${this.currentUser ? `
                            <div class="flex flex-wrap gap-2 md:gap-3">
                                <button onclick="galleryApp.showEditModal('${gallery.id}')" class="px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base text-amber-900 border border-amber-900 rounded-sm hover:bg-amber-50 transition-colors touch-target">
                                    Edit Gallery
                                </button>
                                <button onclick="galleryApp.deleteGallery('${gallery.id}')" class="px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base text-red-700 border border-red-700 rounded-sm hover:bg-red-50 transition-colors touch-target">
                                    Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${mediaCount === 0 ? `
                        <div class="text-center py-8 md:py-12 bg-stone-100 rounded-sm">
                            <p class="text-stone-600 text-sm md:text-base">No media in this gallery yet</p>
                            ${this.currentUser ? '<p class="text-stone-500 text-xs md:text-sm mt-2">Click "Edit Gallery" to add files</p>' : ''}
                        </div>
                    ` : `
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
                            ${gallery.media.map((item, index) => `
                                <div class="gallery-item cursor-pointer touch-target" onclick="galleryApp.openLightbox('${gallery.id}', ${index})">
                                    ${item.type === 'video' ? `
                                        <video src="${item.src}" class="w-full h-full object-cover" preload="metadata" loading="lazy" playsinline muted></video>
                                        <div class="video-badge">
                                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                                            </svg>
                                            Video
                                        </div>
                                    ` : `
                                        <img src="${item.src}" alt="${item.name}" loading="lazy" class="w-full h-full object-cover" decoding="async">
                                    `}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;
        }).join('');
        
        // Observe images for lazy loading
        this.setupLazyLoading();
    },

    // Setup lazy loading for images
    setupLazyLoading() {
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
            }, { rootMargin: '50px' });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    },

    // Create gallery
    async createGallery() {
        const nameInput = document.getElementById('gallery-name-input');
        const name = nameInput?.value.trim();
        
        if (!name) {
            this.showError('Please enter a gallery name');
            return;
        }
        
        try {
            await db.collection('galleries').add({
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                media: []
            });
            
            this.closeModal('create-modal');
            nameInput.value = '';
            await this.loadGalleries();
        } catch (error) {
            console.error('Error creating gallery:', error);
            this.showError('Error creating gallery. Please try again.');
        }
    },

    // Show upload modal
    showUploadModal() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }
        
        this.openModal('upload-modal');
        
        // Populate gallery select
        const select = document.getElementById('gallery-select');
        if (select) {
            select.innerHTML = '<option value="">Choose a gallery...</option>' + 
                this.galleries.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }
        
        // Reset form
        this.selectedFiles = [];
        document.getElementById('file-input').value = '';
        document.getElementById('file-preview')?.classList.add('hidden');
        document.getElementById('upload-progress')?.classList.add('hidden');
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) progressBar.style.width = '0%';
    },

    // Handle file selection with validation
    handleFileSelect(files) {
        this.selectedFiles = Array.from(files).filter(file => {
            if (!this.ALLOWED_TYPES.includes(file.type)) {
                this.showError(`${file.name} is not a supported file type`);
                return false;
            }
            if (file.size > this.MAX_FILE_SIZE) {
                this.showError(`${file.name} is too large (max 10MB)`);
                return false;
            }
            return true;
        });
        
        if (this.selectedFiles.length > 0) {
            this.renderFileList();
            document.getElementById('file-preview')?.classList.remove('hidden');
        }
    },

    // Render file list
    renderFileList() {
        const list = document.getElementById('file-list');
        if (!list) return;
        
        list.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="file-list-item">
                <div class="flex items-center flex-1 min-w-0">
                    <svg class="w-4 h-4 md:w-5 md:h-5 text-stone-500 flex-shrink-0 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${file.type.startsWith('video/') ? 
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>' :
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>'
                        }
                    </svg>
                    <div class="flex-1 min-w-0">
                        <div class="file-name text-xs md:text-sm truncate">${file.name}</div>
                        <div class="file-size text-xs">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                </div>
                <button onclick="galleryApp.removeFile(${index})" class="text-red-600 hover:text-red-700 ml-2 p-2 touch-target" aria-label="Remove file">
                    <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    },

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderFileList();
        
        if (this.selectedFiles.length === 0) {
            document.getElementById('file-preview')?.classList.add('hidden');
        }
    },

    // Upload files with progress
    async uploadFiles() {
        const galleryId = document.getElementById('gallery-select')?.value;
        
        if (!galleryId) {
            this.showError('Please select a gallery');
            return;
        }
        
        if (this.selectedFiles.length === 0) {
            this.showError('Please select files to upload');
            return;
        }
        
        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;
        
        // Show progress
        document.getElementById('upload-progress')?.classList.remove('hidden');
        const submitBtn = document.getElementById('upload-submit-btn');
        if (submitBtn) submitBtn.disabled = true;
        
        const newMedia = [];
        
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const progress = Math.round(((i + 1) / this.selectedFiles.length) * 100);
            
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            
            if (progressBar) progressBar.style.width = `${progress}%`;
            if (progressText) progressText.textContent = `Uploading ${i + 1} of ${this.selectedFiles.length}...`;
            
            try {
                const storageRef = storage.ref(`galleries/${galleryId}/${Date.now()}_${file.name}`);
                const uploadTask = await storageRef.put(file);
                const downloadURL = await uploadTask.ref.getDownloadURL();
                
                newMedia.push({
                    id: Date.now().toString() + i,
                    type: file.type.startsWith('video/') ? 'video' : 'image',
                    src: downloadURL,
                    name: file.name,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    storagePath: storageRef.fullPath
                });
            } catch (error) {
                console.error('Error uploading file:', error);
                this.showError(`Error uploading ${file.name}. Please try again.`);
            }
        }
        
        try {
            await db.collection('galleries').doc(galleryId).update({
                media: firebase.firestore.FieldValue.arrayUnion(...newMedia)
            });
            
            this.closeModal('upload-modal');
            this.selectedFiles = [];
            document.getElementById('file-input').value = '';
            if (submitBtn) submitBtn.disabled = false;
            
            await this.loadGalleries();
            this.showSuccess('Files uploaded successfully!');
        } catch (error) {
            console.error('Error updating gallery:', error);
            this.showError('Error saving to database. Please try again.');
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    // Delete gallery with confirmation
    async deleteGallery(galleryId) {
        if (!confirm('Are you sure you want to delete this gallery? This action cannot be undone.')) {
            return;
        }
        
        try {
            const gallery = this.galleries.find(g => g.id === galleryId);
            
            // Delete all media files from storage
            if (gallery?.media?.length > 0) {
                for (const item of gallery.media) {
                    try {
                        if (item.storagePath) {
                            const fileRef = storage.ref(item.storagePath);
                            await fileRef.delete();
                        }
                    } catch (error) {
                        console.error('Error deleting file:', error);
                    }
                }
            }
            
            // Delete the gallery document
            await db.collection('galleries').doc(galleryId).delete();
            await this.loadGalleries();
            this.showSuccess('Gallery deleted successfully');
        } catch (error) {
            console.error('Error deleting gallery:', error);
            this.showError('Error deleting gallery. Please try again.');
        }
    },

    // Show edit modal
    async showEditModal(galleryId) {
        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;
        
        this.currentGallery = galleryId;
        const titleEl = document.getElementById('edit-gallery-title');
        if (titleEl) titleEl.textContent = `Edit: ${gallery.name}`;
        
        this.renderEditMedia(gallery);
        this.editSelectedFiles = [];
        document.getElementById('edit-file-input').value = '';
        document.getElementById('edit-file-list')?.classList.add('hidden');
        document.getElementById('edit-upload-btn')?.classList.add('hidden');
        
        this.openModal('edit-modal');
    },

    renderEditMedia(gallery) {
        const grid = document.getElementById('edit-media-grid');
        if (!grid) return;
        
        if (!gallery.media || gallery.media.length === 0) {
            grid.innerHTML = '<p class="text-stone-600 col-span-full text-center py-8 text-sm md:text-base">No media in this gallery</p>';
            return;
        }
        
        grid.innerHTML = gallery.media.map((item, index) => `
            <div class="edit-gallery-item">
                ${item.type === 'video' ? `
                    <video src="${item.src}" class="w-full h-full object-cover" preload="metadata" playsinline muted></video>
                ` : `
                    <img src="${item.src}" alt="${item.name}" class="w-full h-full object-cover" loading="lazy" decoding="async">
                `}
                <button class="delete-btn touch-target" onclick="galleryApp.deleteMedia('${gallery.id}', '${item.id}')" aria-label="Delete media">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    },

    // Delete media item
    async deleteMedia(galleryId, mediaId) {
        if (!confirm('Delete this item?')) return;
        
        try {
            const gallery = this.galleries.find(g => g.id === galleryId);
            const mediaItem = gallery.media.find(m => m.id === mediaId);
            
            if (mediaItem?.storagePath) {
                const fileRef = storage.ref(mediaItem.storagePath);
                await fileRef.delete();
            }
            
            await db.collection('galleries').doc(galleryId).update({
                media: firebase.firestore.FieldValue.arrayRemove(mediaItem)
            });
            
            await this.loadGalleries();
            
            const updatedGallery = this.galleries.find(g => g.id === galleryId);
            if (updatedGallery) {
                this.renderEditMedia(updatedGallery);
            }
        } catch (error) {
            console.error('Error deleting media:', error);
            this.showError('Error deleting item. Please try again.');
        }
    },

    // Handle edit file selection
    handleEditFileSelect(files) {
        this.editSelectedFiles = Array.from(files).filter(file => {
            if (!this.ALLOWED_TYPES.includes(file.type)) {
                this.showError(`${file.name} is not a supported file type`);
                return false;
            }
            if (file.size > this.MAX_FILE_SIZE) {
                this.showError(`${file.name} is too large (max 10MB)`);
                return false;
            }
            return true;
        });
        
        if (this.editSelectedFiles.length > 0) {
            this.renderEditFileList();
            document.getElementById('edit-file-list')?.classList.remove('hidden');
            document.getElementById('edit-upload-btn')?.classList.remove('hidden');
        }
    },

    renderEditFileList() {
        const list = document.getElementById('edit-file-list');
        if (!list) return;
        
        list.innerHTML = this.editSelectedFiles.map((file, index) => `
            <div class="file-list-item">
                <div class="flex items-center flex-1 min-w-0">
                    <div class="flex-1 min-w-0">
                        <div class="file-name text-xs md:text-sm truncate">${file.name}</div>
                        <div class="file-size text-xs">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                </div>
                <button onclick="galleryApp.removeEditFile(${index})" class="text-red-600 hover:text-red-700 p-2 touch-target" aria-label="Remove file">
                    <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    },

    removeEditFile(index) {
        this.editSelectedFiles.splice(index, 1);
        this.renderEditFileList();
        
        if (this.editSelectedFiles.length === 0) {
            document.getElementById('edit-file-list')?.classList.add('hidden');
            document.getElementById('edit-upload-btn')?.classList.add('hidden');
        }
    },

    // Upload edit files
    async uploadEditFiles() {
        const gallery = this.galleries.find(g => g.id === this.currentGallery);
        if (!gallery) return;

        if (this.editSelectedFiles.length === 0) return;

        const uploadBtn = document.getElementById('edit-upload-btn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.textContent = 'Uploading...';
        }

        const newMedia = [];

        for (let i = 0; i < this.editSelectedFiles.length; i++) {
            const file = this.editSelectedFiles[i];

            try {
                const storageRef = storage.ref(`galleries/${gallery.id}/${Date.now()}_${file.name}`);
                const uploadTask = await storageRef.put(file);
                const downloadURL = await uploadTask.ref.getDownloadURL();

                newMedia.push({
                    id: Date.now().toString() + i,
                    type: file.type.startsWith('video/') ? 'video' : 'image',
                    src: downloadURL,
                    name: file.name,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    storagePath: storageRef.fullPath
                });
            } catch (error) {
                console.error('Error uploading file:', error);
                this.showError(`Error uploading ${file.name}. Please try again.`);
            }
        }

        try {
            await db.collection('galleries').doc(gallery.id).update({
                media: firebase.firestore.FieldValue.arrayUnion(...newMedia)
            });

            this.editSelectedFiles = [];
            document.getElementById('edit-file-input').value = '';
            document.getElementById('edit-file-list')?.classList.add('hidden');
            
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload New Files';
                uploadBtn.classList.add('hidden');
            }
            
            await this.loadGalleries();
            
            const updatedGallery = this.galleries.find(g => g.id === this.currentGallery);
            if (updatedGallery) {
                this.renderEditMedia(updatedGallery);
            }
            
            this.showSuccess('Files added successfully!');
        } catch (error) {
            console.error('Error updating gallery:', error);
            this.showError('Error saving to database. Please try again.');
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload New Files';
            }
        }
    },

    // Lightbox functions with mobile optimization
    openLightbox(galleryId, index) {
        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery?.media?.[index]) return;

        this.currentLightboxGallery = gallery;
        this.currentLightboxIndex = index;
        
        this.updateLightbox();
        this.openModal('lightbox');
        document.body.style.overflow = 'hidden';
        
        // Request fullscreen on mobile for better experience
        if (window.innerWidth <= 768 && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    },

    updateLightbox() {
        const item = this.currentLightboxGallery.media[this.currentLightboxIndex];
        const img = document.getElementById('lightbox-img');
        const video = document.getElementById('lightbox-video');
        const caption = document.getElementById('lightbox-caption');

        if (item.type === 'video') {
            img?.classList.add('hidden');
            video?.classList.remove('hidden');
            if (video) {
                video.src = item.src;
                video.play().catch(() => {});
            }
        } else {
            video?.classList.add('hidden');
            video?.pause();
            if (video) video.src = '';
            img?.classList.remove('hidden');
            if (img) img.src = item.src;
        }

        if (caption) {
            caption.textContent = `${this.currentLightboxIndex + 1} / ${this.currentLightboxGallery.media.length} - ${item.name}`;
        }
    },

    nextImage() {
        if (!this.currentLightboxGallery) return;
        this.currentLightboxIndex = (this.currentLightboxIndex + 1) % this.currentLightboxGallery.media.length;
        this.updateLightbox();
    },

    prevImage() {
        if (!this.currentLightboxGallery) return;
        this.currentLightboxIndex = (this.currentLightboxIndex - 1 + this.currentLightboxGallery.media.length) % this.currentLightboxGallery.media.length;
        this.updateLightbox();
    },

    closeLightbox() {
        const video = document.getElementById('lightbox-video');
        if (video) {
            video.pause();
            video.src = '';
        }
        this.closeModal('lightbox');
        document.body.style.overflow = '';
        
        // Exit fullscreen if active
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    },

    // Modal helpers with accessibility
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // Focus first focusable element
            setTimeout(() => {
                const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (focusable) focusable.focus();
            }, 100);
        }
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    },

    // Toast notifications
    showError(message) {
        // Simple alert for now, can be replaced with a toast component
        alert(message);
        if (navigator.vibrate) navigator.vibrate(50);
    },

    showSuccess(message) {
        alert(message);
    },

    // Event listeners setup
    setupEventListeners() {
        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ['login-modal', 'create-modal', 'upload-modal', 'edit-modal', 'lightbox'].forEach(id => {
                    this.closeModal(id);
                });
            }
            
            if (!document.getElementById('lightbox')?.classList.contains('hidden')) {
                if (e.key === 'ArrowRight') this.nextImage();
                if (e.key === 'ArrowLeft') this.prevImage();
            }
        });

        // Login on enter
        document.getElementById('login-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });

        // Create gallery on enter
        document.getElementById('gallery-name-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createGallery();
        });

        // Drag and drop with visual feedback
        const uploadArea = document.querySelector('#upload-modal .border-dashed');
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.add('border-amber-900', 'bg-amber-50');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('border-amber-900', 'bg-amber-50');
                });
            });

            uploadArea.addEventListener('drop', (e) => {
                this.handleFileSelect(e.dataTransfer.files);
            });
        }

        // Mobile menu with accessibility
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => {
                const isHidden = mobileMenu.classList.contains('hidden');
                mobileMenu.classList.toggle('hidden');
                mobileBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.add('hidden');
                    mobileBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    galleryApp.init();
});
