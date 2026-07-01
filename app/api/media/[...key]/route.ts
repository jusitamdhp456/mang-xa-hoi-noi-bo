import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server';
import { getPresignedDownloadUrl } from '@/lib/r2/client';
import { NextResponse } from 'next/server';

async function checkMediaAccess(user: { id: string }, objectKey: string): Promise<boolean> {
  // avatars and profile images are public to authenticated users
  // (also handle the supabase-fallback/ prefix when R2 isn't used)
  const bareKey = objectKey.replace(/^supabase-fallback\//, '');
  if (bareKey.startsWith('avatars/') || bareKey.startsWith('profiles/')) {
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

    // Serve a Supabase-stored object via a signed URL (works even if the
    // bucket isn't public — getPublicUrl silently 400s for private buckets).
    const serveFromSupabase = async (storageKey: string) => {
      const supabaseAdmin = createSupabaseServiceClient();
      const { data, error } = await supabaseAdmin.storage
        .from('chat-attachments')
        .createSignedUrl(storageKey, 3600);
      if (error || !data?.signedUrl) {
        // Last resort: try the public URL (in case the bucket is public).
        const { data: pub } = supabaseAdmin.storage.from('chat-attachments').getPublicUrl(storageKey);
        if (pub?.publicUrl) return NextResponse.redirect(pub.publicUrl);
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.redirect(data.signedUrl);
    };

    // 1. Objects stored in Supabase (either explicitly prefixed, or when R2 is
    //    not configured so everything lives in Supabase storage).
    if (objectKey.startsWith('supabase-fallback/')) {
      return await serveFromSupabase(objectKey);
    }
    if (!process.env.R2_ENDPOINT || !process.env.R2_ENDPOINT.startsWith('http')) {
      return await serveFromSupabase(objectKey);
    }

    // 2. Serve from Cloudflare R2
    const downloadUrl = await getPresignedDownloadUrl(objectKey);
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('Media URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
