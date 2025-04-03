// Show notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Admin credentials (in a real application, this would be handled server-side)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// Check if user is already logged in
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn && window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard.html';
    } else if (!isLoggedIn && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
    }
}

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        window.location.href = 'dashboard.html';
    } else {
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Invalid username or password';
    }
    
    return false;
}

// Handle logout
function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = 'login.html';
}

// Handle PDF upload
async function handlePDFUpload(event) {
    event.preventDefault();
    console.log('Starting PDF upload process...');
    
    const fileInput = document.getElementById('pdfFile');
    const titleInput = document.getElementById('pdfTitle');
    const priceInput = document.getElementById('pdfPrice');
    const descriptionInput = document.getElementById('pdfDescription');
    const yearSelect = document.getElementById('yearSelect');
    const branchSelect = document.getElementById('branchSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    
    const file = fileInput.files[0];
    
    // Validate inputs
    if (!file) {
        showNotification('Please select a PDF file', 'error');
        return;
    }
    
    if (file.type !== 'application/pdf') {
        showNotification('Please select a valid PDF file', 'error');
        return;
    }
    
    if (!titleInput.value.trim()) {
        showNotification('Please enter a title', 'error');
        return;
    }
    
    if (!priceInput.value || parseFloat(priceInput.value) <= 0) {
        showNotification('Please enter a valid price', 'error');
        return;
    }

    if (!yearSelect.value) {
        showNotification('Please select a year', 'error');
        return;
    }

    if (!branchSelect.value) {
        showNotification('Please select a branch', 'error');
        return;
    }

    if (!subjectSelect.value) {
        showNotification('Please select a subject', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="loading-spinner"></div> Uploading...';
    submitButton.disabled = true;
    
    try {
        console.log('Preparing metadata...');
        const metadata = {
            title: titleInput.value.trim(),
            price: parseFloat(priceInput.value),
            description: descriptionInput.value.trim(),
            year: yearSelect.value,
            branch: branchSelect.value,
            subject: subjectSelect.value
        };
        
        console.log('Uploading file with metadata:', metadata);
        const result = await uploadPDF(file, metadata);
        
        if (result.success) {
            console.log('Upload successful:', result.data);
            showNotification('PDF uploaded successfully!', 'success');
            event.target.reset();
            loadPDFs(); // Refresh the PDF list
        } else {
            console.error('Upload failed:', result.error);
            throw new Error(result.error || 'Failed to upload PDF');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification(error.message || 'Error uploading PDF', 'error');
    } finally {
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Load and display PDFs
async function loadPDFs() {
    const pdfList = document.getElementById('pdfList');
    if (!pdfList) return;
    
    // Show loading state
    pdfList.innerHTML = `
        <div class="loading-placeholder">
            <div class="loading-spinner"></div>
            <p>Loading PDFs...</p>
        </div>
    `;
    
    try {
        const result = await getPDFs();
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        const pdfs = result.data;
        
        if (pdfs.length === 0) {
            pdfList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-pdf" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                    <h3>No PDFs Available</h3>
                    <p>Upload your first PDF to get started.</p>
                </div>
            `;
            return;
        }
        
        pdfList.innerHTML = pdfs.map(pdf => `
            <div class="pdf-card">
                <h3>${pdf.title}</h3>
                <p>${pdf.description}</p>
                <p>Price: ₹${pdf.price}</p>
                <div class="pdf-actions">
                    <button class="action-button delete-button" onclick="deletePDF(${pdf.id}, '${pdf.filename}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        pdfList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: var(--error-color); margin-bottom: 1rem;"></i>
                <h3>Error Loading PDFs</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Delete PDF
async function deletePDF(id, filename) {
    if (confirm('Are you sure you want to delete this PDF?')) {
        try {
            // Delete from storage
            const { error: storageError } = await supabaseClient.storage
                .from('pdfs')
                .remove([filename]);

            if (storageError) {
                throw storageError;
            }

            // Delete from database
            const { error: dbError } = await supabaseClient
                .from('pdfs')
                .delete()
                .eq('id', id);

            if (dbError) {
                throw dbError;
            }

            showNotification('PDF deleted successfully!', 'success');
            loadPDFs(); // Refresh the list
        } catch (error) {
            console.error('Error deleting PDF:', error);
            showNotification('Error deleting PDF: ' + error.message, 'error');
        }
    }
}

// Initialize admin functionality
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Load PDFs if on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        loadPDFs();
    }
    
    // Add event listener for PDF upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handlePDFUpload);
    }
}); 