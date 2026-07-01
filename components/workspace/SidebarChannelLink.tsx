'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Phone, Lock, Edit3, X, Search, UserPlus, MicOff, Volume2, MoreVertical, Pencil, Trash2, Hash, ArrowUp, ArrowDown, Bell, BellOff } from 'lucide-react'
import { isChannelMuted, toggleChannelMute } from '@/lib/mute'
import { ChannelSettingsModal } from './ChannelSettingsModal'
import { Settings as SettingsIcon } from 'lucide-react'
import { useVoiceSettings, playVoiceTone } from '@/components/providers/VoiceSettingsProvider'
import { getFriends, sendDirectMessage } from '@/app/actions/friend'
import { updateChannel, deleteChannel, updateChannelTopic, moveChannel } from '@/app/actions/channel'
import { useUnread } from '@/components/providers/UnreadProvider'

interface ChannelItem {
  id: string
  name: string
  type: string
  is_private: boolean
  category_id?: string | null
  slowmode_seconds?: number | null
  is_announcement?: boolean | null
  is_nsfw?: boolean | null
}

interface SidebarChannelLinkProps {
  workspaceId: string
  channel: ChannelItem
}

export function SidebarChannelLink({ workspaceId, channel }: SidebarChannelLinkProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [showHint, setShowHint] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => {
    if (isInviteModalOpen) {
      setLoadingFriends(true);
      getFriends().then(res => {
        if (Array.isArray(res)) {
          setFriends(res);
        }
        setLoadingFriends(false);
      });
    }
  }, [isInviteModalOpen]);

  const handleSendInvite = async (friend: any) => {
    if (!friend.threadId) return;
    setInvitedFriendIds(prev => [...prev, friend.id]);
    
    const invitePayload = JSON.stringify({
      workspaceId,
      channelId: channel.id,
      channelName: channel.name
    });
    const inviteMessage = `[VOICE_INVITE]:${invitePayload}`;
    
    await sendDirectMessage(friend.threadId, inviteMessage, 'text');
  };

  const filteredFriends = friends.filter(f => 
    (f.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { activeParticipants, changeUserNickname, currentUser, setActiveChannelId, setWorkspaceId, speakingUserIds } = useVoiceSettings()
  
  const isVoice = channel.type === 'voice'
  const channelUrl = `/workspace/${workspaceId}/channel/${channel.id}`
  const isActive = pathname === channelUrl

  const { isUnread, markRead } = useUnread()
  const [muted, setMuted] = useState(false)
  useEffect(() => {
    setMuted(isChannelMuted(channel.id))
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (d?.channelId === channel.id) setMuted(!!d.muted)
    }
    window.addEventListener('app:mute-changed', onChange)
    return () => window.removeEventListener('app:mute-changed', onChange)
  }, [channel.id])
  const unread = !isActive && !muted && isUnread(channel.id)

  const handleToggleMute = () => {
    setMenuPosition(null)
    toggleChannelMute(channel.id)
  }

  const [settingsOpen, setSettingsOpen] = useState(false)

  // Filter participants currently connected to this voice channel
  const participants = isVoice
    ? activeParticipants.filter(p => p.voice_channel_id === channel.id)
    : []

  // Open the channel menu, clamped inside the viewport (so it isn't cut off
  // near the bottom/right edges).
  const openMenuAt = (clientX: number, clientY: number) => {
    const menuW = 200
    const menuH = isVoice ? 290 : 270
    let x = clientX
    let y = clientY
    if (x + menuW > window.innerWidth - 8) x = window.innerWidth - menuW - 8
    if (x < 8) x = 8
    if (y + menuH > window.innerHeight - 8) y = Math.max(8, clientY - menuH)
    setMenuPosition({ x, y })
  }

  // Handle right-click context menu (all channels)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    openMenuAt(e.clientX, e.clientY)
  }

  const handleRenameChannel = async () => {
    setMenuPosition(null)
    const newName = prompt('Tên kênh mới:', channel.name)
    if (newName === null) return
    const res = await updateChannel(channel.id, newName)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }

  const handleDeleteChannel = async () => {
    setMenuPosition(null)
    if (!confirm(`Xoá kênh "${channel.name}"? Toàn bộ tin nhắn trong kênh sẽ mất.`)) return
    const res = await deleteChannel(channel.id)
    if (res?.error) { alert(res.error); return }
    if (isActive) router.push(`/workspace/${workspaceId}`)
    router.refresh()
  }

  const handleSetTopic = async () => {
    setMenuPosition(null)
    const topic = prompt('Chủ đề kênh (để trống để xoá):', '')
    if (topic === null) return
    const res = await updateChannelTopic(channel.id, topic)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }

  const handleMove = async (direction: 'up' | 'down') => {
    setMenuPosition(null)
    const res = await moveChannel(channel.id, direction)
    if (res?.error) { alert(res.error); return }
    router.refresh()
  }

  // Handle single-click (shows a double-click hint for voice channels)
  const handleClick = (e: React.MouseEvent) => {
    markRead(channel.id)
    if (isVoice) {
      e.preventDefault()
      setShowHint(true)
      setTimeout(() => setShowHint(false), 2000)
    }
  }

  // Handle double-click
  const handleDoubleClick = () => {
    if (isVoice) {
      playVoiceTone('join');
      setActiveChannelId(channel.id);
      setWorkspaceId(workspaceId);
      router.push(channelUrl);
    }
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuPosition(null)
      }
    }
    if (menuPosition) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuPosition])

  const linkContent = (
    <div 
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`relative px-2 py-[6px] rounded cursor-pointer text-[15px] mb-0.5 flex items-center font-medium transition-colors group select-none ${
        isActive
          ? 'bg-white/15 text-white'
          : 'hover:bg-white/[0.08] text-white/60 hover:text-white/90'
      }`}
    >
      {/* Unread pill on the left edge (Discord-style) */}
      {unread && <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-2 rounded-full bg-white" />}
      <span className="mr-2.5 leading-none shrink-0 text-cyan-400 flex items-center">
        {isVoice ? <Volume2 size={16} /> : <span className="text-lg">#</span>}
      </span>
      <span className={`truncate flex-1 ${unread ? 'text-white font-bold' : ''} ${muted ? 'opacity-50' : ''}`}>{channel.name}</span>
      {muted && <BellOff size={12} className="text-zinc-500 ml-1.5 shrink-0" />}
      {channel.is_private && <Lock size={12} className="text-zinc-500 ml-2 shrink-0" />}

      {/* Channel options menu trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          openMenuAt(r.right, r.bottom + 4);
        }}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer ml-1 shrink-0"
        title="Tùy chọn kênh"
      >
        <MoreVertical size={13} />
      </button>

      {isVoice && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setIsInviteModalOpen(true);
          }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer ml-1.5 shrink-0"
          title="Mời bạn bè tham gia"
        >
          <UserPlus size={12} />
        </button>
      )}

      {/* Double click hint for voice channels */}
      {isVoice && showHint && (
        <span className="absolute right-2 bg-indigo-600/90 text-white text-[9px] px-1.5 py-0.5 rounded shadow-md border border-white/10 animate-fade-in-up font-bold tracking-wide pointer-events-none">
          Kích đúp để vào
        </span>
      )}
    </div>
  )

  return (
    <>
      {isVoice ? (
        // Voice channel: custom click behavior & active user list
        <div className="flex flex-col">
          {linkContent}
          
          {participants.length > 0 && (
            <div className="pl-6 pr-3 py-1 space-y-1 mb-1 animate-scale-in">
              {participants.map(p => {
                const isSelf = p.user_id === currentUser?.id
                const displayName = p.custom_name || p.display_name
                const initial = displayName.charAt(0).toUpperCase()

                const handleRename = (e: React.MouseEvent) => {
                  e.stopPropagation()
                  const newName = prompt(`Nhập biệt danh mới cho "${displayName}":`, displayName)
                  if (newName !== null) {
                    changeUserNickname(p.user_id, newName.trim())
                  }
                }

                const isSpeaking = speakingUserIds.includes(p.user_id)

                return (
                  <div key={p.user_id} className="flex items-center gap-2 group/user py-0.5 select-none hover:bg-white/5 rounded-lg px-2 transition-colors">
                    {/* Avatar */}
                    {p.avatar_key ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={`/api/media/${p.avatar_key}`} 
                        alt="" 
                        className={`w-6 h-6 rounded-full object-cover shrink-0 transition-all duration-200 ${isSpeaking ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-zinc-900 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`} 
                      />
                    ) : (
                      <div className={`w-6 h-6 rounded-full bg-[#35363c] text-zinc-300 text-[10px] font-bold flex items-center justify-center border border-white/5 shrink-0 transition-all duration-200 ${isSpeaking ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-zinc-900 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`}>
                        {initial}
                      </div>
                    )}
                    
                    {/* Display Name */}
                    <span className="text-xs text-zinc-300 truncate flex-1 font-semibold group-hover/user:text-zinc-150 transition-colors">
                      {displayName} {isSelf && <span className="text-[9px] text-zinc-500 font-bold">(Bạn)</span>}
                    </span>

                    {/* Mute status indicator on the right */}
                    {(p.is_muted || p.is_deafened) && (
                      <MicOff size={11} className="text-zinc-500 shrink-0 mr-1" />
                    )}

                    {/* Rename trigger (only shown for the user themselves in this view) */}
                    {isSelf && (
                      <button
                        onClick={handleRename}
                        className="opacity-0 group-hover/user:opacity-100 text-zinc-400 hover:text-white transition-opacity p-0.5 cursor-pointer shrink-0"
                        title="Đổi biệt danh"
                      >
                        <Edit3 size={10} />
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Mời vào Kênh thoại row */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInviteModalOpen(true);
                }}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 cursor-pointer select-none transition-colors group/invite"
              >
                <div className="w-6 h-6 rounded-full bg-[#2b2d31]/80 border border-white/5 flex items-center justify-center shrink-0 text-zinc-400 group-hover/invite:bg-[#35363c] transition-colors">
                  <UserPlus size={11} />
                </div>
                <span className="text-[11px] font-semibold flex-1">Mời vào Kênh thoại</span>
                <span className="text-[10px] text-zinc-500 group-hover/invite:text-zinc-400 transition-colors">➔</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Text channel: standard Link navigation
        <Link href={channelUrl}>
          {linkContent}
        </Link>
      )}

      {/* Custom Context Menu — portaled to <body> so an ancestor's backdrop
          filter doesn't break `position: fixed` (which would clip/offscreen it). */}
      {menuPosition && createPortal(
        <div
          ref={menuRef}
          style={{ top: menuPosition.y, left: menuPosition.x }}
          className="fixed z-[100] bg-[#1e1b4b]/95 border border-white/15 backdrop-blur-2xl rounded-xl p-1.5 shadow-2xl animate-scale-in text-white w-48"
        >
          {isVoice && (
            <button
              onClick={() => {
                playVoiceTone('join')
                setActiveChannelId(channel.id)
                setWorkspaceId(workspaceId)
                router.push(channelUrl)
                setMenuPosition(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer text-left"
            >
              <Phone size={14} className="text-cyan-400 shrink-0" />
              <span>Tham gia hội thoại</span>
            </button>
          )}
          <button
            onClick={handleRenameChannel}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left"
          >
            <Pencil size={14} className="text-zinc-300 shrink-0" />
            <span>Đổi tên kênh</span>
          </button>
          {!isVoice && (
            <button
              onClick={handleSetTopic}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left"
            >
              <Hash size={14} className="text-zinc-300 shrink-0" />
              <span>Đặt chủ đề</span>
            </button>
          )}
          {!isVoice && (
            <button
              onClick={() => { setMenuPosition(null); setSettingsOpen(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left"
            >
              <SettingsIcon size={14} className="text-zinc-300 shrink-0" />
              <span>Cài đặt kênh</span>
            </button>
          )}
          <button
            onClick={() => handleMove('up')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left"
          >
            <ArrowUp size={14} className="text-zinc-300 shrink-0" />
            <span>Di chuyển lên</span>
          </button>
          <button
            onClick={() => handleMove('down')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left"
          >
            <ArrowDown size={14} className="text-zinc-300 shrink-0" />
            <span>Di chuyển xuống</span>
          </button>
          <button
            onClick={handleToggleMute}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-left"
          >
            {muted ? <Bell size={14} className="text-zinc-300 shrink-0" /> : <BellOff size={14} className="text-zinc-300 shrink-0" />}
            <span>{muted ? 'Bật thông báo' : 'Tắt thông báo'}</span>
          </button>
          <button
            onClick={handleDeleteChannel}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors cursor-pointer text-left"
          >
            <Trash2 size={14} className="shrink-0" />
            <span>Xoá kênh</span>
          </button>
        </div>,
        document.body
      )}

      {settingsOpen && (
        <ChannelSettingsModal
          channelId={channel.id}
          channelName={channel.name}
          initial={{
            slowmodeSeconds: channel.slowmode_seconds || 0,
            isAnnouncement: !!channel.is_announcement,
            isNsfw: !!channel.is_nsfw,
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Invite Friends Modal */}
      {isInviteModalOpen && (
        <div 
          onClick={() => setIsInviteModalOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-default animate-fade-in"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-[#2b2d31] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-5 animate-scale-in text-white"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wide">Mời bạn bè vào đàm thoại</h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4 font-medium leading-relaxed">
              Gửi tin nhắn mời tham gia kênh thoại <strong className="text-cyan-400">🔊 {channel.name}</strong> cho bạn bè của bạn.
            </p>

            {/* Search Box */}
            <div className="bg-black/20 border border-white/5 rounded-xl py-2 px-3 flex items-center mb-4 focus-within:border-indigo-500 transition-colors">
              <Search size={14} className="text-zinc-500 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent w-full outline-none text-xs text-white placeholder:text-zinc-500 font-medium"
              />
            </div>

            {/* Friends List */}
            <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {loadingFriends ? (
                <p className="text-xs text-zinc-500 text-center py-4 font-medium animate-pulse">Đang tải danh sách bạn bè...</p>
              ) : filteredFriends.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4 font-medium">Không tìm thấy bạn bè nào</p>
              ) : (
                filteredFriends.map(f => {
                  const isInvited = invitedFriendIds.includes(f.id);
                  const fInitial = (f.display_name || 'U').charAt(0).toUpperCase();
                  const fAvatar = f.avatar_key ? `/api/media/${f.avatar_key}` : null;

                  return (
                    <div key={f.id} className="flex items-center justify-between bg-black/10 p-2 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {fAvatar ? (
                          <img src={fAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-black flex items-center justify-center border border-indigo-500/10 shrink-0">
                            {fInitial}
                          </div>
                        )}
                        <div className="min-w-0 flex flex-col">
                          <span className="text-xs font-extrabold text-zinc-200 truncate leading-none">{f.display_name}</span>
                          <span className="text-[9px] text-zinc-500 mt-1 font-semibold truncate leading-none">@{f.username}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isInvited}
                        onClick={() => handleSendInvite(f)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide cursor-pointer transition-all ${
                          isInvited 
                            ? 'bg-zinc-800 text-zinc-500' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02]'
                        }`}
                      >
                        {isInvited ? 'Đã mời ✔' : 'Mời'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 transition-colors text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
