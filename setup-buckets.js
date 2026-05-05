import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBuckets() {
  const buckets = ['event-flyers', 'logos'];
  
  for (const bucket of buckets) {
    console.log(`Creating bucket ${bucket}...`);
    const { data, error } = await supabase.storage.createBucket(bucket, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });
    
    if (error) {
      console.error(`Error creating bucket ${bucket}:`, error.message);
    } else {
      console.log(`Bucket ${bucket} created successfully!`);
    }
  }
}

createBuckets();
