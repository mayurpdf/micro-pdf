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
    
    // Debug log
    console.log('Form submission started');
    
    // Get form elements
    const fileInput = document.getElementById('pdfFile');
    const titleInput = document.getElementById('pdfTitle');
    const descriptionInput = document.getElementById('pdfDescription');
    const priceInput = document.getElementById('pdfPrice');
    const yearInput = document.getElementById('yearSelect');
    const branchInput = document.getElementById('branchSelect');
    const subjectInput = document.getElementById('subjectSelect');

    // Debug log form elements
    console.log('Form elements:', {
        fileInput: !!fileInput,
        titleInput: !!titleInput,
        descriptionInput: !!descriptionInput,
        priceInput: !!priceInput,
        yearInput: !!yearInput,
        branchInput: !!branchInput,
        subjectInput: !!subjectInput
    });

    // Check if all required elements exist
    if (!fileInput || !titleInput || !descriptionInput || !priceInput || 
        !yearInput || !branchInput || !subjectInput) {
        console.error('Required form elements not found');
        showNotification('Error: Form elements not found. Please refresh the page.', 'error');
        return;
    }

    // Check if file is selected
    if (!fileInput.files[0]) {
        showNotification('Please select a PDF file', 'error');
        return;
    }

    const file = fileInput.files[0];
    if (file.type !== 'application/pdf') {
        showNotification('Please select a valid PDF file', 'error');
        return;
    }

    // Validate required fields
    if (!titleInput.value.trim()) {
        showNotification('Please enter a title', 'error');
        return;
    }

    if (!descriptionInput.value.trim()) {
        showNotification('Please enter a description', 'error');
        return;
    }

    if (!priceInput.value || isNaN(priceInput.value) || parseFloat(priceInput.value) <= 0) {
        showNotification('Please enter a valid price', 'error');
        return;
    }

    if (!yearInput.value) {
        showNotification('Please select a year', 'error');
        return;
    }

    if (!branchInput.value) {
        showNotification('Please select a branch', 'error');
        return;
    }

    if (!subjectInput.value) {
        showNotification('Please select a subject', 'error');
        return;
    }

    const metadata = {
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        price: parseFloat(priceInput.value),
        year: yearInput.value,
        branch: branchInput.value,
        subject: subjectInput.value
    };

    try {
        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        }

        console.log('Starting PDF upload with metadata:', metadata);
        const result = await uploadPDF(file, metadata);
        console.log('Upload result:', result);

        if (result.success) {
            showNotification('PDF uploaded successfully!', 'success');
            // Reset form
            event.target.reset();
            // Refresh PDF list
            loadPDFs();
        } else {
            showNotification(result.error || 'Error uploading PDF', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Error uploading PDF. Please try again.', 'error');
    } finally {
        // Reset button state
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Upload PDF';
        }
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

        const data = result.data;
        if (!data || data.length === 0) {
            pdfList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-pdf" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                    <h3>No PDFs Available</h3>
                    <p>Upload your first PDF to get started.</p>
                </div>
            `;
            return;
        }
        
        pdfList.innerHTML = data.map(pdf => `
            <div class="pdf-card">
                <h3>${pdf.title}</h3>
                <p>${pdf.description}</p>
                <p>Price: ₹${pdf.price}</p>
                <div class="pdf-actions">
                    <button class="action-button delete-button" onclick="deletePDF('${pdf.filename}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading PDFs:', error);
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
async function deletePDF(filename) {
    if (!confirm('Are you sure you want to delete this PDF?')) return;

    try {
        const { error: storageError } = await supabaseClient.storage
            .from('pdfs')
            .remove([filename]);

        if (storageError) throw storageError;

        // Delete from database
        const { error: dbError } = await supabaseClient
            .from('pdfs')
            .delete()
            .eq('filename', filename);

        if (dbError) throw dbError;

        showNotification('PDF deleted successfully!', 'success');
        loadPDFs();
    } catch (error) {
        console.error('Error deleting PDF:', error);
        showNotification('Error deleting PDF', 'error');
    }
}

// Initialize admin functionality
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin page loaded');
    checkAuth();
    
    // Load PDFs if on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        console.log('Loading PDFs for dashboard');
        loadPDFs();
    }
    
    // Add event listener for PDF upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        console.log('Found upload form, adding event listener');
        uploadForm.addEventListener('submit', handlePDFUpload);
    } else {
        console.error('Upload form not found');
    }
});

async function uploadPDF(file, metadata) {
    try {
        console.log('Starting PDF upload process...');
        
        // Generate a unique filename
        const timestamp = new Date().getTime();
        const uniqueFilename = `${timestamp}-${file.name}`;
        console.log('Generated unique filename:', uniqueFilename);

        // Upload file to Supabase Storage
        console.log('Uploading file to Supabase storage...');
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('pdfs')
            .upload(uniqueFilename, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        console.log('File uploaded successfully to storage:', uploadData);

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabaseClient.storage
            .from('pdfs')
            .getPublicUrl(uniqueFilename);
        
        console.log('Generated public URL:', publicUrl);

        // Insert record into database
        console.log('Inserting record into database...');
        const { data: dbData, error: dbError } = await supabaseClient
            .from('pdfs')
            .insert([
                {
                    title: metadata.title,
                    description: metadata.description,
                    price: metadata.price,
                    year: metadata.year,
                    branch: metadata.branch,
                    subject: metadata.subject,
                    file_url: publicUrl,
                    file_name: uniqueFilename,
                    created_at: new Date().toISOString()
                }
            ])
            .select();

        if (dbError) {
            console.error('Database insert error:', dbError);
            // If database insert fails, we should clean up the uploaded file
            await supabaseClient.storage
                .from('pdfs')
                .remove([uniqueFilename]);
            throw new Error(`Failed to save PDF information: ${dbError.message}`);
        }

        console.log('Database record created successfully:', dbData);
        return { success: true, data: dbData[0] };

    } catch (error) {
        console.error('Upload process failed:', error);
        return { success: false, error: error.message };
    }
} 