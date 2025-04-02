// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// PDF Storage Functions
async function uploadPDF(file, metadata) {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: fileData, error: uploadError } = await supabase.storage
            .from('pdfs')
            .upload(fileName, file);

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw uploadError;
        }

        if (!fileData) {
            throw new Error('No file data returned from storage upload');
        }

        // Create database record
        const { data: dbData, error: dbError } = await supabase
            .from('pdfs')
            .insert([
                {
                    title: metadata.title,
                    description: metadata.description,
                    price: metadata.price,
                    filename: fileName,
                    storage_path: fileData.path
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

        return { success: true, data: dbData };
    } catch (error) {
        console.error('Error uploading PDF:', error);
        return { success: false, error: error.message };
    }
}

async function getPDFs() {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabase
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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabase.storage
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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabase
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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }
        
        const { data, error } = await supabase
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