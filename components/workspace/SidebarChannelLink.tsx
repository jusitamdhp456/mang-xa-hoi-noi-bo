'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Phone, Lock, Edit3, X, Search, UserPlus } from 'lucide-react'
import { useVoiceSettings } from '@/components/providers/VoiceSettingsProvider'
import { getFriends, sendDirectMessage } from '@/app/actions/friend'

interface ChannelItem {
  id: string
  name: string
  type: string
  is_private: boolean
  category_id?: string | null
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
    
    const inviteLink = `${window.location.origin}/workspace/${workspaceId}/channel/${channel.id}`;
    const inviteMessage = `👋 Hãy tham gia kênh đàm thoại "${channel.name}" cùng tôi nhé!\nLiên kết tham gia: ${inviteLink}`;
    
    await sendDirectMessage(friend.threadId, inviteMessage, 'text');
  };

  const filteredFriends = friends.filter(f => 
    (f.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { activeParticipants, changeUserNickname, currentUser } = useVoiceSettings()
  
  const isVoice = channel.type === 'voice'
  const channelUrl = `/workspace/${workspaceId}/channel/${channel.id}`
  const isActive = pathname === channelUrl

  // Filter participants currently connected to this voice channel
  const participants = isVoice
    ? activeParticipants.filter(p => p.voice_channel_id === channel.id)
    : []

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isVoice) return // Only voice channels have this behavior
    e.preventDefault()
    setMenuPosition({ x: e.clientX, y: e.clientY })
  }

  // Handle single-click (shows a double-click hint for voice channels)
  const handleClick = (e: React.MouseEvent) => {
    if (isVoice) {
      e.preventDefault()
      setShowHint(true)
      setTimeout(() => setShowHint(false), 2000)
    }
  }

  // Handle double-click
  const handleDoubleClick = () => {
    if (isVoice) {
      router.push(channelUrl)
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
      className={`relative px-3 py-2 rounded-xl cursor-pointer text-sm mb-1 flex items-center font-medium transition-all group select-none ${
        isActive 
          ? 'bg-white/15 text-white shadow-sm border border-white/5' 
          : 'hover:bg-white/10 text-white/70 hover:text-white hover:shadow-sm'
      }`}
    >
      <span className="mr-3 text-lg leading-none shrink-0 text-cyan-400">
        {isVoice ? '🔊' : '#'}
      </span>
      <span className="truncate flex-1">{channel.name}</span>
      {channel.is_private && <Lock size={12} className="text-zinc-500 ml-2 shrink-0" />}

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
            <div className="pl-8 pr-3 py-1 space-y-1 mb-1.5 animate-scale-in">
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

                return (
                  <div key={p.user_id} className="flex items-center gap-2 group/user py-0.5 select-none">
                    {/* Avatar */}
                    {p.avatar_key ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={`https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${p.avatar_key}`} 
                        alt="" 
                        className="w-4.5 h-4.5 rounded-full object-cover shrink-0" 
                      />
                    ) : (
                      <div className="w-4.5 h-4.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold flex items-center justify-center border border-indigo-500/10 shrink-0">
                        {initial}
                      </div>
                    )}
                    
                    {/* Display Name */}
                    <span className="text-xs text-white/60 truncate flex-1 font-medium group-hover/user:text-white/80 transition-colors">
                      {displayName} {isSelf && <span className="text-[9px] text-zinc-500 font-bold">(Bạn)</span>}
                    </span>

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
            </div>
          )}
        </div>
      ) : (
        // Text channel: standard Link navigation
        <Link href={channelUrl}>
          {linkContent}
        </Link>
      )}

      {/* Custom Context Menu */}
      {menuPosition && (
        <div 
          ref={menuRef}
          style={{ top: menuPosition.y, left: menuPosition.x }}
          className="fixed z-50 bg-[#1e1b4b]/95 border border-white/15 backdrop-blur-2xl rounded-xl p-1.5 shadow-2xl animate-scale-in text-white w-48"
        >
          <button
            onClick={() => {
              router.push(channelUrl)
              setMenuPosition(null)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer text-left"
          >
            <Phone size={14} className="text-cyan-400 shrink-0" />
            <span>Tham gia hội thoại</span>
          </button>
        </div>
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
                  const fAvatar = f.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${f.avatar_key}` : null;

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
