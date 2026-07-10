'use server'

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'

// Utility to verify user has access to the channel
async function verifyAccessAndGetMessage(messageId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check if they can read the message (RLS will handle this)
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .select('id, content, channel_id')
    .eq('id', messageId)
    .single()

  if (msgError || !msg) return { error: 'Không tìm thấy tin nhắn hoặc bạn không có quyền' }

  // Get user profile for display names
  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
  const userName = profile?.display_name || user.email?.split('@')[0] || 'User'

  return { user, userName, msg }
}

// Utility to update the message using service client (bypassing sender-only restriction)
async function updateGameMessage(messageId: string, newContent: string) {
  const service = createSupabaseServiceClient()
  const { error } = await service.from('messages').update({ content: newContent }).eq('id', messageId)
  if (error) return { error: 'Lỗi cập nhật game' }
  return { success: true }
}

// --- ROULETTE (Cò quay Nga) ---

export async function pullRouletteTrigger(messageId: string) {
  const { user, userName, msg, error } = await verifyAccessAndGetMessage(messageId)
  if (error || !msg || !user) return { error }

  if (!msg.content?.startsWith('[MINIGAME:ROULETTE]:')) return { error: 'Invalid game format' }
  
  const jsonStr = msg.content.substring('[MINIGAME:ROULETTE]:'.length)
  let state;
  try {
    state = JSON.parse(jsonStr)
  } catch (e) { return { error: 'Lỗi dữ liệu game' } }

  if (state.status === 'ENDED') return { error: 'Trò chơi đã kết thúc' }
  if (state.dead && state.dead.userId === user.id) return { error: 'Bạn đã chết rồi!' }
  // Optional: Prevent clicking again if already survived this round, but let's allow it for fun

  state.currentTurn += 1;
  
  if (state.currentTurn === state.bulletPos) {
    // BANG!
    state.dead = { userId: user.id, name: userName }
    state.status = 'ENDED'
  } else {
    // CLICK.
    // Ensure they are in survivors list
    if (!state.survivors.some((s: any) => s.userId === user.id)) {
      state.survivors.push({ userId: user.id, name: userName })
    }
  }

  const newContent = `[MINIGAME:ROULETTE]:${JSON.stringify(state)}`
  return updateGameMessage(messageId, newContent)
}

// --- GIVEAWAY (Rút thăm) ---

export async function joinGiveaway(messageId: string) {
  const { user, userName, msg, error } = await verifyAccessAndGetMessage(messageId)
  if (error || !msg || !user) return { error }

  if (!msg.content?.startsWith('[MINIGAME:GIVEAWAY]:')) return { error: 'Invalid game format' }
  
  const jsonStr = msg.content.substring('[MINIGAME:GIVEAWAY]:'.length)
  let state;
  try {
    state = JSON.parse(jsonStr)
  } catch (e) { return { error: 'Lỗi dữ liệu game' } }

  if (state.status === 'ENDED') return { error: 'Giveaway đã kết thúc' }
  if (state.participants.some((p: any) => p.userId === user.id)) return { error: 'Bạn đã tham gia rồi' }

  state.participants.push({ userId: user.id, name: userName })

  const newContent = `[MINIGAME:GIVEAWAY]:${JSON.stringify(state)}`
  return updateGameMessage(messageId, newContent)
}

export async function rollGiveaway(messageId: string) {
  const { user, msg, error } = await verifyAccessAndGetMessage(messageId)
  if (error || !msg || !user) return { error }

  if (!msg.content?.startsWith('[MINIGAME:GIVEAWAY]:')) return { error: 'Invalid game format' }
  const jsonStr = msg.content.substring('[MINIGAME:GIVEAWAY]:'.length)
  let state = JSON.parse(jsonStr)

  if (state.hostId !== user.id) return { error: 'Chỉ người tạo mới được quay thưởng' }
  if (state.status === 'ENDED') return { error: 'Giveaway đã kết thúc' }
  if (state.participants.length === 0) return { error: 'Chưa có ai tham gia' }

  const winnerIndex = Math.floor(Math.random() * state.participants.length)
  state.winner = state.participants[winnerIndex]
  state.status = 'ENDED'

  const newContent = `[MINIGAME:GIVEAWAY]:${JSON.stringify(state)}`
  return updateGameMessage(messageId, newContent)
}

// --- DICE (Tài Xỉu) ---

export async function betDice(messageId: string, choice: 'TAI' | 'XIU') {
  const { user, userName, msg, error } = await verifyAccessAndGetMessage(messageId)
  if (error || !msg || !user) return { error }

  if (!msg.content?.startsWith('[MINIGAME:DICE]:')) return { error: 'Invalid game format' }
  const jsonStr = msg.content.substring('[MINIGAME:DICE]:'.length)
  let state = JSON.parse(jsonStr)

  if (state.status === 'ROLLED') return { error: 'Đã mở bát, không thể đặt thêm!' }
  
  // Remove existing bet if any
  state.players = state.players.filter((p: any) => p.userId !== user.id)
  state.players.push({ userId: user.id, name: userName, choice })

  const newContent = `[MINIGAME:DICE]:${JSON.stringify(state)}`
  return updateGameMessage(messageId, newContent)
}

export async function rollDice(messageId: string) {
  const { user, msg, error } = await verifyAccessAndGetMessage(messageId)
  if (error || !msg || !user) return { error }

  if (!msg.content?.startsWith('[MINIGAME:DICE]:')) return { error: 'Invalid game format' }
  const jsonStr = msg.content.substring('[MINIGAME:DICE]:'.length)
  let state = JSON.parse(jsonStr)

  if (state.hostId !== user.id) return { error: 'Chỉ người làm cái mới được mở bát' }
  if (state.status === 'ROLLED') return { error: 'Đã mở bát rồi' }

  // Generate 3 dice 1-6
  state.dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ]
  state.status = 'ROLLED'

  const newContent = `[MINIGAME:DICE]:${JSON.stringify(state)}`
  return updateGameMessage(messageId, newContent)
}
