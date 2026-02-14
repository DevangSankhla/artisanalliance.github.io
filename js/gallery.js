// Gallery Application
const galleryApp = {
    // Configuration - CHANGE THIS PASSWORD
    PASSWORD_HASH: '8fb6139debc084c972933ce5df5a3c598f4f863c744367d073d9f3740f7f0e73', // "password" 
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'],
    
    // State
    galleries: [],
    currentGallery: null,
    selectedFiles: [],
    editSelectedFiles: [],
    isAuthenticated: false,
    currentLightboxIndex: 0,
    currentLightboxGallery: null,

    // Initialize
    init() {
        this.loadGalleries();
        this.renderGalleries();
        this.setupEventListeners();
        this.updateGalleryCount();
    },

    // Simple hash function (SHA-256)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Verify password
    async verifyPassword() {
        const input = document.getElementById('password-input').value;
        const hashed = await this.hashPassword(input);
        
        if (hashed === this.PASSWORD_HASH) {
            this.isAuthenticated = true;
            this.closeModal('password-modal');
            document.getElementById('password-input').value = '';
            this.showCreateModal();
        } else {
            document.getElementById('password-error').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('password-error').classList.add('hidden');
            }, 3000);
        }
    },

    // Show upload modal (with password check)
    showUploadModal() {
        if (!this.isAuthenticated) {
            this.openModal('password-modal');
            document.getElementById('password-input').focus();
        } else {
            this.populateGallerySelect();
            this.openModal('upload-modal');
        }
    },

    // Show create modal
    showCreateModal() {
        this.openModal('create-modal');
        document.getElementById('gallery-name-input').focus();
    },

    // Create new gallery
    createGallery() {
        const name = document.getElementById('gallery-name-input').value.trim();
        
        if (!name) {
            alert('Please enter a gallery name');
            return;
        }

        const gallery = {
            id: Date.now().toString(),
            name: name,
            createdAt: new Date().toISOString(),
            media: []
        };

        this.galleries.push(gallery);
        this.saveGalleries();
        
        document.getElementById('gallery-name-input').value = '';
        this.closeModal('create-modal');
        this.renderGalleries();
        this.updateGalleryCount();
        
        // Show upload modal for the new gallery
        this.currentGallery = gallery.id;
        this.populateGallerySelect();
        this.openModal('upload-modal');
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

    // Remove file from selection
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.renderFileList();
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

        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;

        // Show progress
        document.getElementById('upload-progress').classList.remove('hidden');
        document.getElementById('upload-btn').disabled = true;

        // Process each file
        for (let i = 0; i < this.selectedFiles.length; i++) {
            const file = this.selectedFiles[i];
            const progress = ((i + 1) / this.selectedFiles.length) * 100;
            
            document.getElementById('progress-bar').style.width = `${progress}%`;
            document.getElementById('progress-text').textContent = `Processing ${i + 1} of ${this.selectedFiles.length}...`;

            // Convert to base64
            const base64 = await this.fileToBase64(file);
            
            gallery.media.push({
                id: Date.now().toString() + i,
                type: file.type.startsWith('video/') ? 'video' : 'image',
                src: base64,
                name: file.name,
                size: file.size,
                uploadedAt: new Date().toISOString()
            });
        }

        // Save and cleanup
        this.saveGalleries();
        this.selectedFiles = [];
        document.getElementById('file-input').value = '';
        document.getElementById('file-preview').classList.add('hidden');
        document.getElementById('upload-progress').classList.add('hidden');
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('upload-btn').disabled = false;
        
        this.closeModal('upload-modal');
        this.renderGalleries();
        
        alert('Files uploaded successfully!');
    },

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    // Render all galleries
    renderGalleries() {
        const container = document.getElementById('galleries-container');
        const emptyState = document.getElementById('empty-state');
        
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
                        <p class="gallery-date">${this.formatDate(gallery.createdAt)} • ${gallery.media.length} items</p>
                    </div>
                    <button onclick="galleryApp.editGallery('${gallery.id}')" class="px-4 py-2 text-amber-900 border border-amber-900 rounded-sm hover:bg-amber-900 hover:text-stone-100 transition-all">
                        Edit Gallery
                    </button>
                </div>
                
                <div class="gallery-grid">
                    ${gallery.media.map((item, index) => `
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

    // Format date
    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    },

    // Edit gallery
    editGallery(galleryId) {
        if (!this.isAuthenticated) {
            this.currentGallery = galleryId;
            this.openModal('password-modal');
            return;
        }

        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;

        document.getElementById('edit-gallery-title').textContent = gallery.name;
        this.currentGallery = galleryId;
        this.renderEditMedia(gallery);
        this.openModal('edit-modal');
    },

    // Render edit media grid
    renderEditMedia(gallery) {
        const grid = document.getElementById('edit-media-grid');
        
        if (gallery.media.length === 0) {
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
                <div class="delete-btn" onclick="galleryApp.deleteMedia('${gallery.id}', ${index})">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </div>
            </div>
        `).join('');
    },

    // Delete media
    deleteMedia(galleryId, index) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery) return;

        gallery.media.splice(index, 1);
        this.saveGalleries();
        this.renderEditMedia(gallery);
        this.renderGalleries();
        this.updateGalleryCount();
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

    // Render edit file list
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

    // Remove edit file
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

        for (let i = 0; i < this.editSelectedFiles.length; i++) {
            const file = this.editSelectedFiles[i];
            const base64 = await this.fileToBase64(file);
            
            gallery.media.push({
                id: Date.now().toString() + i,
                type: file.type.startsWith('video/') ? 'video' : 'image',
                src: base64,
                name: file.name,
                size: file.size,
                uploadedAt: new Date().toISOString()
            });
        }

        this.saveGalleries();
        this.editSelectedFiles = [];
        document.getElementById('edit-file-input').value = '';
        document.getElementById('edit-file-list').classList.add('hidden');
        
        document.getElementById('edit-upload-btn').disabled = false;
        document.getElementById('edit-upload-btn').textContent = 'Upload New Files';
        
        this.renderEditMedia(gallery);
        this.renderGalleries();
        this.updateGalleryCount();
        
        alert('Files added successfully!');
    },

    // Lightbox functions
    openLightbox(galleryId, index) {
        const gallery = this.galleries.find(g => g.id === galleryId);
        if (!gallery || !gallery.media[index]) return;

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

    // Storage functions
    saveGalleries() {
        localStorage.setItem('artisanAllianceGalleries', JSON.stringify(this.galleries));
    },

    loadGalleries() {
        const stored = localStorage.getItem('artisanAllianceGalleries');
        if (stored) {
            this.galleries = JSON.parse(stored);
        }
    },

    updateGalleryCount() {
        const count = this.galleries.length;
        document.getElementById('gallery-count').textContent = `${count} collection${count !== 1 ? 's' : ''}`;
    },

    // Setup event listeners
    setupEventListeners() {
        // Close modals on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ['password-modal', 'create-modal', 'upload-modal', 'edit-modal', 'lightbox'].forEach(id => {
                    this.closeModal(id);
                });
                document.body.style.overflow = '';
            }
            
            // Lightbox navigation
            if (!document.getElementById('lightbox').classList.contains('hidden')) {
                if (e.key === 'ArrowRight') this.nextImage();
                if (e.key === 'ArrowLeft') this.prevImage();
            }
        });

        // Password input enter key
        document.getElementById('password-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyPassword();
        });

        // Gallery name input enter key
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

        // Mobile menu toggle
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    galleryApp.init();
});
