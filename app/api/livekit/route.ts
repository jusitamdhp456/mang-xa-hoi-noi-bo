import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');
    const username = searchParams.get('username');

    if (!room) {
      return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
    } else if (!username) {
      return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Server misconfigured: Missing LiveKit API keys' }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is a member of the workspace that owns this channel (room = channelId)
    const { data: channel } = await supabase
      .from('channels')
      .select('workspace_id')
      .eq('id', room)
      .single();

    if (!channel) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', channel.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: username,
    });
    
    at.addGrant({ roomJoin: true, room: room });

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (error) {
    console.error('LiveKit token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
