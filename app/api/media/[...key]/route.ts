import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { getPresignedDownloadUrl } from '@/lib/r2/client';
import { NextResponse } from 'next/server';

async function checkMediaAccess(user: { id: string }, objectKey: string): Promise<boolean> {
  // avatars and profile images are public to authenticated users
  if (objectKey.startsWith('avatars/') || objectKey.startsWith('profiles/')) {
    return true;
  }

  const supabaseAdmin = createSupabaseServiceClient();

  // workspaces/{workspaceId}/{channelId}/... — check workspace membership
  const wsMatch = objectKey.match(/^(?:supabase-fallback\/)?workspaces\/([^/]+)\//);
  if (wsMatch) {
    const workspaceId = wsMatch[1];
    const { data } = await supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();
    return !!data;
  }

  // threads/{threadId}/... — check DM thread membership
  const threadMatch = objectKey.match(/^(?:supabase-fallback\/)?threads\/([^/]+)\//);
  if (threadMatch) {
    const threadId = threadMatch[1];
    const { data } = await supabaseAdmin
      .from('direct_thread_members')
      .select('thread_id')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .maybeSingle();
    return !!data;
  }

  // Unknown key pattern — deny by default
  return false;
}

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

    const allowed = await checkMediaAccess(user, objectKey);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
