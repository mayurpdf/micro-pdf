// Initialize Razorpay
const options = {
    key: "rzp_test_UbdMSUbQI2Eh6B", // Test mode API key
    amount: 0,
    currency: "INR",
    name: "MICRO Store",
    description: "PDF Document Purchase",
    handler: function (response) {
        handlePaymentSuccess(response);
    },
    prefill: {
        name: "User Name",
        email: "user@example.com",
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

const rzp = new Razorpay(options);

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
        const { data, error } = await supabase
            .from('pdfs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        console.log('Fetched PDFs:', data); // Debug log
        return data;
    } catch (error) {
        console.error('Error fetching PDFs:', error);
        showNotification('Error loading study materials', 'error');
        return [];
    }
}

// Render PDF cards
function renderPDFs(pdfs) {
    const pdfGrid = document.getElementById('pdfGrid');
    pdfGrid.innerHTML = '';

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
    
    options.amount = amount * 100; // Convert to paise
    options.prefill = {
        name: "Test User",
        email: "test@example.com",
        contact: "9999999999"
    };
    
    // Add notes for tracking
    options.notes = {
        pdf_id: pdfId,
        purpose: "Educational Material",
        test_mode: "true"
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

        // For test mode, we'll use a simpler verification
        const purchaseData = {
            payment_id: response.razorpay_payment_id,
            pdf_id: response.razorpay_order_id ? response.razorpay_order_id.split('_')[1] : response.razorpay_payment_id,
            amount: response.razorpay_amount / 100,
            status: 'completed',
            created_at: new Date().toISOString(),
            test_mode: true // Add flag for test mode
        };

        console.log('Recording purchase with data:', purchaseData); // Debug log

        // Record the purchase
        const { data, error } = await supabase
            .from('purchases')
            .insert([purchaseData]);

        if (error) {
            console.error('Supabase error:', error); // Debug log
            showNotification('Error recording purchase. Please try again.', 'error');
            return;
        }

        console.log('Purchase recorded successfully:', data); // Debug log
        showNotification('Payment successful! Redirecting to download...', 'success');
        
        // Redirect to download page with payment ID
        setTimeout(() => {
            window.location.href = `download.html?id=${response.razorpay_payment_id}`;
        }, 2000);
    } catch (error) {
        console.error('Error in handlePaymentSuccess:', error); // Debug log
        showNotification('Error processing payment. Please try again.', 'error');
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing filters...'); // Debug log
    initializeFilters();
    updateDisplay();
}); 