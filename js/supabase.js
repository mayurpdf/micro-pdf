// Supabase configuration
const SUPABASE_URL = 'https://iqhtwrhndoicqmqjnods.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxaHR3cmhuZG9pY3FtcWpub2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1OTgzNzYsImV4cCI6MjA1OTE3NDM3Nn0.bIPtfS7_PXQM5diEubhyR88AjP6iO9iOHJKYM5rlNrs';

// Initialize Supabase client
let supabaseClient;

try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true
        },
        storage: {
            maxFileSize: 50 * 1024 * 1024, // 50MB max file size
            allowedMimeTypes: ['application/pdf']
        }
    });
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
}

// Export the client for use in other files
window.supabaseClient = supabaseClient;

// PDF Storage Functions
async function uploadPDF(file, metadata) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: fileData, error: uploadError } = await supabaseClient.storage
            .from('pdfs')
            .upload(fileName, file);

        if (uploadError) {
            throw uploadError;
        }

        // Create database record
        const { data: dbData, error: dbError } = await supabaseClient
            .from('pdfs')
            .insert([
                {
                    filename: fileName,
                    title: metadata.title,
                    description: metadata.description,
                    price: metadata.price,
                    category: metadata.category,
                    year: metadata.year,
                    branch: metadata.branch,
                    subject: metadata.subject,
                    created_at: new Date().toISOString()
                }
            ]);

        if (dbError) {
            throw dbError;
        }

        return { success: true, data: dbData };
    } catch (error) {
        console.error('Error uploading PDF:', error);
        return { success: false, error: error.message };
    }
}

async function getPDFs() {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabaseClient
            .from('pdfs')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('Error fetching PDFs:', error)
        return { success: false, error: error.message }
    }
}

async function getPDFDownloadUrl(filename) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabaseClient.storage
            .from('pdfs')
            .createSignedUrl(filename, 3600) // URL valid for 1 hour

        if (error) throw error
        return { success: true, url: data.signedUrl }
    } catch (error) {
        console.error('Error getting download URL:', error)
        return { success: false, error: error.message }
    }
}

async function recordPurchase(pdfId, paymentId) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabaseClient
            .from('purchases')
            .insert([
                {
                    pdf_id: pdfId,
                    payment_id: paymentId,
                    user_id: 'anonymous' // You can implement user authentication later
                }
            ])

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('Error recording purchase:', error)
        return { success: false, error: error.message }
    }
}

async function verifyPurchase(pdfId) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabaseClient
            .from('purchases')
            .select('*')
            .eq('pdf_id', pdfId)
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error) {
        console.error('Error verifying purchase:', error)
        return { success: false, error: error.message }
    }
} 