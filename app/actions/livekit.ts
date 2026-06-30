'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { RoomServiceClient } from 'livekit-server-sdk'

export async function kickParticipant(channelId: string, targetUserId: string) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Không được phép (Chưa đăng nhập)' };
    }

    // Lấy workspace_id của channel này
    const { data: channel } = await supabase
      .from('channels')
      .select('workspace_id')
      .eq('id', channelId)
      .single();

    if (!channel) {
      return { error: 'Không tìm thấy kênh' };
    }

    // Kiểm tra quyền owner
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', channel.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return { error: 'Chỉ chủ phòng (Owner) mới có quyền kích người khác' };
    }

    // Thực hiện kick qua LiveKit Server API
    try {
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

      if (apiKey && apiSecret && livekitUrl) {
        const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
        const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
        await roomService.removeParticipant(channelId, targetUserId);
      }
    } catch (e) {
      console.error('LiveKit remove error:', e);
    }

    // Cập nhật Supabase để gỡ user khỏi phòng (để họ biến mất khỏi UI lập tức)
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabaseAdmin = createSupabaseServiceClient();
        await supabaseAdmin
          .from('profiles')
          .update({ voice_channel_id: null })
          .eq('id', targetUserId);
      } else {
        console.warn('Missing SUPABASE_SERVICE_ROLE_KEY');
      }
    } catch (e) {
      console.error('Supabase admin update error:', e);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi kích người dùng:', error);
    return { error: error.message || 'Có lỗi xảy ra khi thực hiện' };
  }
}
