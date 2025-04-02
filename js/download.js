// Initialize Supabase client
const supabase = supabaseClient;

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const paymentId = urlParams.get('id');

// Function to verify purchase and get download URL
async function verifyPurchaseAndDownload() {
    try {
        // First, verify the purchase
        const { data: purchase, error: purchaseError } = await supabase
            .from('purchases')
            .select('*, pdfs(*)')
            .eq('payment_id', paymentId)
            .single();

        if (purchaseError) throw purchaseError;

        if (!purchase) {
            showError('Purchase verification failed. Please contact support.');
            return;
        }

        // Get the PDF file URL
        const { data: pdfData, error: pdfError } = await supabase
            .storage
            .from('pdfs')
            .createSignedUrl(purchase.pdfs.file_path, 60); // URL valid for 60 seconds

        if (pdfError) throw pdfError;

        // Display download button
        const downloadContent = document.getElementById('downloadContent');
        downloadContent.innerHTML = `
            <div class="download-success">
                <i class="fas fa-check-circle"></i>
                <h2>Purchase Verified!</h2>
                <p>Your PDF is ready for download.</p>
                <a href="${pdfData.signedUrl}" class="download-button" download>
                    <i class="fas fa-download"></i> Download PDF
                </a>
                <p class="download-note">Note: This download link will expire in 60 seconds.</p>
            </div>
        `;

    } catch (error) {
        console.error('Error:', error);
        showError('Error processing your download. Please try again.');
    }
}

// Function to show error message
function showError(message) {
    const downloadContent = document.getElementById('downloadContent');
    downloadContent.innerHTML = `
        <div class="download-error">
            <i class="fas fa-exclamation-circle"></i>
            <h2>Error</h2>
            <p>${message}</p>
            <a href="catalog.html" class="back-button">
                <i class="fas fa-arrow-left"></i> Back to Catalog
            </a>
        </div>
    `;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    if (!paymentId) {
        showError('Invalid download link. Please make a purchase first.');
        return;
    }
    verifyPurchaseAndDownload();
}); 