import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { getPresignedDownloadUrl } from '@/lib/r2/client';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const objectKey = key.join('/');
    
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. If key is prefixed with supabase-fallback/, serve it from Supabase storage
    if (objectKey.startsWith('supabase-fallback/')) {
      const supabaseAdmin = createSupabaseServiceClient();
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('chat-attachments')
        .getPublicUrl(objectKey);
      
      return NextResponse.redirect(publicUrl);
    }

    // 2. Otherwise, check if R2 is configured, else fallback to Supabase
    if (!process.env.R2_ENDPOINT || !process.env.R2_ENDPOINT.startsWith('http')) {
      // In case key didn't get prefix but R2 is missing, default to Supabase search
      const supabaseAdmin = createSupabaseServiceClient();
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('chat-attachments')
        .getPublicUrl(objectKey);
      
      return NextResponse.redirect(publicUrl);
    }

    // 3. Serve from Cloudflare R2
    const downloadUrl = await getPresignedDownloadUrl(objectKey);
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('Media URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
