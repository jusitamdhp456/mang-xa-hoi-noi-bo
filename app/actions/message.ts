'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

export async function sendMessage(
  channelId: string,
  workspaceId: string,
  content: string,
  attachment?: { objectKey: string, fileName: string, mimeType: string, sizeBytes: number },
  messageId?: string,
  replyToId?: string
) {
  if (!content?.trim() && !attachment) return { error: 'Tin nhắn không được để trống' }
  
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Bạn cần đăng nhập để thực hiện' }

  // Run the membership check and channel lookup in parallel to cut latency.
  const [memberRes, channelRes] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('channels')
      .select('is_private')
      .eq('id', channelId)
      .single(),
  ])

  if (memberRes.error || !memberRes.data) {
    return { error: 'Bạn không có quyền gửi tin nhắn: Không phải là thành viên của không gian này' }
  }

  if (channelRes.error || !channelRes.data) {
    return { error: 'Kênh hội thoại không tồn tại' }
  }

  const channel = channelRes.data

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
      ...(messageId ? { id: messageId } : {}),
      channel_id: channelId,
      sender_id: user.id,
      content: content?.trim() || null,
      reply_to_id: replyToId || null,
      type: attachment ? (attachment.mimeType.startsWith('image/') ? 'image' : 'file') : 'text'
    })
    .select('id, content, created_at, sender_id, type, reply_to_id, profiles!messages_sender_id_fkey(display_name, avatar_key), reply_to:reply_to_id(id, content, profiles!messages_sender_id_fkey(display_name))')
    .single()

  if (error || !message) {
    console.error('Error sending message:', error)
    return { error: `Không thể gửi tin nhắn: ${error?.message || 'Lỗi hệ thống'}` }
  }

  // Build a full message object the client can render directly (no RLS re-read).
  const fullMessage: Record<string, unknown> = { ...message, message_attachments: [], message_reactions: [] }

  // 2. Insert attachment nếu có
  if (attachment) {
    const { data: attachRow, error: attachError } = await serviceClient
      .from('message_attachments')
      .insert({
        message_id: (message as { id: string }).id,
        object_key: attachment.objectKey,
        file_name: attachment.fileName,
        mime_type: attachment.mimeType,
        size_bytes: attachment.sizeBytes
      })
      .select('*')
      .single()

    if (attachError) console.error('Error saving attachment:', attachError)
    if (attachRow) fullMessage.message_attachments = [attachRow]
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

  return { success: true, message: fullMessage }
}

// Edit own message
export async function editMessage(messageId: string, content: string) {
  if (!content?.trim()) return { error: 'Nội dung không được để trống' }
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const service = createSupabaseServiceClient()
  const { data: msg } = await service.from('messages').select('sender_id').eq('id', messageId).single()
  if (!msg) return { error: 'Tin nhắn không tồn tại' }
  if (msg.sender_id !== user.id) return { error: 'Bạn chỉ sửa được tin của mình' }

  const { error } = await service
    .from('messages')
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq('id', messageId)
  if (error) return { error: 'Lỗi sửa tin nhắn' }
  return { success: true }
}

// Delete a message (owner of the message, or workspace owner/admin)
export async function deleteMessage(messageId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const service = createSupabaseServiceClient()
  const { data: msg } = await service
    .from('messages')
    .select('sender_id, channels(workspace_id)')
    .eq('id', messageId)
    .single()
  if (!msg) return { error: 'Tin nhắn không tồn tại' }

  let allowed = msg.sender_id === user.id
  if (!allowed) {
    const ch = Array.isArray(msg.channels) ? msg.channels[0] : msg.channels
    if (ch?.workspace_id) {
      const { data: m } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', ch.workspace_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (m && (m.role === 'owner' || m.role === 'admin')) allowed = true
    }
  }
  if (!allowed) return { error: 'Bạn không có quyền xoá tin này' }

  const { error } = await service.from('messages').delete().eq('id', messageId)
  if (error) return { error: 'Lỗi xoá tin nhắn' }
  return { success: true }
}

// Pin / unpin a message in a channel
export async function togglePin(messageId: string, channelId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const service = createSupabaseServiceClient()
  const { data: existing } = await service
    .from('pinned_messages')
    .select('message_id')
    .eq('channel_id', channelId)
    .eq('message_id', messageId)
    .maybeSingle()

  if (existing) {
    await service.from('pinned_messages').delete().eq('channel_id', channelId).eq('message_id', messageId)
    return { success: true, pinned: false }
  }
  const { error } = await service
    .from('pinned_messages')
    .insert({ channel_id: channelId, message_id: messageId, pinned_by: user.id })
  if (error) return { error: 'Lỗi ghim tin nhắn' }
  return { success: true, pinned: true }
}

// Get pinned messages for a channel
export async function getPinnedMessages(channelId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const service = createSupabaseServiceClient()
  const { data } = await service
    .from('pinned_messages')
    .select('message_id, pinned_at, messages!message_id(id, content, created_at, sender_id, profiles!messages_sender_id_fkey(display_name, avatar_key))')
    .eq('channel_id', channelId)
    .order('pinned_at', { ascending: false })
  return (data || []).map((p: any) => p.messages).filter(Boolean)
}
