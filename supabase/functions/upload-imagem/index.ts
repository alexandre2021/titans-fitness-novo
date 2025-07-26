import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  filename: string;
  image_base64: string;
  aluno_id: string;
  tipo: 'frente' | 'lado' | 'costas';
  bucket_type: 'avaliacoes';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: UploadRequest = await req.json();
    const { filename, image_base64, bucket_type } = body;

    // Validate inputs
    if (!filename || !image_base64 || !bucket_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert base64 to Uint8Array
    const imageData = Uint8Array.from(atob(image_base64), c => c.charCodeAt(0));

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket_type)
      .upload(filename, imageData, {
        contentType: 'image/webp',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to upload image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket_type)
      .getPublicUrl(filename);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrlData.publicUrl,
        filename: filename
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-imagem function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});