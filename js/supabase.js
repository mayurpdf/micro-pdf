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
        console.log('Starting PDF upload process...');
        
        // Generate a unique filename
        const timestamp = new Date().getTime();
        const uniqueFilename = `${timestamp}-${file.name}`;
        console.log('Generated unique filename:', uniqueFilename);

        // Check if storage bucket exists
        const { data: buckets, error: bucketError } = await supabaseClient.storage.listBuckets();
        if (bucketError) {
            console.error('Error checking buckets:', bucketError);
            throw new Error(`Failed to check storage buckets: ${bucketError.message}`);
        }

        console.log('Available buckets:', buckets);

        // Create bucket if it doesn't exist
        if (!buckets.some(bucket => bucket.name === 'pdfs')) {
            console.log('Creating pdfs bucket...');
            const { error: createError } = await supabaseClient.storage.createBucket('pdfs', {
                public: true,
                fileSizeLimit: 50 * 1024 * 1024, // 50MB
                allowedMimeTypes: ['application/pdf']
            });
            if (createError) {
                console.error('Error creating bucket:', createError);
                throw new Error(`Failed to create storage bucket: ${createError.message}`);
            }
        }

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