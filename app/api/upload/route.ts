import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { r2Client } from '@/lib/r2/client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const workspaceId = formData.get('workspaceId') as string | null;
    const channelId = formData.get('channelId') as string | null;
    const threadId = formData.get('threadId') as string | null;
    const folder = formData.get('folder') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    let relativePath = '';
    
    if (folder === 'avatars') {
      relativePath = `avatars/${user.id}/${Date.now()}-${safeFileName}`;
    } else if (threadId) {
      relativePath = `direct/${threadId}/${Date.now()}-${safeFileName}`;
    } else if (workspaceId && channelId) {
      relativePath = `workspaces/${workspaceId}/${channelId}/${Date.now()}-${safeFileName}`;
    } else {
      relativePath = `uploads/${user.id}/${Date.now()}-${safeFileName}`;
    }

    let uploadSuccess = false;
    let finalObjectKey = relativePath;

    // 1. Try Cloudflare R2 upload if configured
    if (process.env.R2_ENDPOINT && process.env.R2_ENDPOINT.startsWith('http') && process.env.R2_BUCKET_NAME) {
      try {
        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: relativePath,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream',
        });
        await r2Client.send(command);
        uploadSuccess = true;
      } catch (r2Error) {
        console.warn('R2 upload failed, falling back to Supabase Storage:', r2Error);
      }
    }

    // 2. Fallback to Supabase Storage if R2 failed or is not configured
    if (!uploadSuccess) {
      try {
        const supabaseAdmin = createSupabaseServiceClient();

        // Check if the bucket exists, if not, create it
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'chat-attachments');
        if (!bucketExists) {
          await supabaseAdmin.storage.createBucket('chat-attachments', { public: true });
        }

        // Prefix key to identify it as Supabase storage on download
        finalObjectKey = `supabase-fallback/${relativePath}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from('chat-attachments')
          .upload(finalObjectKey, buffer, {
            contentType: file.type || 'application/octet-stream',
            duplex: 'half'
          });

        if (uploadError) throw uploadError;
        uploadSuccess = true;
      } catch (supabaseError: any) {
        console.error('Supabase Storage fallback also failed:', supabaseError);
        return NextResponse.json({ error: 'Không thể lưu trữ tệp tin trên hệ thống' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      objectKey: finalObjectKey,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size
    });
  } catch (error: any) {
    console.error('Direct upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
