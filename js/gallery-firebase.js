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
}

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
}
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

    // Render file list
    renderFileList() {
        const container = document.getElementById('file-list');
        const preview = document.getElementById('file-preview');
        
        if (this.selectedFiles.length === 0) {
            preview.classList.add('hidden');
            return;
        }

        preview.classList.remove('hidden');
        container.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="file-list-item">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
                <span class="remove-file" onclick="galleryApp.removeFile(${index})">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </span>
            </div>
        `).join('');
    },

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderFileList();
    },

    // Upload files to Firebase Storage
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

        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;

        document.getElementById('upload-progress').classList.remove('hidden');
        document.getElementById('upload-submit-btn').disabled = true;

        const newMedia = [];

        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const progress = ((i) / this.selectedFiles.length) * 100;
            
            document.getElementById('progress-bar').style.width = `${progress}%`;
            document.getElementById('progress-text').textContent = `Uploading ${i + 1} of ${this.selectedFiles.length}...`;

            try {
                // Upload to Firebase Storage
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

        // Update Firestore document
        try {
            await db.collection('galleries').doc(galleryId).update({
                media: firebase.firestore.FieldValue.arrayUnion(...newMedia)
            });

            // Cleanup
            this.selectedFiles = [];
            document.getElementById('file-input').value = '';
            document.getElementById('file-preview').classList.add('hidden');
            document.getElementById('upload-progress').classList.add('hidden');
            document.getElementById('progress-bar').style.width = '0%';
            document.getElementById('upload-submit-btn').disabled = false;
            
            this.closeModal('upload-modal');
            await this.loadGalleries();
            
            alert('Files uploaded successfully!');
        } catch (error) {
            console.error('Error updating gallery:', error);
            alert('Error saving to database. Please try again.');
        }
    },

    // Render all galleries
    renderGalleries() {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('gallery-content').classList.remove('hidden');
        
        const container = document.getElementById('galleries-container');
        const emptyState = document.getElementById('empty-state');
        
        const count = this.galleries.length;
        document.getElementById('gallery-count').textContent = `${count} collection${count !== 1 ? 's' : ''}`;
        
        if (this.galleries.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        container.innerHTML = this.galleries.map(gallery => `
            <div class="gallery-section" data-gallery-id="${gallery.id}">
                <div class="gallery-header">
                    <div>
                        <h2 class="gallery-title">${gallery.name}</h2>
                        <p class="gallery-date">${this.formatDate(gallery.createdAt)} • ${gallery.media?.length || 0} items</p>
                    </div>
                    ${this.currentUser ? `
                        <button onclick="galleryApp.editGallery('${gallery.id}')" class="px-4 py-2 text-amber-900 border border-amber-900 rounded-sm hover:bg-amber-900 hover:text-stone-100 transition-all">
                            Edit Gallery
                        </button>
                    ` : ''}
                </div>
                
                <div class="gallery-grid">
                    ${(gallery.media || []).map((item, index) => `
                        <div class="gallery-item" onclick="galleryApp.openLightbox('${gallery.id}', ${index})">
                            ${item.type === 'video' ? `
                                <video src="${item.src}" preload="metadata"></video>
                                <div class="video-badge">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Video
                                </div>
                            ` : `
                                <img src="${item.src}" alt="${item.name}" loading="lazy">
                            `}
                            <div class="gallery-item-overlay">
                                <span class="text-white text-sm">${item.name}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    },

    formatDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Edit gallery
    editGallery(galleryId) {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }

        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;

        document.getElementById('edit-gallery-title').textContent = gallery.name;
        this.currentGallery = galleryId;
        this.renderEditMedia(gallery);
        this.openModal('edit-modal');
    },

    renderEditMedia(gallery) {
        const grid = document.getElementById('edit-media-grid');
        
        if (!gallery.media || gallery.media.length === 0) {
            grid.innerHTML = '<p class="text-stone-500 col-span-full text-center py-8">No media in this gallery</p>';
            return;
        }

        grid.innerHTML = gallery.media.map((item, index) => `
            <div class="edit-gallery-item">
                ${item.type === 'video' ? `
                    <video src="${item.src}" class="w-full h-full object-cover"></video>
                ` : `
                    <img src="${item.src}" alt="${item.name}" class="w-full h-full object-cover">
                `}
                <div class="delete-btn" onclick="galleryApp.deleteMedia('${gallery.id}', ${index}, '${item.storagePath}')">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </div>
            </div>
        `).join('');
    },

    // Delete media
    async deleteMedia(galleryId, index, storagePath) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            // Delete from Storage
            if (storagePath) {
                await storage.ref(storagePath).delete();
            }

            // Update Firestore
            const gallery = this.galleries.find(g => g.id === galleryId);
            if (gallery) {
                const newMedia = [...gallery.media];
                newMedia.splice(index, 1);
                
                await db.collection('galleries').doc(galleryId).update({
                    media: newMedia
                });

                await this.loadGalleries();
                
                // Refresh edit modal
                const updatedGallery = this.galleries.find(g => g.id === galleryId);
                if (updatedGallery) {
                    this.renderEditMedia(updatedGallery);
                }
            }
        } catch (error) {
            console.error('Error deleting media:', error);
            alert('Error deleting item. Please try again.');
        }
    },

    // Handle edit file select
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
            <div class="file-list-item">
                <span class="file-name">${file.name}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
                <span class="remove-file" onclick="galleryApp.removeEditFile(${index})">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </span>
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
                    uploadArea.classList.add('drag-active');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, () => {
                    uploadArea.classList.remove('drag-active');
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
