// frontend/js/profile.js — User Profile & Photo CRUD controller
'use strict';

(function () {
  /**
   * Cached DOM Elements
   */
  const elements = {
    loadingGate: document.getElementById('profile-initial-loading'),
    mainContent: document.getElementById('main-content'),
    headerName: document.getElementById('header-user-name'),
    headerAvatar: document.getElementById('header-user-avatar'),
    headerInitials: document.getElementById('header-user-initials'),
    btnLogout: document.getElementById('btn-logout'),

    // Photo Management
    largeAvatarImg: document.getElementById('profile-photo-img'),
    largeAvatarFallback: document.getElementById('profile-photo-fallback'),
    photoInput: document.getElementById('profile-photo-input'),
    photoDropzone: document.getElementById('photo-dropzone'),
    dropzoneText: document.getElementById('dropzone-text'),
    btnChoosePhoto: document.getElementById('btn-choose-photo'),
    btnSavePhoto: document.getElementById('btn-save-photo'),
    btnRemovePhoto: document.getElementById('btn-remove-photo'),
    photoStatusBanner: document.getElementById('photo-status-banner'),

    // Details Form
    profileForm: document.getElementById('profile-form'),
    inputName: document.getElementById('profile-name'),
    inputPhone: document.getElementById('profile-phone'),
    inputEmail: document.getElementById('profile-email'),
    inputRole: document.getElementById('profile-role'),
    btnSaveDetails: document.getElementById('btn-save-details'),

    // Overview
    overviewStatus: document.getElementById('overview-status'),
    overviewRoleBadge: document.getElementById('overview-role-badge'),
    overviewJoined: document.getElementById('overview-joined'),
  };

  /**
   * State
   */
  let currentUser = null;
  let stagedPhotoFile = null;
  let stagedPreviewUrl = null;

  const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ]);
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

  /**
   * Show status message under photo card
   */
  const setPhotoStatus = (message, type = 'info') => {
    if (!elements.photoStatusBanner) return;
    if (!message) {
      elements.photoStatusBanner.className = 'photo-status-banner';
      elements.photoStatusBanner.textContent = '';
      return;
    }
    elements.photoStatusBanner.className = `photo-status-banner show ${type}`;
    elements.photoStatusBanner.textContent = message;
  };

  /**
   * Update all photo displays across the page (Header + Profile Card)
   */
  const updatePhotoDisplays = (photoUrl, name) => {
    const initial = (name || 'U').trim().charAt(0).toUpperCase();

    // 1. Header User Avatar
    if (elements.headerAvatar && elements.headerInitials) {
      if (photoUrl) {
        elements.headerAvatar.src = photoUrl;
        elements.headerAvatar.classList.remove('hidden');
        elements.headerInitials.classList.add('hidden');
      } else {
        elements.headerAvatar.src = '';
        elements.headerAvatar.classList.add('hidden');
        elements.headerInitials.textContent = initial;
        elements.headerInitials.classList.remove('hidden');
      }
    }

    // 2. Large Profile Card Avatar
    if (elements.largeAvatarImg && elements.largeAvatarFallback) {
      if (photoUrl) {
        elements.largeAvatarImg.src = photoUrl;
        elements.largeAvatarImg.classList.remove('hidden');
        elements.largeAvatarFallback.classList.add('hidden');
      } else {
        elements.largeAvatarImg.src = '';
        elements.largeAvatarImg.classList.add('hidden');
        elements.largeAvatarFallback.textContent = initial;
        elements.largeAvatarFallback.classList.remove('hidden');
      }
    }

    // 3. Remove Button visibility
    if (elements.btnRemovePhoto) {
      if (currentUser && currentUser.profilePhoto) {
        elements.btnRemovePhoto.classList.remove('hidden');
      } else {
        elements.btnRemovePhoto.classList.add('hidden');
      }
    }
  };

  /**
   * Handle image selection and client-side validation
   */
  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      const msg = 'Invalid file format. Please upload JPG, PNG, WEBP, or GIF.';
      if (typeof showToast === 'function') showToast(msg, 'error');
      setPhotoStatus(msg, 'error');
      return;
    }

    // Validate file size (2 MB)
    if (file.size > MAX_FILE_SIZE) {
      const msg = 'File size exceeds 2 MB limit.';
      if (typeof showToast === 'function') showToast(msg, 'error');
      setPhotoStatus(msg, 'error');
      return;
    }

    // Clean up previous preview URL if any
    if (stagedPreviewUrl) {
      URL.revokeObjectURL(stagedPreviewUrl);
      stagedPreviewUrl = null;
    }

    stagedPhotoFile = file;
    stagedPreviewUrl = URL.createObjectURL(file);

    // Show live preview in large avatar
    if (elements.largeAvatarImg && elements.largeAvatarFallback) {
      elements.largeAvatarImg.src = stagedPreviewUrl;
      elements.largeAvatarImg.classList.remove('hidden');
      elements.largeAvatarFallback.classList.add('hidden');
    }

    // Enable Save button
    if (elements.btnSavePhoto) {
      elements.btnSavePhoto.classList.remove('hidden');
      elements.btnSavePhoto.removeAttribute('disabled');
      elements.btnSavePhoto.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Selected Photo
      `;
    }

    if (elements.dropzoneText) {
      elements.dropzoneText.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
    }

    setPhotoStatus('Preview ready. Click "Save Selected Photo" to update.', 'info');
  };

  /**
   * Upload / Save staged profile photo via backend Multer
   */
  const handleSavePhoto = async () => {
    if (!stagedPhotoFile) return;

    const originalBtnHtml = elements.btnSavePhoto.innerHTML;
    elements.btnSavePhoto.setAttribute('disabled', 'true');
    elements.btnSavePhoto.textContent = 'Uploading photo...';
    setPhotoStatus('Uploading to server...', 'info');

    try {
      const res = await uploadProfilePhoto(stagedPhotoFile);

      if (res && res.success && res.user) {
        currentUser = res.user;

        // Clean up staged preview
        if (stagedPreviewUrl) {
          URL.revokeObjectURL(stagedPreviewUrl);
          stagedPreviewUrl = null;
        }
        stagedPhotoFile = null;

        updatePhotoDisplays(currentUser.profilePhoto, currentUser.name);

        if (elements.btnSavePhoto) {
          elements.btnSavePhoto.classList.add('hidden');
        }

        if (elements.dropzoneText) {
          elements.dropzoneText.textContent = 'Click to browse or drag & drop an image';
        }

        const msg = res.message || 'Profile photo updated successfully.';
        if (typeof showToast === 'function') showToast(msg, 'success');
        setPhotoStatus(msg, 'success');
      } else {
        const errorMsg = (res && res.message) || 'Failed to update profile photo.';
        if (typeof showToast === 'function') showToast(errorMsg, 'error');
        setPhotoStatus(errorMsg, 'error');
        elements.btnSavePhoto.removeAttribute('disabled');
        elements.btnSavePhoto.innerHTML = originalBtnHtml;
      }
    } catch (err) {
      const errorMsg = err.message || 'An error occurred while uploading.';
      if (typeof showToast === 'function') showToast(errorMsg, 'error');
      setPhotoStatus(errorMsg, 'error');
      elements.btnSavePhoto.removeAttribute('disabled');
      elements.btnSavePhoto.innerHTML = originalBtnHtml;
    }
  };

  /**
   * Delete / Remove profile photo
   */
  const handleRemovePhoto = async () => {
    if (!currentUser || !currentUser.profilePhoto) return;

    const confirmed = window.confirm('Are you sure you want to remove your profile photo?');
    if (!confirmed) return;

    if (elements.btnRemovePhoto) {
      elements.btnRemovePhoto.setAttribute('disabled', 'true');
      elements.btnRemovePhoto.textContent = 'Removing...';
    }

    try {
      const res = await removeProfilePhoto();

      if (res && res.success && res.user) {
        currentUser = res.user;

        if (stagedPreviewUrl) {
          URL.revokeObjectURL(stagedPreviewUrl);
          stagedPreviewUrl = null;
        }
        stagedPhotoFile = null;

        updatePhotoDisplays(null, currentUser.name);

        if (elements.btnSavePhoto) {
          elements.btnSavePhoto.classList.add('hidden');
        }
        if (elements.dropzoneText) {
          elements.dropzoneText.textContent = 'Click to browse or drag & drop an image';
        }

        const msg = res.message || 'Profile photo removed successfully.';
        if (typeof showToast === 'function') showToast(msg, 'success');
        setPhotoStatus(msg, 'success');
      } else {
        const errorMsg = (res && res.message) || 'Failed to remove photo.';
        if (typeof showToast === 'function') showToast(errorMsg, 'error');
        setPhotoStatus(errorMsg, 'error');
      }
    } catch (err) {
      const errorMsg = err.message || 'Could not remove photo.';
      if (typeof showToast === 'function') showToast(errorMsg, 'error');
      setPhotoStatus(errorMsg, 'error');
    } finally {
      if (elements.btnRemovePhoto) {
        elements.btnRemovePhoto.removeAttribute('disabled');
        elements.btnRemovePhoto.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Remove Current Photo
        `;
      }
    }
  };

  /**
   * Save Personal Information Form
   */
  const handleSaveDetails = async (event) => {
    event.preventDefault();

    const name = elements.inputName.value.trim();
    const phone = elements.inputPhone.value.trim();

    if (!name || name.length < 2 || name.length > 100) {
      if (typeof showToast === 'function') {
        showToast('Name must be between 2 and 100 characters.', 'error');
      }
      elements.inputName.focus();
      return;
    }

    const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
    if (!phone || !PHONE_REGEX.test(phone)) {
      if (typeof showToast === 'function') {
        showToast('Please enter a valid phone number (7-20 digits).', 'error');
      }
      elements.inputPhone.focus();
      return;
    }

    const originalBtnText = elements.btnSaveDetails.textContent;
    elements.btnSaveDetails.setAttribute('disabled', 'true');
    elements.btnSaveDetails.textContent = 'Saving changes...';

    try {
      const res = await updateUserProfile({ name, phone });

      if (res && res.success && res.user) {
        currentUser = res.user;

        // Update header user name
        if (elements.headerName) {
          elements.headerName.textContent = currentUser.name;
        }

        // Refresh initials if no photo
        if (!currentUser.profilePhoto) {
          updatePhotoDisplays(null, currentUser.name);
        }

        if (typeof showToast === 'function') {
          showToast(res.message || 'Profile updated successfully.', 'success');
        }
      } else {
        const errorMsg = (res && res.message) || 'Failed to update profile.';
        if (typeof showToast === 'function') {
          showToast(errorMsg, 'error');
        }
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast(err.message || 'An error occurred while updating profile.', 'error');
      }
    } finally {
      elements.btnSaveDetails.removeAttribute('disabled');
      elements.btnSaveDetails.textContent = originalBtnText;
    }
  };

  /**
   * Populate User Data onto UI
   */
  const populateUserData = (user) => {
    currentUser = user;

    // Header
    if (elements.headerName) {
      elements.headerName.textContent = user.name || 'User';
    }

    // Photo
    updatePhotoDisplays(user.profilePhoto, user.name);

    // Form Fields
    if (elements.inputName) elements.inputName.value = user.name || '';
    if (elements.inputPhone) elements.inputPhone.value = user.phone || '';
    if (elements.inputEmail) elements.inputEmail.value = user.email || '';
    if (elements.inputRole) elements.inputRole.value = user.role === 'admin' ? 'Administrator' : 'Standard Driver';

    // Overview Card
    if (elements.overviewRoleBadge) {
      const isAdmin = user.role === 'admin';
      elements.overviewRoleBadge.textContent = isAdmin ? 'Admin' : 'Driver';
      elements.overviewRoleBadge.className = `info-badge ${isAdmin ? 'info-badge--admin' : 'info-badge--user'}`;
    }

    if (elements.overviewJoined && user.createdAt) {
      try {
        const date = new Date(user.createdAt);
        elements.overviewJoined.textContent = date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        elements.overviewJoined.textContent = 'Active Member';
      }
    }
  };

  /**
   * Initialize Event Listeners
   */
  const initListeners = () => {
    // Logout
    if (elements.btnLogout) {
      elements.btnLogout.addEventListener('click', () => {
        if (typeof logoutUser === 'function') {
          logoutUser();
        } else {
          SessionStore.clear();
          window.location.href = 'login.html';
        }
      });
    }

    // Choose photo buttons
    if (elements.btnChoosePhoto) {
      elements.btnChoosePhoto.addEventListener('click', () => {
        elements.photoInput.click();
      });
    }

    if (elements.photoDropzone) {
      elements.photoDropzone.addEventListener('click', () => {
        elements.photoInput.click();
      });

      // Keyboard accessibility (Enter / Space)
      elements.photoDropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          elements.photoInput.click();
        }
      });

      // Drag and Drop
      elements.photoDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.photoDropzone.classList.add('drag-active');
      });

      elements.photoDropzone.addEventListener('dragleave', () => {
        elements.photoDropzone.classList.remove('drag-active');
      });

      elements.photoDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.photoDropzone.classList.remove('drag-active');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileSelect(e.dataTransfer.files[0]);
        }
      });
    }

    if (elements.photoInput) {
      elements.photoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFileSelect(e.target.files[0]);
        }
      });
    }

    // Save & Remove Photo buttons
    if (elements.btnSavePhoto) {
      elements.btnSavePhoto.addEventListener('click', handleSavePhoto);
    }

    if (elements.btnRemovePhoto) {
      elements.btnRemovePhoto.addEventListener('click', handleRemovePhoto);
    }

    // Form Submission
    if (elements.profileForm) {
      elements.profileForm.addEventListener('submit', handleSaveDetails);
    }
  };

  /**
   * Main Initialization
   */
  const init = async () => {
    try {
      // Route Guard
      const verifiedUser = await requireAuth('profile.html');
      if (!verifiedUser) return;

      populateUserData(verifiedUser);
      initListeners();

      // Show Main Content
      if (elements.loadingGate) elements.loadingGate.classList.add('hidden');
      if (elements.mainContent) elements.mainContent.classList.remove('hidden');
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('Failed to load profile. Please refresh.', 'error');
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
