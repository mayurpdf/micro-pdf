// Initialize Razorpay
const options = {
    key: "rzp_live_gNzl95zcLTH5Jt", // Live mode API key
    amount: 0,
    currency: "INR",
    name: "MICRO Store",
    description: "PDF Document Purchase",
    handler: function (response) {
        handlePaymentSuccess(response);
    },
    prefill: {
        name: "Test User",
        email: "test@example.com",
        contact: "9999999999"
    },
    theme: {
        color: "#3399cc"
    },
    // Configure payment methods
    method: {
        upi: true,
        card: true,
        netbanking: false,
        wallet: false,
        emi: false,
        cod: false,
        paylater: false,
        gpay: true,
        phonepe: true
    },
    // Configure UPI apps
    upi: {
        apps: ['google_pay', 'phonepe'],
        flow: 'collect'
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

// Fetch PDFs from Supabase
async function fetchPDFs() {
    try {
        console.log('Fetching PDFs from Supabase...'); // Debug log
        const { data, error } = await supabase
            .from('pdfs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error); // Debug log
            throw error;
        }
        
        console.log('Fetched PDFs:', data); // Debug log

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

        console.log('PDFs with URLs:', pdfsWithUrls); // Debug log
        return pdfsWithUrls || [];
    } catch (error) {
        console.error('Error fetching PDFs:', error);
        showNotification('Error loading study materials', 'error');
        return [];
    }
}

// Render PDF cards
function renderPDFs(pdfs) {
    console.log('Rendering PDFs:', pdfs); // Debug log
    const pdfGrid = document.getElementById('pdfGrid');
    if (!pdfGrid) {
        console.error('PDF grid element not found'); // Debug log
        return;
    }
    
    pdfGrid.innerHTML = '';

    if (!pdfs || pdfs.length === 0) {
        console.log('No PDFs to render'); // Debug log
        return;
    }

    pdfs.forEach(pdf => {
        const card = document.createElement('div');
        card.className = 'pdf-card';
        
        // Format the title and description
        const title = pdf.title || 'Untitled Document';
        const description = pdf.description || 'No description available';
        
        // Format the meta information
        const year = pdf.year || 'N.A';
        const branch = pdf.branch || 'N.A';
        const subject = pdf.subject || 'N.A';
        
        // Format the price
        const price = pdf.price ? `₹${pdf.price}` : '₹49';

        // Add download URL to the card data
        card.dataset.downloadUrl = pdf.download_url || '';

        card.innerHTML = `
            <div class="pdf-info">
                <h3>${title}</h3>
                <div class="pdf-meta">
                    <span class="year"><i class="fas fa-calendar"></i> ${year}</span>
                    <span class="branch"><i class="fas fa-graduation-cap"></i> ${branch}</span>
                    <span class="subject"><i class="fas fa-book"></i> ${subject}</span>
                </div>
                <p>${description}</p>
                <div class="pdf-price">${price}</div>
            </div>
            <button onclick="initiatePayment('${pdf.id}', ${pdf.price || 49})" class="buy-button">
                <i class="fas fa-shopping-cart"></i> Buy Now
            </button>
        `;
        pdfGrid.appendChild(card);
    });
}

// Filter PDFs based on search and filters
function filterPDFs(pdfs) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const yearFilter = document.getElementById('yearFilter').value;
    const branchFilter = document.getElementById('branchFilter').value;
    const subjectFilter = document.getElementById('subjectFilter').value;

    console.log('Current Filters:', { yearFilter, branchFilter, subjectFilter }); // Debug log

    return pdfs.filter(pdf => {
        // Create a searchable string from all relevant fields
        const searchableText = [
            pdf.title || '',
            pdf.description || '',
            pdf.year || '',
            pdf.branch || '',
            pdf.subject || ''
        ].join(' ').toLowerCase();

        // Check if search term matches any part of the document
        const matchesSearch = searchTerm === '' || searchableText.includes(searchTerm);
        
        // Apply filters with case-insensitive comparison and null checks
        const matchesYear = !yearFilter || (pdf.year && pdf.year.toLowerCase() === yearFilter.toLowerCase());
        const matchesBranch = !branchFilter || (pdf.branch && pdf.branch.toLowerCase() === branchFilter.toLowerCase());
        const matchesSubject = !subjectFilter || (pdf.subject && pdf.subject.toLowerCase() === subjectFilter.toLowerCase());

        // Debug log for each document
        console.log('Document:', {
            title: pdf.title,
            year: pdf.year,
            branch: pdf.branch,
            subject: pdf.subject,
            matches: {
                search: matchesSearch,
                year: matchesYear,
                branch: matchesBranch,
                subject: matchesSubject
            }
        });

        // Only apply filters if they are selected
        if (yearFilter === '' && branchFilter === '' && subjectFilter === '') {
            return matchesSearch;
        }

        return matchesSearch && matchesYear && matchesBranch && matchesSubject;
    });
}

// Update display based on filters
async function updateDisplay() {
    const loadingPlaceholder = document.getElementById('loadingPlaceholder');
    const noResults = document.getElementById('noResults');
    
    try {
        loadingPlaceholder.style.display = 'flex';
        noResults.style.display = 'none';
        
        const pdfs = await fetchPDFs();
        console.log('Total PDFs fetched:', pdfs.length); // Debug log
        
        const filteredPDFs = filterPDFs(pdfs);
        console.log('PDFs after filtering:', filteredPDFs.length); // Debug log
        
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
    const filters = ['yearFilter', 'branchFilter', 'subjectFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', () => {
                console.log(`${filterId} changed to:`, element.value); // Debug log
                updateDisplay();
            });
        }
    });

    // Add debounced search input listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                console.log('Search term changed to:', searchInput.value); // Debug log
                updateDisplay();
            }, 300);
        });
    }
}

// Initialize payment
function initiatePayment(pdfId, amount) {
    console.log('Initiating payment for PDF:', pdfId, 'Amount:', amount); // Debug log
    
    // Ensure amount is a valid number
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInPaise) || amountInPaise <= 0) {
        showNotification('Invalid amount specified', 'error');
        return;
    }
    
    options.amount = amountInPaise;
    options.prefill = {
        name: "Test User",
        email: "test@example.com",
        contact: "9999999999"
    };
    
    // Add notes for tracking
    options.notes = {
        pdf_id: pdfId,
        purpose: "Educational Material"
    };

    try {
        const rzp = new Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error('Error initiating payment:', error);
        showNotification('Error initiating payment. Please try again.', 'error');
    }
}

// Handle successful payment
async function handlePaymentSuccess(response) {
    try {
        console.log('Payment response:', response); // Debug log

        // Get the PDF ID from the notes
        const pdfId = options.notes.pdf_id;
        const amount = options.amount / 100; // Convert back to rupees

        const purchaseData = {
            payment_id: response.razorpay_payment_id,
            pdf_id: pdfId,
            amount: amount,
            status: 'completed',
            created_at: new Date().toISOString()
        };

        console.log('Recording purchase with data:', purchaseData); // Debug log

        // First, get the PDF details
        const { data: pdfData, error: pdfError } = await supabase
            .from('pdfs')
            .select('*')
            .eq('id', pdfId)
            .single();

        if (pdfError) {
            throw new Error('Failed to fetch PDF details: ' + pdfError.message);
        }

        if (!pdfData) {
            throw new Error('PDF not found');
        }

        // Get signed URL for the PDF
        const { data: urlData, error: urlError } = await supabase.storage
            .from('pdfs')
            .createSignedUrl(pdfData.filename, 60); // URL valid for 60 seconds

        if (urlError) {
            throw new Error('Failed to generate download URL: ' + urlError.message);
        }

        // Record the purchase
        const { data, error } = await supabase
            .from('purchases')
            .insert([purchaseData]);

        if (error) {
            console.error('Supabase error:', error); // Debug log
            // Continue with download even if purchase recording fails
            console.warn('Failed to record purchase, but continuing with download');
        }

        console.log('Purchase recorded successfully:', data); // Debug log
        showNotification('Payment successful! Downloading your PDF...', 'success');
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = urlData.signedUrl;
        link.download = pdfData.title + '.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Error in handlePaymentSuccess:', error); // Debug log
        showNotification('Error processing payment: ' + error.message, 'error');
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

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, initializing...'); // Debug log
    try {
        // Show loading state
        if (loadingPlaceholder) {
            loadingPlaceholder.style.display = 'flex';
        }
        if (noResults) {
            noResults.style.display = 'none';
        }

        // Fetch and display PDFs
        const pdfs = await fetchPDFs();
        console.log('PDFs fetched:', pdfs); // Debug log

        if (pdfs && pdfs.length > 0) {
            renderPDFs(pdfs);
            if (loadingPlaceholder) {
                loadingPlaceholder.style.display = 'none';
            }
        } else {
            console.log('No PDFs found'); // Debug log
            if (noResults) {
                noResults.style.display = 'flex';
            }
            if (loadingPlaceholder) {
                loadingPlaceholder.style.display = 'none';
            }
        }

        // Initialize filters
        initializeFilters();
    } catch (error) {
        console.error('Error initializing page:', error);
        showNotification('Error loading documents', 'error');
        if (loadingPlaceholder) {
            loadingPlaceholder.style.display = 'none';
        }
    }
}); 