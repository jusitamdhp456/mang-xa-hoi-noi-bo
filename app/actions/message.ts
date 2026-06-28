'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function sendMessage(
  channelId: string, 
  workspaceId: string,
  content: string, 
  attachment?: { objectKey: string, fileName: string, mimeType: string, sizeBytes: number }
) {
  if (!content?.trim() && !attachment) return { error: 'Tin nhắn không được để trống' }
  
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Bạn cần đăng nhập' }

  // 1. Insert message
  const { data: message, error } = await supabase
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
    return { error: 'Không thể gửi tin nhắn' }
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

  return { success: true }
}
