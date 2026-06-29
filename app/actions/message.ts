'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

export async function sendMessage(
  channelId: string, 
  workspaceId: string,
  content: string, 
  attachment?: { objectKey: string, fileName: string, mimeType: string, sizeBytes: number }
) {
  if (!content?.trim() && !attachment) return { error: 'Tin nhắn không được để trống' }
  
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Bạn cần đăng nhập để thực hiện' }

  // Secure Server-side Validation: Verify if user is in workspace_members
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError || !member) {
    return { error: 'Bạn không có quyền gửi tin nhắn: Không phải là thành viên của không gian này' }
  }

  // Fetch channel privacy details
  const { data: channel, error: channelError } = await supabase
    .from('channels')
    .select('is_private')
    .eq('id', channelId)
    .single()

  if (channelError || !channel) {
    return { error: 'Kênh hội thoại không tồn tại' }
  }

  // If private, verify channel membership and write permission
  if (channel.is_private) {
    const { data: chanMember } = await supabase
      .from('channel_members')
      .select('can_write')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!chanMember || !chanMember.can_write) {
      return { error: 'Bạn không có quyền viết tin nhắn trong kênh riêng tư này' }
    }
  }

  // Use service client to bypass RLS constraint on insert after secure verification
  const serviceClient = createSupabaseServiceClient()
  const { data: message, error } = await serviceClient
    .from('messages')
    .insert({
      channel_id: channelId,
      sender_id: user.id,
      content: content?.trim() || null,
      type: attachment ? (attachment.mimeType.startsWith('image/') ? 'image' : 'file') : 'text'
    })
    .select('id')
    .single()

  if (error || !message) {
    console.error('Error sending message:', error)
    return { error: `Không thể gửi tin nhắn: ${error?.message || 'Lỗi hệ thống'}` }
  }

  // 2. Insert attachment nếu có
  if (attachment) {
    const { error: attachError } = await supabase
      .from('message_attachments')
      .insert({
        message_id: message.id,
        object_key: attachment.objectKey,
        file_name: attachment.fileName,
        mime_type: attachment.mimeType,
        size_bytes: attachment.sizeBytes
      })
      
    if (attachError) console.error('Error saving attachment:', attachError)
  }

  // 3. Xử lý Mention (Notifications)
  if (content?.includes('@')) {
    const mentionRegex = /@(\S+)/g;
    let match;
    const mentions = [];
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    if (mentions.length > 0) {
      const { data: mentionedUsers } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('display_name', mentions)
        
      if (mentionedUsers && mentionedUsers.length > 0) {
        // Lọc không tự gửi thông báo cho chính mình
        const validUsers = mentionedUsers.filter(u => u.id !== user.id)
        if (validUsers.length > 0) {
          const notifications = validUsers.map(u => ({
            user_id: u.id,
            actor_id: user.id,
            type: 'mention',
            content: `đã nhắc đến bạn trong một tin nhắn.`,
            link: `/workspace/${workspaceId}/channel/${channelId}`
          }))

          await supabase.from('notifications').insert(notifications)
        }
      }
    }
  }

  return { success: true, messageId: message.id }
}
