import { createSupabaseServerClient } from '@/lib/supabase/server';
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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer for S3 upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    let objectKey = '';
    
    if (threadId) {
      objectKey = `direct/${threadId}/${Date.now()}-${safeFileName}`;
    } else if (workspaceId && channelId) {
      objectKey = `workspaces/${workspaceId}/${channelId}/${Date.now()}-${safeFileName}`;
    } else {
      objectKey = `uploads/${user.id}/${Date.now()}-${safeFileName}`;
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await r2Client.send(command);

    return NextResponse.json({ 
      success: true, 
      objectKey,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size
    });
  } catch (error: any) {
    console.error('Direct upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
