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
firebase.initializeApp(firebaseConfig);
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

    init() {
        this.setupAuthListener();
        this.setupEventListeners();
    },

    // Show create modal
    showCreateModal() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }
        this.openModal('create-modal');
        document.getElementById('gallery-name-input').focus();
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
        });
    },

   // Update UI based on auth state
    updateUI() {
        const loginBtn = document.getElementById('login-btn');
        const createGalleryBtn = document.getElementById('create-gallery-btn');
        const uploadBtn = document.getElementById('upload-btn');
        const authBar = document.getElementById('auth-bar');
        
        if (this.currentUser) {
            loginBtn.classList.add('hidden');
            authBar.classList.remove('hidden');
            
            // Show Create Gallery if no galleries, else show Upload
            if (this.galleries.length === 0) {
                createGalleryBtn.classList.remove('hidden');
                uploadBtn.classList.add('hidden');
            } else {
                createGalleryBtn.classList.add('hidden');
                uploadBtn.classList.remove('hidden');
            }
        } else {
            loginBtn.classList.remove('hidden');
            createGalleryBtn.classList.add('hidden');
            uploadBtn.classList.add('hidden');
            authBar.classList.add('hidden');
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
            errorEl.classList.add('hidden');
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        }
    },

    // Logout
    async logout() {
        await auth.signOut();
    },

    // Show login modal
    showLoginModal() {
        this.openModal('login-modal');
        document.getElementById('login-email').focus();
    },

    // Load galleries from Firestore
    async loadGalleries() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('gallery-content').classList.add('hidden');
        
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
            alert('Error loading galleries. Please try again.');
        }
    },

    // Show public galleries (for non-logged in users)
    async showPublicGalleries() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('gallery-content').classList.add('hidden');
        
        try {
            const snapshot = await db.collection('galleries').orderBy('createdAt', 'desc').get();
            
            this.galleries = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderGalleries();
        } catch (error) {
            console.error('Error loading galleries:', error);
        }
    },

    // Render galleries
    renderGalleries() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('gallery-content').classList.remove('hidden');
        
        const count = document.getElementById('gallery-count');
        count.textContent = `${this.galleries.length} collection${this.galleries.length !== 1 ? 's' : ''}`;
        
        const container = document.getElementById('galleries-container');
        const emptyState = document.getElementById('empty-state');
        
        if (this.galleries.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        container.innerHTML = this.galleries.map(gallery => {
            const mediaCount = gallery.media ? gallery.media.length : 0;
            const firstMedia = gallery.media && gallery.media[0];
            
            return `
                <div class="gallery-section">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <h2 class="text-3xl font-serif text-stone-900">${gallery.name}</h2>
                            <p class="text-stone-600 mt-1">${mediaCount} item${mediaCount !== 1 ? 's' : ''}</p>
                        </div>
                        ${this.currentUser ? `
                            <div class="flex space-x-3">
                                <button onclick="galleryApp.showEditModal('${gallery.id}')" class="px-4 py-2 text-amber-900 border border-amber-900 rounded-sm hover:bg-amber-50 transition-colors">
                                    Edit Gallery
                                </button>
                                <button onclick="galleryApp.deleteGallery('${gallery.id}')" class="px-4 py-2 text-red-700 border border-red-700 rounded-sm hover:bg-red-50 transition-colors">
                                    Delete
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${mediaCount === 0 ? `
                        <div class="text-center py-12 bg-stone-100 rounded-sm">
                            <p class="text-stone-600">No media in this gallery yet</p>
                            ${this.currentUser ? '<p class="text-stone-500 text-sm mt-2">Click "Edit Gallery" to add files</p>' : ''}
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            ${gallery.media.map((item, index) => `
                                <div class="gallery-item cursor-pointer" onclick="galleryApp.openLightbox('${gallery.id}', ${index})">
                                    ${item.type === 'video' ? `
                                        <video src="${item.src}" class="w-full h-64 object-cover rounded-sm"></video>
                                        <div class="play-icon">
                                            <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path>
                                            </svg>
                                        </div>
                                    ` : `
                                        <img src="${item.src}" alt="${item.name}" class="w-full h-64 object-cover rounded-sm" loading="lazy">
                                    `}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;
        }).join('');
    },

    // Create new gallery
    async createGallery() {
        const name = document.getElementById('gallery-name-input').value.trim();
        
        if (!name) {
            alert('Please enter a gallery name');
            return;
        }

        try {
            const docRef = await db.collection('galleries').add({
                name: name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: this.currentUser.email,
                media: []
            });

            document.getElementById('gallery-name-input').value = '';
            this.closeModal('create-modal');
            
            // Reload galleries
            await this.loadGalleries();
            
            // Show upload modal for new gallery
            this.currentGallery = docRef.id;
            this.populateGallerySelect();
            this.openModal('upload-modal');
            
        } catch (error) {
            console.error('Error creating gallery:', error);
            alert('Error creating gallery. Please try again.');
        }
    },

    // Show upload modal
    showUploadModal() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }
        
        // If no galleries, show create modal instead
        if (this.galleries.length === 0) {
            this.showCreateModal();
            return;
        }
        
        this.populateGallerySelect();
        this.openModal('upload-modal');
    },

    // Populate gallery select dropdown
    populateGallerySelect() {
        const select = document.getElementById('upload-gallery-select');
        select.innerHTML = '<option value="">Choose a gallery...</option>' +
            this.galleries.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        
        if (this.currentGallery) {
            select.value = this.currentGallery;
            this.currentGallery = null;
        }
    },

    // Handle file selection
    handleFileSelect(files) {
        this.selectedFiles = Array.from(files).filter(file => {
            if (file.size > this.MAX_FILE_SIZE) {
                alert(`File ${file.name} is too large. Max size is 10MB.`);
                return false;
            }
            if (!this.ALLOWED_TYPES.includes(file.type)) {
                alert(`File ${file.name} is not a supported format.`);
                return false;
            }
            return true;
        });

        this.renderFileList();
    },

    renderFileList() {
        const preview = document.getElementById('file-preview');
        const list = document.getElementById('file-list');
        const submitBtn = document.getElementById('upload-submit-btn');
        
        if (this.selectedFiles.length === 0) {
            preview.classList.add('hidden');
            submitBtn.disabled = true;
            return;
        }

        preview.classList.remove('hidden');
        submitBtn.disabled = false;
        
        list.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="flex items-center justify-between p-3 bg-stone-50 rounded">
                <div class="flex items-center space-x-3">
                    <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <div>
                        <div class="text-sm font-medium text-stone-800">${file.name}</div>
                        <div class="text-xs text-stone-500">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button onclick="galleryApp.removeFile(${index})" class="text-red-600 hover:text-red-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    },

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderFileList();
        document.getElementById('file-input').value = '';
    },

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // Upload files
    async uploadFiles() {
        const galleryId = document.getElementById('upload-gallery-select').value;
        
        if (!galleryId) {
            alert('Please select a gallery');
            return;
        }

        if (this.selectedFiles.length === 0) {
            alert('Please select files to upload');
            return;
        }

        const submitBtn = document.getElementById('upload-submit-btn');
        const progressContainer = document.getElementById('upload-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');

        submitBtn.disabled = true;
        progressContainer.classList.remove('hidden');

        const gallery = this.galleries.find(g => g.id === galleryId);
        const newMedia = [];

        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const progress = Math.round(((i + 1) / this.selectedFiles.length) * 100);
            
            progressBar.style.width = progress + '%';
            progressText.textContent = `Uploading ${i + 1} of ${this.selectedFiles.length}...`;

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
                alert(`Error uploading ${file.name}. Please try again.`);
            }
        }

        try {
            await db.collection('galleries').doc(galleryId).update({
                media: firebase.firestore.FieldValue.arrayUnion(...newMedia)
            });

            this.selectedFiles = [];
            document.getElementById('file-input').value = '';
            document.getElementById('upload-gallery-select').value = '';
            
            progressBar.style.width = '0%';
            progressContainer.classList.add('hidden');
            submitBtn.disabled = false;
            
            this.closeModal('upload-modal');
            await this.loadGalleries();
            
            alert('Files uploaded successfully!');
        } catch (error) {
            console.error('Error updating gallery:', error);
            alert('Error saving to database. Please try again.');
            submitBtn.disabled = false;
        }
    },

    // Show edit modal
    showEditModal(galleryId) {
        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;

        this.currentGallery = galleryId;
        document.getElementById('edit-gallery-title').textContent = `Edit: ${gallery.name}`;
        
        this.renderEditMedia(gallery);
        this.openModal('edit-modal');
    },

    renderEditMedia(gallery) {
        const grid = document.getElementById('edit-media-grid');
        
        if (!gallery.media || gallery.media.length === 0) {
            grid.innerHTML = '<p class="text-stone-600 col-span-full text-center py-8">No media in this gallery yet</p>';
            return;
        }

        grid.innerHTML = gallery.media.map((item, index) => `
            <div class="relative group">
                ${item.type === 'video' ? `
                    <video src="${item.src}" class="w-full h-48 object-cover rounded-sm"></video>
                ` : `
                    <img src="${item.src}" alt="${item.name}" class="w-full h-48 object-cover rounded-sm">
                `}
                <div class="absolute inset-0 bg-stone-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onclick="galleryApp.deleteMedia('${gallery.id}', '${item.id}')" class="p-2 bg-red-600 text-white rounded-sm hover:bg-red-700">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Delete media
    async deleteMedia(galleryId, mediaId) {
        if (!confirm('Are you sure you want to delete this file?')) return;

        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;

        const mediaItem = gallery.media.find(m => m.id === mediaId);
        if (!mediaItem) return;

        try {
            // Delete from storage
            if (mediaItem.storagePath) {
                await storage.ref(mediaItem.storagePath).delete();
            }

            // Remove from database
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
            alert('Error deleting file. Please try again.');
        }
    },

    // Delete gallery
    async deleteGallery(galleryId) {
        if (!confirm('Are you sure you want to delete this entire gallery? This cannot be undone.')) return;

        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;

        try {
            // Delete all media from storage
            if (gallery.media && gallery.media.length > 0) {
                for (const item of gallery.media) {
                    if (item.storagePath) {
                        try {
                            await storage.ref(item.storagePath).delete();
                        } catch (error) {
                            console.error('Error deleting file:', error);
                        }
                    }
                }
            }

            // Delete gallery document
            await db.collection('galleries').doc(galleryId).delete();
            
            await this.loadGalleries();
            alert('Gallery deleted successfully');
        } catch (error) {
            console.error('Error deleting gallery:', error);
            alert('Error deleting gallery. Please try again.');
        }
    },

    // Handle edit file selection
    handleEditFileSelect(files) {
        this.editSelectedFiles = Array.from(files).filter(file => {
            if (file.size > this.MAX_FILE_SIZE) {
                alert(`File ${file.name} is too large. Max size is 10MB.`);
                return false;
            }
            if (!this.ALLOWED_TYPES.includes(file.type)) {
                alert(`File ${file.name} is not a supported format.`);
                return false;
            }
            return true;
        });

        this.renderEditFileList();
    },

    renderEditFileList() {
        const container = document.getElementById('edit-file-list');
        const btn = document.getElementById('edit-upload-btn');
        
        if (this.editSelectedFiles.length === 0) {
            container.classList.add('hidden');
            btn.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        btn.classList.remove('hidden');
        
        container.innerHTML = this.editSelectedFiles.map((file, index) => `
            <div class="flex items-center justify-between p-3 bg-white rounded border border-stone-300">
                <div class="flex items-center space-x-3">
                    <svg class="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <div>
                        <div class="text-sm font-medium text-stone-800">${file.name}</div>
                        <div class="text-xs text-stone-500">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button onclick="galleryApp.removeEditFile(${index})" class="text-red-600 hover:text-red-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    },

    removeEditFile(index) {
        this.editSelectedFiles.splice(index, 1);
        this.renderEditFileList();
    },

    // Upload edit files
    async uploadEditFiles() {
        const gallery = this.galleries.find(g => g.id === this.currentGallery);
        if (!gallery) return;

        if (this.editSelectedFiles.length === 0) return;

        document.getElementById('edit-upload-btn').disabled = true;
        document.getElementById('edit-upload-btn').textContent = 'Uploading...';

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
                alert(`Error uploading ${file.name}. Please try again.`);
            }
        }

        try {
            await db.collection('galleries').doc(gallery.id).update({
                media: firebase.firestore.FieldValue.arrayUnion(...newMedia)
            });

            this.editSelectedFiles = [];
            document.getElementById('edit-file-input').value = '';
            document.getElementById('edit-file-list').classList.add('hidden');
            
            document.getElementById('edit-upload-btn').disabled = false;
            document.getElementById('edit-upload-btn').textContent = 'Upload New Files';
            
            await this.loadGalleries();
            
            const updatedGallery = this.galleries.find(g => g.id === this.currentGallery);
            if (updatedGallery) {
                this.renderEditMedia(updatedGallery);
            }
            
            alert('Files added successfully!');
        } catch (error) {
            console.error('Error updating gallery:', error);
            alert('Error saving to database. Please try again.');
        }
    },

    // Lightbox functions
    openLightbox(galleryId, index) {
        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery || !gallery.media || !gallery.media[index]) return;

        this.currentLightboxGallery = gallery;
        this.currentLightboxIndex = index;
        
        this.updateLightbox();
        this.openModal('lightbox');
        document.body.style.overflow = 'hidden';
    },

    updateLightbox() {
        const item = this.currentLightboxGallery.media[this.currentLightboxIndex];
        const img = document.getElementById('lightbox-img');
        const video = document.getElementById('lightbox-video');
        const caption = document.getElementById('lightbox-caption');

        if (item.type === 'video') {
            img.classList.add('hidden');
            video.classList.remove('hidden');
            video.src = item.src;
            video.play();
        } else {
            video.classList.add('hidden');
            video.pause();
            img.classList.remove('hidden');
            img.src = item.src;
        }

        caption.textContent = `${this.currentLightboxIndex + 1} / ${this.currentLightboxGallery.media.length} - ${item.name}`;
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
        video.pause();
        video.src = '';
        this.closeModal('lightbox');
        document.body.style.overflow = '';
    },

    // Modal helpers
    openModal(id) {
        document.getElementById(id).classList.remove('hidden');
    },

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
    },

    // Event listeners
    setupEventListeners() {
        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ['login-modal', 'create-modal', 'upload-modal', 'edit-modal', 'lightbox'].forEach(id => {
                    this.closeModal(id);
                });
                document.body.style.overflow = '';
            }
            
            if (!document.getElementById('lightbox').classList.contains('hidden')) {
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

        // Drag and drop
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
                    uploadArea.classList.add('border-amber-900');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('border-amber-900');
                });
            });

            uploadArea.addEventListener('drop', (e) => {
                this.handleFileSelect(e.dataTransfer.files);
            });
        }

        // Mobile menu
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    galleryApp.init();
});
