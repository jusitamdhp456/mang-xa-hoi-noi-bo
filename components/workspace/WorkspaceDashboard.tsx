'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreateChannelModal } from './CreateChannelModal'
import { 
  Hash, 
  Volume2, 
  Lock, 
  Users, 
  Sparkles, 
  MessageSquare, 
  PhoneCall, 
  Search, 
  ChevronRight, 
  Grid,
  FolderOpen,
  Phone
} from 'lucide-react'

interface CategoryItem {
  id: string
  name: string
}

interface ChannelItem {
  id: string
  name: string
  type: string
  topic?: string | null
  is_private: boolean
  category_id?: string | null
}

interface MemberItem {
  role: string
  profiles: {
    id: string
    display_name: string
    avatar_key: string | null
    status_text: string | null
  } | null
}

interface WorkspaceDashboardProps {
  workspaceId: string
  workspaceName: string
  categories: CategoryItem[]
  channels: ChannelItem[]
  members: MemberItem[]
}

export function WorkspaceDashboard({
  workspaceId,
  workspaceName,
  categories,
  channels,
  members
}: WorkspaceDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'text' | 'voice'>('all')

  const totalMembers = members.length
  const textChannelsCount = channels.filter(c => c.type === 'text').length
  const voiceChannelsCount = channels.filter(c => c.type === 'voice').length

  // Filter channels based on search and type
  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (channel.topic && channel.topic.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = filterType === 'all' || 
      (filterType === 'text' && channel.type === 'text') ||
      (filterType === 'voice' && channel.type === 'voice')

    return matchesSearch && matchesType
  })

  // Group channels by category for structured view
  const uncategorizedChannels = filteredChannels.filter(c => !c.category_id)
  
  const categoryGroups = categories.map(cat => {
    return {
      category: cat,
      channels: filteredChannels.filter(c => c.category_id === cat.id)
    }
  }).filter(group => group.channels.length > 0 || searchTerm === '') // Hide empty categories only when searching

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent select-none animate-scale-in">
      {/* Header Banner */}
      <div className="relative shrink-0 p-6 md:p-8 border-b border-white/10 bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-cyan-900/20 backdrop-blur-md overflow-hidden">
        {/* Glow effect decorative balls */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-30px] left-[20%] w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-indigo-500/20 flex items-center gap-1">
                <Sparkles size={12} className="animate-pulse" />
                Không gian làm việc
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-sm truncate">
              {workspaceName}
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm mt-1 max-w-xl font-medium">
              Chào mừng bạn trở lại! Hãy chọn một kênh hội thoại bên dưới hoặc tạo kênh mới để bắt đầu trò chuyện cùng đồng nghiệp.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <CreateChannelModal
              workspaceId={workspaceId}
              categories={categories}
              triggerType="button"
            />
            <CreateChannelModal
              workspaceId={workspaceId}
              isCategory={true}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 max-w-md mt-6 pt-4 border-t border-white/5">
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <MessageSquare size={16} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Kênh Chat</p>
              <p className="text-sm font-bold text-white leading-none mt-0.5">{textChannelsCount}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <PhoneCall size={16} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Kênh Thoại</p>
              <p className="text-sm font-bold text-white leading-none mt-0.5">{voiceChannelsCount}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Thành viên</p>
              <p className="text-sm font-bold text-white leading-none mt-0.5">{totalMembers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Channels Directory & Search */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 gap-6">
          
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm kênh nhanh..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/20 border border-white/5 text-xs text-white rounded-xl pl-10 pr-4 py-2.5 outline-none placeholder:text-zinc-500 focus:border-indigo-500 focus:bg-black/30 transition-all"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex p-0.5 bg-black/30 rounded-xl border border-white/5 self-stretch sm:self-auto gap-0.5">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterType === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterType('text')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${filterType === 'text' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Hash size={12} />
                Kênh Chat
              </button>
              <button
                onClick={() => setFilterType('voice')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${filterType === 'voice' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <Volume2 size={12} />
                Kênh Thoại
              </button>
            </div>
          </div>

          {/* Channels Grid / Directory */}
          <div className="flex-1 flex flex-col gap-6 min-h-0">
            {filteredChannels.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white/5 border border-white/5 rounded-3xl">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 mb-4 text-xl">
                  📭
                </div>
                <h3 className="text-white font-bold text-base mb-1">Không tìm thấy kênh nào</h3>
                <p className="text-zinc-400 text-xs max-w-xs mb-4">
                  {searchTerm ? 'Không tìm thấy kênh phù hợp với từ khóa của bạn.' : 'Workspace hiện chưa có kênh hội thoại nào.'}
                </p>
                <CreateChannelModal 
                  workspaceId={workspaceId} 
                  categories={categories} 
                  triggerType="text-link" 
                />
              </div>
            ) : (
              <>
                {/* Uncategorized Channels */}
                {uncategorizedChannels.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Grid size={12} className="text-zinc-500" />
                      Kênh Chung
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {uncategorizedChannels.map(channel => (
                        <ChannelCard key={channel.id} channel={channel} workspaceId={workspaceId} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Categorized Channels */}
                {categoryGroups.map(group => (
                  <div key={group.category.id} className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1">
                      <FolderOpen size={12} className="text-indigo-400" />
                      {group.category.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.channels.map(channel => (
                        <ChannelCard key={channel.id} channel={channel} workspaceId={workspaceId} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Quick Member List Widget */}
        <div className="w-72 bg-black/10 border-l border-white/10 p-6 hidden xl:flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 shrink-0">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={14} className="text-indigo-400" />
              Thành viên ({totalMembers})
            </h3>
          </div>
          
          <div className="flex flex-col gap-2">
            {members.map(member => {
              if (!member.profiles) return null
              const initial = member.profiles.display_name?.charAt(0).toUpperCase() || 'M'
              const avatar = member.profiles.avatar_key 
                ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${member.profiles.avatar_key}` 
                : null

              return (
                <div 
                  key={member.profiles.id} 
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group cursor-pointer"
                >
                  <div className="relative flex-shrink-0">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-sm">
                        {initial}
                      </div>
                    )}
                    {/* Role badge */}
                    <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-[8px] font-extrabold uppercase px-1 rounded-sm text-white scale-90 border border-slate-900">
                      {member.role === 'owner' ? '👑' : member.role === 'admin' ? 'AD' : 'MB'}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                      {member.profiles.display_name}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {member.profiles.status_text || 'Không có trạng thái'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ChannelCard({ channel, workspaceId }: { channel: ChannelItem; workspaceId: string }) {
  const isVoice = channel.type === 'voice'
  const router = useRouter()
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [showHint, setShowHint] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const channelUrl = `/workspace/${workspaceId}/channel/${channel.id}`

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isVoice) return
    e.preventDefault()
    setMenuPosition({ x: e.clientX, y: e.clientY })
  }

  // Handle single click (shows hint for voice, navigates for text)
  const handleClick = (e: React.MouseEvent) => {
    if (isVoice) {
      e.preventDefault()
      setShowHint(true)
      setTimeout(() => setShowHint(false), 2000)
    } else {
      router.push(channelUrl)
    }
  }

  // Handle double click
  const handleDoubleClick = () => {
    if (isVoice) {
      router.push(channelUrl)
    }
  }

  // Close context menu on click outside
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

  const cardContent = (
    <div 
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className="bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 h-full relative group hover:shadow-lg hover:shadow-indigo-500/5 select-none"
    >
      {/* Border Glow Highlight on Hover */}
      <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-indigo-500/20 pointer-events-none transition-colors" />

      {/* Double click hint for voice channels */}
      {isVoice && showHint && (
        <div className="absolute inset-0 rounded-2xl bg-indigo-950/80 backdrop-blur-xs flex items-center justify-center text-xs font-bold text-cyan-300 animate-scale-in border border-indigo-500/30">
          🔊 Nhấp đúp (Double-click) để tham gia thoại
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Channel Icon Wrapper */}
          <div className={`p-2.5 rounded-xl shrink-0 ${isVoice ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'}`}>
            {isVoice ? <Volume2 size={18} /> : <Hash size={18} />}
          </div>
          
          <div className="min-w-0">
            <h4 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors flex items-center gap-1.5 truncate">
              {channel.name}
              {channel.is_private && <Lock size={12} className="text-zinc-500 shrink-0" />}
            </h4>
            <p className="text-zinc-400 text-xs truncate mt-0.5">
              {channel.topic || (isVoice ? 'Kênh đàm thoại trực tuyến' : 'Kênh trao đổi bằng văn bản')}
            </p>
          </div>
        </div>
      </div>

      {/* Action Button Area */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {isVoice ? 'Thoại' : 'Văn bản'}
        </span>
        <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
          <span>{isVoice ? 'Kích đúp để vào' : 'Vào trò chuyện'}</span>
          <ChevronRight size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {isVoice ? (
        cardContent
      ) : (
        <Link href={channelUrl}>
          {cardContent}
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
    </>
  )
}
