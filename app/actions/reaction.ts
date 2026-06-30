'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

// Toggle an emoji reaction on a message for the current user.
// Returns the action taken so the client can reconcile optimistically.
export async function toggleReaction(messageId: string, emoji: string) {
  const trimmed = (emoji || '').trim()
  if (!messageId || !trimmed) return { error: 'Thiếu thông tin reaction' }

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Bạn cần đăng nhập để thực hiện' }

  // Resolve the channel of the message and verify the user can access it.
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .select('id, channel_id, channels(workspace_id, is_private)')
    .eq('id', messageId)
    .single()

  if (msgError || !message) return { error: 'Tin nhắn không tồn tại' }

  const channel = Array.isArray(message.channels) ? message.channels[0] : message.channels
  if (!channel) return { error: 'Kênh hội thoại không tồn tại' }

  // Must be a member of the workspace that owns the channel.
  const { data: member } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', channel.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Bạn không có quyền tương tác trong không gian này' }

  // For private channels, also require channel membership.
  if (channel.is_private) {
    const { data: chanMember } = await supabase
      .from('channel_members')
      .select('user_id')
      .eq('channel_id', message.channel_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!chanMember) return { error: 'Bạn không có quyền tương tác trong kênh riêng tư này' }
  }

  // Toggle: delete if it already exists, otherwise insert.
  // Service client is used to write after the access check (mirrors sendMessage).
  const serviceClient = createSupabaseServiceClient()

  const { data: existing } = await serviceClient
    .from('message_reactions')
    .select('emoji')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', trimmed)
    .maybeSingle()

  if (existing) {
    const { error } = await serviceClient
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', trimmed)
    if (error) return { error: 'Không thể bỏ reaction' }
    return { success: true, action: 'removed' as const }
  }

  const { error } = await serviceClient
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: user.id, emoji: trimmed })
  if (error) return { error: 'Không thể thêm reaction' }
  return { success: true, action: 'added' as const }
}
