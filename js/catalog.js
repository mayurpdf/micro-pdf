// Add CSS for the modal
const modalStyles = `
<style>
.user-details-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    justify-content: center;
    align-items: center;
}

.modal-content {
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
    margin-bottom: 1.5rem;
    color: #333;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
}

.form-group input {
    width: 100%;
    padding: 0.8rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

.form-group input:focus {
    border-color: #3399cc;
    outline: none;
    box-shadow: 0 0 0 2px rgba(51, 153, 204, 0.2);
}

.modal-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
}

.modal-button {
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
}

.cancel-button {
    background-color: #f5f5f5;
    color: #333;
}

.continue-button {
    background-color: #3399cc;
    color: white;
}

.continue-button:hover {
    background-color: #2980b9;
}

.cancel-button:hover {
    background-color: #e5e5e5;
}

.error-message {
    color: #e74c3c;
    font-size: 0.875rem;
    margin-top: 0.25rem;
    display: none;
}
</style>
`;

// Add modal HTML
document.head.insertAdjacentHTML('beforeend', modalStyles);
document.body.insertAdjacentHTML('beforeend', `
<div class="user-details-modal" id="userDetailsModal">
    <div class="modal-content">
        <h3>Enter Contact Details</h3>
        <form id="userDetailsForm">
            <div class="form-group">
                <label for="userName">Full Name</label>
                <input type="text" id="userName" required placeholder="Enter your full name">
                <div class="error-message" id="nameError">Please enter a valid name</div>
            </div>
            <div class="form-group">
                <label for="userPhone">Mobile Number</label>
                <input type="tel" id="userPhone" required placeholder="Enter your mobile number" value="+91">
                <div class="error-message" id="phoneError">Please enter a valid 10-digit mobile number</div>
            </div>
            <div class="modal-buttons">
                <button type="button" class="modal-button cancel-button" onclick="closeUserDetailsModal()">Cancel</button>
                <button type="submit" class="modal-button continue-button">Continue</button>
            </div>
        </form>
    </div>
</div>
`);

// User details modal functions
function showUserDetailsModal(callback) {
    const modal = document.getElementById('userDetailsModal');
    const form = document.getElementById('userDetailsForm');
    const phoneInput = document.getElementById('userPhone');
    const nameInput = document.getElementById('userName');

    // Show the modal
    modal.style.display = 'flex';

    // Handle form submission
    form.onsubmit = function(e) {
        e.preventDefault();
        
        // Validate phone number
        const phoneNumber = phoneInput.value.trim();
        const name = nameInput.value.trim();
        
        // Reset error messages
        document.getElementById('phoneError').style.display = 'none';
        document.getElementById('nameError').style.display = 'none';
        
        // Validate name
        if (name.length < 3) {
            document.getElementById('nameError').style.display = 'block';
            return;
        }

        // Validate phone number
        const phoneRegex = /^\+91[0-9]{10}$/;
        if (!phoneRegex.test(phoneNumber)) {
            document.getElementById('phoneError').style.display = 'block';
            return;
        }

        // Close modal and proceed with payment
        modal.style.display = 'none';
        callback({
            name: name,
            phone: phoneNumber
        });
    };
}

function closeUserDetailsModal() {
    const modal = document.getElementById('userDetailsModal');
    modal.style.display = 'none';
}

// Initialize Razorpay
const options = {
    key: "rzp_live_gNzl95zcLTH5Jt",
    amount: 0,
    currency: "INR",
    name: "MK Store",
    description: "PDF Document Purchase",
    theme: {
        color: "#3399cc"
    },
    modal: {
        confirm_close: true,
        escape: false,
        handleback: true,
        ondismiss: function() {
            hideLoading();
        }
    },
    send_sms_hash: true,
    remember_customer: true,
    readonly: {
        contact: false,
        email: false
    }
};

// Initialize Supabase client
const supabase = supabaseClient;

// DOM Elements
const pdfGrid = document.getElementById('pdfGrid');
const loadingPlaceholder = document.getElementById('loadingPlaceholder');
const noResults = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const subjectFilter = document.getElementById('subjectFilter');
const levelFilter = document.getElementById('levelFilter');

// State
let allPdfs = [];
let filteredPdfs = [];

// Store transaction details
let currentTransaction = null;

// Loading state management
function showLoading() {
    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    if (loadingPlaceholder) {
        loadingPlaceholder.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    if (loadingPlaceholder) {
        loadingPlaceholder.style.display = 'none';
    }
}

// Fetch PDFs from Supabase
async function fetchPDFs() {
    try {
        console.log('Fetching PDFs from Supabase...');
        const { data, error } = await supabase
            .from('pdfs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        
        console.log('Fetched PDFs:', data);

        // Get signed URLs for each PDF
        const pdfsWithUrls = await Promise.all(data.map(async (pdf) => {
            try {
                const { data: urlData, error: urlError } = await supabase.storage
                    .from('pdfs')
                    .createSignedUrl(pdf.filename, 3600);

                if (urlError) {
                    console.error('Error getting URL for PDF:', pdf.filename, urlError);
                    return { ...pdf, download_url: null };
                }

                return { ...pdf, download_url: urlData.signedUrl };
            } catch (error) {
                console.error('Error processing PDF:', pdf.filename, error);
                return { ...pdf, download_url: null };
            }
        }));

        console.log('PDFs with URLs:', pdfsWithUrls);
        return pdfsWithUrls || [];
    } catch (error) {
        console.error('Error fetching PDFs:', error);
        showNotification('Error loading study materials', 'error');
        return [];
    }
}

// Render PDFs
function renderPDFs(pdfs) {
    const pdfGrid = document.getElementById('pdfGrid');
    pdfGrid.innerHTML = '';

    if (pdfs.length === 0) {
        noResults.style.display = 'flex';
        return;
    }

    noResults.style.display = 'none';

    pdfs.forEach(pdf => {
        const card = document.createElement('div');
        card.className = 'pdf-card';
        
        // Create meta information only if values exist
        const metaInfo = [];
        if (pdf.year) metaInfo.push(`<span class="year"><i class="fas fa-calendar"></i> ${pdf.year}</span>`);
        if (pdf.branch) metaInfo.push(`<span class="branch"><i class="fas fa-graduation-cap"></i> ${pdf.branch}</span>`);
        if (pdf.subject) metaInfo.push(`<span class="subject"><i class="fas fa-book"></i> ${pdf.subject}</span>`);

        card.innerHTML = `
            <div class="pdf-info">
                <h3>${pdf.title}</h3>
                ${metaInfo.length > 0 ? `<div class="pdf-meta">${metaInfo.join('')}</div>` : ''}
                <p>${pdf.description}</p>
                <div class="pdf-price">₹${pdf.price}</div>
            </div>
            <button onclick="handlePayment('${pdf.id}')" class="buy-button">
                <i class="fas fa-shopping-cart"></i> Buy Now
            </button>
        `;
        pdfGrid.appendChild(card);
    });
}

// Filter PDFs based on search and filters
function filterPDFs(pdfs, searchTerm = '') {
    if (!pdfs) return [];
    
    searchTerm = searchTerm.toLowerCase().trim();
    
    return pdfs.filter(pdf => {
        // Create a searchable string from all relevant fields
        const searchableText = [
            pdf.title || '',
            pdf.description || '',
            pdf.year || '',
            pdf.branch || '',
            pdf.subject || '',
            pdf.price ? pdf.price.toString() : ''
        ].join(' ').toLowerCase();

        // Check if search term matches any part of the document
        return searchTerm === '' || searchableText.includes(searchTerm);
    });
}

// Update display based on filters
async function updateDisplay() {
    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    const noResults = document.getElementById('noResults');
    const searchInput = document.getElementById('searchInput');
    
    try {
        loadingPlaceholder.style.display = 'flex';
        noResults.style.display = 'none';
        
        const pdfs = await fetchPDFs();
        console.log('Total PDFs fetched:', pdfs.length);
        
        const searchTerm = searchInput ? searchInput.value : '';
        const filteredPDFs = filterPDFs(pdfs, searchTerm);
        console.log('PDFs after filtering:', filteredPDFs.length);
        
        if (filteredPDFs.length === 0) {
            noResults.style.display = 'flex';
            loadingPlaceholder.style.display = 'none';
            renderPDFs([]);
        } else {
            noResults.style.display = 'none';
            loadingPlaceholder.style.display = 'none';
            renderPDFs(filteredPDFs);
        }
    } catch (error) {
        console.error('Error updating display:', error);
        showNotification('Error loading documents', 'error');
        loadingPlaceholder.style.display = 'none';
    }
}

// Initialize filters with debounce for search input
function initializeFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                console.log('Search term changed to:', searchInput.value);
                updateDisplay();
            }, 300);
        });
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, initializing...');
    try {
        // Show loading state
        if (loadingPlaceholder) {
            loadingPlaceholder.style.display = 'flex';
        }
        if (noResults) {
            noResults.style.display = 'none';
        }

        // Initialize filters
        initializeFilters();

        // Fetch and display PDFs
        await updateDisplay();
    } catch (error) {
        console.error('Error initializing page:', error);
        showNotification('Error loading documents', 'error');
        if (loadingPlaceholder) {
            loadingPlaceholder.style.display = 'none';
        }
    }
});

// Handle payment initiation
async function handlePayment(pdfId) {
    try {
        showLoading();
        const { data: pdf, error } = await supabase
            .from('pdfs')
            .select('*')
            .eq('id', pdfId)
            .single();

        if (error) throw error;

        // Show user details modal first
        showUserDetailsModal(async (userDetails) => {
            try {
                // Store transaction details
                currentTransaction = {
                    pdfId: pdfId,
                    amount: pdf.price,
                    customerName: userDetails.name,
                    customerPhone: userDetails.phone,
                    pdfTitle: pdf.title
                };

                // Update Razorpay options with PDF and user details
                const paymentOptions = {
                    ...options,
                    amount: pdf.price * 100,
                    description: pdf.title,
                    prefill: {
                        name: userDetails.name,
                        contact: userDetails.phone,
                        method: 'contact'
                    },
                    notes: {
                        pdf_id: pdfId,
                        purpose: "Educational Material",
                        customer_name: userDetails.name,
                        customer_phone: userDetails.phone
                    },
                    handler: function(response) {
                        if (response.razorpay_payment_id) {
                            handlePaymentSuccess(response, currentTransaction);
                        }
                    }
                };

                const rzp = new Razorpay(paymentOptions);
                
                // Add payment handlers
                rzp.on('payment.failed', function(response) {
                    console.error('Payment failed:', response.error);
                    hideLoading();
                    showNotification('Payment failed. Please try again.', 'error');
                });

                rzp.on('payment.success', function(response) {
                    console.log('Payment successful:', response);
                    showNotification('Payment successful! Processing your order...', 'success');
                });

                rzp.open();
            } catch (error) {
                console.error('Error opening Razorpay:', error);
                showNotification('Error initiating payment. Please try again.', 'error');
                hideLoading();
            }
        });
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('Payment failed. Please try again.', 'error');
        hideLoading();
    }
}

// Handle successful payment
async function handlePaymentSuccess(response, transaction) {
    try {
        console.log('Payment response:', response);
        showLoading();

        if (!response.razorpay_payment_id) {
            throw new Error('No payment ID received');
        }

        if (!transaction) {
            throw new Error('Transaction details not found');
        }

        // Create purchase record
        const purchaseData = {
            payment_id: response.razorpay_payment_id,
            pdf_id: transaction.pdfId,
            amount: transaction.amount,
            status: 'completed',
            customer_name: transaction.customerName,
            customer_phone: transaction.customerPhone,
            created_at: new Date().toISOString()
        };

        try {
            // Record the purchase in database
            const { error: purchaseError } = await supabase
                .from('purchases')
                .insert([purchaseData]);

            if (purchaseError) {
                console.error('Error recording purchase:', purchaseError);
                console.warn('Failed to record purchase, but continuing with download');
            }

            // Get PDF details and generate download URL
            const { data: pdfData, error: pdfError } = await supabase
                .from('pdfs')
                .select('*')
                .eq('id', transaction.pdfId)
                .single();

            if (pdfError || !pdfData) {
                throw new Error('Could not find PDF details');
            }

            const { data: urlData, error: urlError } = await supabase.storage
                .from('pdfs')
                .createSignedUrl(pdfData.filename, 300);

            if (urlError) {
                throw new Error('Could not generate download link');
            }

            // Trigger download
            const link = document.createElement('a');
            link.href = urlData.signedUrl;
            link.download = transaction.pdfTitle + '.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showNotification('Payment successful! Your PDF is downloading...', 'success');
            
            // Clear transaction data
            currentTransaction = null;
        } catch (error) {
            console.error('Error processing successful payment:', error);
            showNotification('Error downloading PDF. Please contact support.', 'error');
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        showNotification('Error processing payment. Please contact support.', 'error');
    } finally {
        hideLoading();
    }
}

// Show notification with improved styling
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                      type === 'error' ? 'fa-exclamation-circle' : 
                      'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Search functionality
searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const filteredPDFs = pdfs.filter(pdf => {
        // Search in title
        const titleMatch = pdf.title.toLowerCase().includes(searchTerm);
        
        // Search in description
        const descriptionMatch = pdf.description.toLowerCase().includes(searchTerm);
        
        // Search in year
        const yearMatch = pdf.year && pdf.year.toLowerCase().includes(searchTerm);
        
        // Search in branch
        const branchMatch = pdf.branch && pdf.branch.toLowerCase().includes(searchTerm);
        
        // Search in subject
        const subjectMatch = pdf.subject && pdf.subject.toLowerCase().includes(searchTerm);
        
        // Search in price
        const priceMatch = pdf.price.toString().includes(searchTerm);
        
        // Return true if any of the fields match
        return titleMatch || descriptionMatch || yearMatch || branchMatch || subjectMatch || priceMatch;
    });
    
    renderPDFs(filteredPDFs);
}); 