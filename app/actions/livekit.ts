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
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return { error: 'Server thiếu cấu hình LiveKit API' };
    }

    const httpUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    
    // Tên phòng trong LiveKit được thiết lập bằng channelId
    await roomService.removeParticipant(channelId, targetUserId);

    // Cập nhật Supabase để gỡ user khỏi phòng (để họ biến mất khỏi UI lập tức)
    const supabaseAdmin = createSupabaseServiceClient();
    await supabaseAdmin
      .from('profiles')
      .update({ voice_channel_id: null })
      .eq('id', targetUserId);

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi khi kích người dùng:', error);
    return { error: error.message || 'Có lỗi xảy ra khi thực hiện' };
  }
}
