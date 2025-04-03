// Supabase configuration
const SUPABASE_URL = 'https://iqhtwrhndoicqmqjnods.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxaHR3cmhuZG9pY3FtcWpub2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1OTgzNzYsImV4cCI6MjA1OTE3NDM3Nn0.bIPtfS7_PXQM5diEubhyR88AjP6iO9iOHJKYM5rlNrs'

// Initialize Supabase client
let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true
        },
        global: {
            headers: {
                'x-application-name': 'micro-pdf'
            }
        }
    });
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
}

// PDF Storage Functions
async function uploadPDF(file, metadata) {
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        // Validate file
        if (!file || !(file instanceof File)) {
            throw new Error('Invalid file object');
        }

        // Validate metadata
        if (!metadata || !metadata.title || !metadata.price) {
            throw new Error('Invalid metadata');
        }
        
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        
        console.log('Starting file upload:', fileName);
        
        const { data: fileData, error: uploadError } = await supabaseClient.storage
            .from('pdfs')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw uploadError;
        }

        if (!fileData) {
            throw new Error('No file data returned from storage upload');
        }

        console.log('File uploaded successfully:', fileData);

        // Create database record
        const { data: dbData, error: dbError } = await supabaseClient
            .from('pdfs')
            .insert([
                {
                    title: metadata.title,
                    description: metadata.description || '',
                    price: metadata.price,
                    filename: fileName,
                    storage_path: fileData.path,
                    year: metadata.year,
                    branch: metadata.branch,
                    subject: metadata.subject
                }
            ])
            .select()
            .single();

        if (dbError) {
            console.error('Database insert error:', dbError);
            throw dbError;
        }

        if (!dbData) {
            throw new Error('No data returned from database insert');
        }

        console.log('Database record created successfully:', dbData);
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