'use server';

import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Send a friend request
export async function sendFriendRequest(targetUserId: string) {
  const supabaseUserClient = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  if (user.id === targetUserId) {
    throw new Error('You cannot add yourself as a friend');
  }

  // Get sender's profile details
  const { data: senderProfile } = await supabaseUserClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!senderProfile) {
    throw new Error('Sender profile not found');
  }

  // Check if a request already exists
  const supabaseAdmin = createSupabaseServiceClient();
  const { data: existingNotification } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('user_id', targetUserId)
    .eq('title', 'Lời mời kết bạn')
    .is('read_at', null)
    .contains('body', user.id)
    .limit(1);

  if (existingNotification && existingNotification.length > 0) {
    return { success: true, message: 'Yêu cầu kết bạn đã được gửi trước đó.' };
  }

  // Insert notification for the target user
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: targetUserId,
      title: 'Lời mời kết bạn',
      body: JSON.stringify({
        sender_id: user.id,
        sender_name: senderProfile.display_name || senderProfile.username || 'User',
        sender_username: senderProfile.username,
        sender_avatar: senderProfile.avatar_key
      }),
      href: '/channels/me'
    });

  if (error) {
    console.error('Error inserting friend request notification:', error);
    throw new Error(error.message);
  }

  return { success: true };
}

// Accept a friend request
export async function acceptFriendRequest(notificationId: string) {
  const supabaseUserClient = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabaseAdmin = createSupabaseServiceClient();

  // Fetch the notification
  const { data: notification, error: notifError } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (notifError || !notification) {
    throw new Error('Notification not found');
  }

  // Parse sender details
  const payload = JSON.parse(notification.body || '{}');
  const senderId = payload.sender_id;

  if (!senderId) {
    throw new Error('Invalid friend request payload');
  }

  // Check if they are already friends (direct thread exists)
  const { data: existingMemberships } = await supabaseAdmin
    .from('direct_thread_members')
    .select('thread_id')
    .eq('user_id', user.id);

  let threadExists = false;
  let existingThreadId = null;

  if (existingMemberships && existingMemberships.length > 0) {
    const threadIds = existingMemberships.map(m => m.thread_id);
    
    // Check if the sender is also in any of these threads (for 1-to-1 DMs)
    const { data: matchingThreads } = await supabaseAdmin
      .from('direct_threads')
      .select('id')
      .in('id', threadIds)
      .eq('is_group', false);

    if (matchingThreads && matchingThreads.length > 0) {
      const matchIds = matchingThreads.map(t => t.id);
      
      const { data: senderMembership } = await supabaseAdmin
        .from('direct_thread_members')
        .select('thread_id')
        .in('thread_id', matchIds)
        .eq('user_id', senderId)
        .limit(1);

      if (senderMembership && senderMembership.length > 0) {
        threadExists = true;
        existingThreadId = senderMembership[0].thread_id;
      }
    }
  }

  if (!threadExists) {
    // Create new DM thread
    const { data: newThread, error: threadErr } = await supabaseAdmin
      .from('direct_threads')
      .insert({
        is_group: false,
        created_by: user.id
      })
      .select('id')
      .single();

    if (threadErr || !newThread) {
      console.error('Error creating direct thread:', threadErr);
      throw new Error('Could not establish DM connection');
    }

    // Add members
    const { error: membersErr } = await supabaseAdmin
      .from('direct_thread_members')
      .insert([
        { thread_id: newThread.id, user_id: user.id },
        { thread_id: newThread.id, user_id: senderId }
      ]);

    if (membersErr) {
      console.error('Error adding direct thread members:', membersErr);
      throw new Error('Could not add members to DM connection');
    }
  }

  // Mark request notification as read
  await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  return { success: true };
}

// Decline/Remove a friend request
export async function declineFriendRequest(notificationId: string) {
  const supabaseUserClient = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const supabaseAdmin = createSupabaseServiceClient();

  // Mark request notification as read (dismissed)
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}

// Fetch established friends
export async function getFriends() {
  const supabaseUserClient = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  if (!user) {
    return [];
  }

  const supabaseAdmin = createSupabaseServiceClient();

  // Find all threads the user belongs to
  const { data: memberships } = await supabaseAdmin
    .from('direct_thread_members')
    .select('thread_id')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const threadIds = memberships.map(m => m.thread_id);

  // Filter for 1-to-1 threads (is_group = false)
  const { data: dmThreads } = await supabaseAdmin
    .from('direct_threads')
    .select('id')
    .in('id', threadIds)
    .eq('is_group', false);

  if (!dmThreads || dmThreads.length === 0) {
    return [];
  }

  const dmThreadIds = dmThreads.map(t => t.id);

  // Get other members in those threads
  const { data: otherMembers } = await supabaseAdmin
    .from('direct_thread_members')
    .select('thread_id, user_id')
    .in('thread_id', dmThreadIds)
    .neq('user_id', user.id);

  if (!otherMembers || otherMembers.length === 0) {
    return [];
  }

  const friendIds = otherMembers.map(m => m.user_id);

  // Fetch profiles of friends
  const { data: friendProfiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .in('id', friendIds);

  // Attach threadId to each friend profile for DM navigation
  return (friendProfiles || []).map(profile => {
    const membership = otherMembers.find(m => m.user_id === profile.id);
    return {
      ...profile,
      threadId: membership?.thread_id || null
    };
  });
}

// Fetch pending friend requests
export async function getFriendRequests() {
  const supabaseUserClient = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  if (!user) {
    return [];
  }

  const supabaseAdmin = createSupabaseServiceClient();

  const { data: notifications } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('title', 'Lời mời kết bạn')
    .is('read_at', null)
    .order('created_at', { ascending: false });

  return (notifications || []).map(n => {
    let payload = {};
    try {
      payload = JSON.parse(n.body || '{}');
    } catch (e) {
      console.error('Failed to parse notification body JSON:', e);
    }
    return {
      id: n.id,
      created_at: n.created_at,
      ...payload
    };
  });
}

// Send a direct message in a DM thread
export async function sendDirectMessage(threadId: string, content: string) {
  const supabaseUserClient = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  if (!content?.trim()) {
    throw new Error('Message content cannot be empty');
  }

  const supabaseAdmin = createSupabaseServiceClient();

  const { error } = await supabaseAdmin
    .from('direct_messages')
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      content: content.trim(),
      type: 'text'
    });

  if (error) {
    console.error('Error inserting direct message:', error);
    throw new Error(error.message);
  }

  return { success: true };
}

// Fetch direct messages for a thread
export async function getDirectMessages(threadId: string) {
  const supabaseUserClient = await createSupabaseServerClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();

  if (!user) {
    return [];
  }

  const supabaseAdmin = createSupabaseServiceClient();

  const { data: messages, error } = await supabaseAdmin
    .from('direct_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching direct messages:', error);
    return [];
  }

  return messages || [];
}
