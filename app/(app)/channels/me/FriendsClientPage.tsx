'use client';

import React, { useState } from 'react';
import { UserPanel } from '@/components/workspace/UserPanel';
import { User, MessageSquare, Plus, Search, HelpCircle, Compass, Gamepad2, Phone, Video, Send, Check } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { VoiceRoom } from '@/components/workspace/VoiceRoom';

interface FriendsClientPageProps {
  user: SupabaseUser;
  profile: any;
  otherProfiles: any[];
}

type TabType = 'online' | 'all' | 'pending' | 'add';

export default function FriendsClientPage({ user, profile, otherProfiles }: FriendsClientPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('online');
  const [dmSearch, setDmSearch] = useState('');
  const [friendSearch, setFriendSearch] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendStatus, setAddFriendStatus] = useState('');

  // Selected direct chat state
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Calling states
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');

  // Group Voice Rooms states
  const [voiceRooms, setVoiceRooms] = useState([
    { id: 'general-lobby', name: 'Phòng thoại chung' },
    { id: 'gaming-lounge', name: 'Kênh chơi game' }
  ]);
  const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>(null);
  const [isCreateVoiceRoomOpen, setIsCreateVoiceRoomOpen] = useState(false);
  const [newVoiceRoomName, setNewVoiceRoomName] = useState('');
  
  // Persistent Friends State (loads and saves from/to localStorage)
  const [friendIds, setFriendIds] = useState<string[]>([]);
  
  // Persistent Direct Messages State
  const [chatMessages, setChatMessages] = useState<Record<string, Array<{ sender: 'me' | 'them', text: string, time: string }>>>({});
  const [currentMessageInput, setCurrentMessageInput] = useState('');

  // 1. Initialize persistent friends and DMs list
  useEffect(() => {
    // Load friends
    const savedFriends = localStorage.getItem('friends_ids');
    if (savedFriends) {
      setFriendIds(JSON.parse(savedFriends));
    } else {
      // Seed with first 2 profiles from otherProfiles so the list is populated initially
      const seed = otherProfiles.slice(0, 2).map(p => p.id);
      setFriendIds(seed);
      localStorage.setItem('friends_ids', JSON.stringify(seed));
    }

    // Load chat logs
    const savedMessages = localStorage.getItem('chat_messages');
    if (savedMessages) {
      setChatMessages(JSON.parse(savedMessages));
    } else {
      const initialLogs = {
        default: [
          { sender: 'them' as const, text: 'Chào cậu! Cậu khoẻ không?', time: '10:15 AM' },
          { sender: 'me' as const, text: 'Tớ khoẻ, cảm ơn cậu! Còn cậu?', time: '10:16 AM' },
          { sender: 'them' as const, text: 'Tớ cũng ổn, đang code giao diện nè haha.', time: '10:18 AM' }
        ]
      };
      setChatMessages(initialLogs);
      localStorage.setItem('chat_messages', JSON.stringify(initialLogs));
    }
  }, [otherProfiles]);

  // Assign mock online status & activities to profiles for high fidelity
  const mockStatusAndActivity = (id: string, index: number) => {
    const statuses: Array<'online' | 'idle' | 'offline'> = ['online', 'idle', 'offline', 'online'];
    const status = statuses[index % statuses.length];
    
    let activity = null;
    if (index === 0) {
      activity = {
        game: 'League of Legends',
        detail: 'Trong trận ARAM - 3 phút',
        icon: '🎮'
      };
    } else if (index === 1) {
      activity = {
        game: 'Visual Studio Code',
        detail: 'Đang sửa file layout.tsx',
        icon: '💻'
      };
    }

    return { status, activity };
  };

  const profilesWithStatus = otherProfiles.map((p, idx) => ({
    ...p,
    ...mockStatusAndActivity(p.id, idx)
  }));

  // Filter profiles based on established friendships
  const friendsProfiles = profilesWithStatus.filter(p => friendIds.includes(p.id));

  // Filtering lists
  const filteredDMs = friendsProfiles.filter(p => 
    (p.display_name || '').toLowerCase().includes(dmSearch.toLowerCase())
  );

  const friendsList = friendsProfiles.filter(p => 
    p.status !== 'offline' && 
    (p.display_name || '').toLowerCase().includes(friendSearch.toLowerCase())
  );

  const allList = friendsProfiles.filter(p => 
    (p.display_name || '').toLowerCase().includes(friendSearch.toLowerCase())
  );

  const activeChatPartner = profilesWithStatus.find(p => p.id === selectedChatId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessageInput.trim() || !selectedChatId) return;

    const partnerMessages = chatMessages[selectedChatId] || [];
    const newMsg = {
      sender: 'me' as const,
      text: currentMessageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = {
      ...chatMessages,
      [selectedChatId]: [...partnerMessages, newMsg]
    };

    setChatMessages(updatedMessages);
    localStorage.setItem('chat_messages', JSON.stringify(updatedMessages));
    setCurrentMessageInput('');

    // Simulate reply from the partner after 1.5 seconds
    const replyTexts = [
      "Nghe tuyệt đấy!",
      "Tớ đồng ý nha.",
      "Chờ tớ một chút nhé.",
      "Haha ok luôn!",
      "Để tớ xem lại đã.",
      "Giao diện đẹp thật sự!"
    ];
    setTimeout(() => {
      setChatMessages(prev => {
        const partnerMsgs = prev[selectedChatId] || [];
        const replyMsg = {
          sender: 'them' as const,
          text: replyTexts[Math.floor(Math.random() * replyTexts.length)],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        const finalMessages = {
          ...prev,
          [selectedChatId]: [...partnerMsgs, replyMsg]
        };
        localStorage.setItem('chat_messages', JSON.stringify(finalMessages));
        return finalMessages;
      });
    }, 1500);
  };

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = addFriendInput.trim();
    if (!query) return;

    // Search for user in database profiles by username or UUID
    const foundUser = otherProfiles.find(p => 
      p.username?.toLowerCase() === query.toLowerCase() ||
      p.id === query
    );

    if (foundUser) {
      if (friendIds.includes(foundUser.id)) {
        setAddFriendStatus(`Bạn và "${foundUser.display_name}" đã kết bạn từ trước.`);
      } else {
        const updatedFriends = [...friendIds, foundUser.id];
        setFriendIds(updatedFriends);
        localStorage.setItem('friends_ids', JSON.stringify(updatedFriends));
        setAddFriendStatus(`Thành công! Đã kết bạn với "${foundUser.display_name}".`);
      }
    } else {
      setAddFriendStatus(`Không tìm thấy người dùng có Tên/ID: "${query}".`);
    }

    setAddFriendInput('');
    setTimeout(() => setAddFriendStatus(''), 4000);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-transparent text-zinc-300 select-none">
      
      {/* COLUMN 1: DIRECT MESSAGES SIDEBAR */}
      <div className="w-60 bg-black/20 backdrop-blur-xl flex-shrink-0 flex flex-col h-full border-r border-white/10 animate-slide-in-left">
        
        {/* Search Header */}
        <div className="h-16 px-4 border-b border-white/10 flex items-center justify-center flex-shrink-0 bg-black/10">
          <div className="w-full bg-black/35 text-xs text-zinc-400 rounded-lg p-2 px-3 flex items-center justify-between cursor-pointer hover:bg-black/50 border border-white/5 transition-all">
            <span>Tìm cuộc trò chuyện...</span>
            <span className="text-zinc-500 text-[10px] bg-white/10 px-1.5 py-0.5 rounded border border-white/5 shadow-sm">⌘K</span>
          </div>
        </div>

        {/* Main DM Navigation Links */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button 
            onClick={() => {
              setSelectedChatId(null);
              setActiveVoiceRoomId(null);
            }}
            className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedChatId === null && activeVoiceRoomId === null ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-zinc-200 text-zinc-400'}`}
          >
            <User size={20} className="flex-shrink-0" />
            <span>Bạn bè</span>
          </button>

          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-lg leading-none">🚀</span>
              <span>Nitro</span>
            </div>
            <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase leading-none">Mới</span>
          </button>

          <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-lg leading-none">🛍️</span>
              <span>Cửa hàng</span>
            </div>
            <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase leading-none">Mới</span>
          </button>

          <button className="w-full flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors">
            <span className="text-lg leading-none">🏆</span>
            <span>Nhiệm vụ</span>
          </button>

          {/* Group Voice Rooms Section */}
          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-[11px] font-bold text-zinc-500 tracking-wider uppercase group">
            <span>Kênh thoại nhóm</span>
            <button 
              onClick={() => setIsCreateVoiceRoomOpen(true)}
              className="hover:text-zinc-300 transition-colors"
              title="Tạo kênh thoại mới"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-0.5 mt-1 mb-4">
            {voiceRooms.map(room => {
              const isSelected = activeVoiceRoomId === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedChatId(null);
                    setActiveVoiceRoomId(room.id);
                  }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left ${isSelected ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-zinc-200 text-zinc-400'}`}
                >
                  <span className="text-lg leading-none text-zinc-400">🔊</span>
                  <span className="truncate text-white text-sm font-medium">{room.name}</span>
                </button>
              );
            })}
          </div>

          {/* DM Users List Header */}
          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-[11px] font-bold text-zinc-500 tracking-wider uppercase group border-t border-white/5">
            <span>Tin nhắn trực tiếp</span>
            <button className="hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus size={14} />
            </button>
          </div>

          {/* DM Users */}
          <div className="space-y-0.5 mt-1">
            {filteredDMs.map(p => {
              const avatar = p.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${p.avatar_key}` : null;
              const name = p.display_name || p.username || 'User';
              const isSelected = selectedChatId === p.id;
              
              // Status Badge styling
              let statusBg = 'bg-zinc-500';
              if (p.status === 'online') statusBg = 'bg-green-500';
              else if (p.status === 'idle') statusBg = 'bg-yellow-500';

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedChatId(p.id);
                    setActiveVoiceRoomId(null);
                  }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors text-left ${isSelected ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-zinc-200 text-zinc-400'}`}
                >
                  <div className="relative flex-shrink-0">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-white text-xs font-bold uppercase">
                        {name.charAt(0)}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#16133a] ${statusBg}`}></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-white text-sm font-medium">{name}</p>
                    {p.status_text && (
                      <p className="text-xs text-zinc-500 truncate leading-none mt-0.5">{p.status_text}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* User panel */}
        <UserPanel user={user} profile={profile} />
      </div>

      {/* COLUMN 2: MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-full bg-white/5 animate-scale-in">
        
        {/* TAB OR CHAT HEADER */}
        {selectedChatId === null ? (
          /* Friends Navigation Header */
          <div className="h-16 border-b border-white/10 flex items-center px-6 gap-4 flex-shrink-0 bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2 pr-4 border-r border-white/10 text-white">
              <User size={20} className="text-zinc-400" />
              <span className="font-semibold text-sm">Bạn bè</span>
            </div>
            
            <div className="flex gap-2 text-sm font-medium">
              <button 
                onClick={() => setActiveTab('online')}
                className={`px-3 py-1.5 rounded transition-colors ${activeTab === 'online' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
              >
                Trực tuyến
              </button>
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded transition-colors ${activeTab === 'all' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded transition-colors relative ${activeTab === 'pending' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
              >
                Chờ xử lý
                <span className="absolute top-1 right-0.5 w-2 h-2 rounded-full bg-red-500"></span>
              </button>
              <button 
                onClick={() => setActiveTab('add')}
                className={`px-3 py-1.5 rounded font-bold transition-all ${activeTab === 'add' ? 'text-green-400 bg-green-500/10' : 'text-green-500 hover:text-green-400 hover:bg-green-500/5'}`}
              >
                Thêm Bạn
              </button>
            </div>
          </div>
        ) : (
          /* Direct Message Chat Header */
          <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between flex-shrink-0 bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                {activeChatPartner?.avatar_key ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${activeChatPartner.avatar_key}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-white text-xs font-bold">
                    {(activeChatPartner?.display_name || 'U').charAt(0)}
                  </div>
                )}
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#16133a] ${activeChatPartner?.status === 'online' ? 'bg-green-500' : activeChatPartner?.status === 'idle' ? 'bg-yellow-500' : 'bg-zinc-500'}`} />
              </div>
              <span className="text-white font-bold text-sm">{activeChatPartner?.display_name || activeChatPartner?.username}</span>
            </div>
            
            <div className="flex items-center gap-4 text-zinc-400">
              <button 
                onClick={() => {
                  setCallType('voice');
                  setIsCalling(true);
                }}
                className="hover:text-zinc-200 animate-pulse-subtle" 
                title="Bắt đầu cuộc gọi thoại"
              >
                <Phone size={18} />
              </button>
              
              <button 
                onClick={() => {
                  setCallType('video');
                  setIsCalling(true);
                }}
                className="hover:text-zinc-200 animate-pulse-subtle" 
                title="Bắt đầu cuộc gọi video"
              >
                <Video size={18} />
              </button>
              
              <button className="hover:text-zinc-200" title="Thắc mắc"><HelpCircle size={18} /></button>
            </div>
          </div>
        )}

        {/* WORKSPACE MAIN BODY */}
        <div className="flex-1 flex overflow-hidden">
          
          {selectedChatId === null ? (
            /* Friends Dashboard Area */
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              
              {/* TAB CONTENT: ADD FRIEND */}
              {activeTab === 'add' && (
                <div className="space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-white font-bold uppercase text-xs tracking-wider mb-2">Thêm Bạn</h3>
                    <p className="text-xs text-zinc-400">Bạn có thể kết bạn với người dùng khác bằng cách nhập chính xác Tên tài khoản hoặc mã ID của họ.</p>
                    
                    {/* User credentials share box */}
                    <div className="mt-3 p-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-1.5 max-w-lg animate-scale-in">
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider leading-none">Thông tin tài khoản của bạn</span>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-semibold text-zinc-300">
                        <div className="flex items-center gap-1">
                          <span>Tên tài khoản:</span>
                          <code className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/10 select-all cursor-pointer" title="Click đúp để copy">
                            @{profile?.username || user?.email?.split('@')[0]}
                          </code>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-zinc-700 hidden sm:block"></span>
                        <div className="flex items-center gap-1">
                          <span>Mã ID:</span>
                          <code className="text-cyan-400 font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/10 select-all cursor-pointer" title="Click đúp để copy">
                            {user?.id}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Friend Input form */}
                  <form onSubmit={handleAddFriendSubmit} className="flex bg-black/30 p-3 rounded-xl border border-white/10 items-center justify-between focus-within:border-green-400 transition-colors">
                    <input 
                      type="text"
                      placeholder="Nhập tên người dùng..."
                      value={addFriendInput}
                      onChange={e => setAddFriendInput(e.target.value)}
                      className="bg-transparent text-sm text-zinc-100 flex-1 outline-none pr-4 placeholder-zinc-500"
                    />
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                      Gửi Yêu Cầu Kết Bạn
                    </button>
                  </form>

                  {addFriendStatus && (
                    <p className="text-xs text-green-400 font-semibold">{addFriendStatus}</p>
                  )}

                  {/* Explore Servers Banner */}
                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <h4 className="text-white font-bold uppercase text-xs tracking-wider">Những Nơi Khác Để Kết Bạn</h4>
                    
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                          <Compass size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">Tìm Hiểu Máy Chủ Có Thể Khám Phá</p>
                          <p className="text-xs text-zinc-500">Khám phá cộng đồng và tìm những người bạn mới có cùng sở thích.</p>
                        </div>
                      </div>
                      <span className="text-zinc-500 group-hover:text-zinc-300">→</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: ONLINE OR ALL OR PENDING */}
              {activeTab !== 'add' && (
                <div className="space-y-4 flex-1 flex flex-col">
                  {/* Search box */}
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm..."
                      className="w-full bg-black/30 text-xs text-white rounded-xl p-2.5 pl-9 outline-none border border-white/10 focus:border-cyan-400 transition-all duration-200"
                      value={friendSearch}
                      onChange={e => setFriendSearch(e.target.value)}
                    />
                    <Search size={16} className="absolute left-3 top-2.5 text-zinc-500" />
                  </div>

                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-4">
                    {activeTab === 'online' ? `Trực tuyến — ${friendsList.length}` : activeTab === 'all' ? `Tất cả bạn bè — ${allList.length}` : 'Đang chờ xử lý'}
                  </h3>

                  {/* Friends Cards list */}
                  <div className="space-y-1">
                    {(activeTab === 'online' ? friendsList : activeTab === 'all' ? allList : []).map(p => {
                      const avatar = p.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${p.avatar_key}` : null;
                      const name = p.display_name || p.username || 'User';
                      let statusBg = 'bg-zinc-500';
                      let statusTextDesc = 'Ngoại tuyến';

                      if (p.status === 'online') {
                        statusBg = 'bg-green-500';
                        statusTextDesc = 'Trực tuyến';
                      } else if (p.status === 'idle') {
                        statusBg = 'bg-yellow-500';
                        statusTextDesc = 'Đang chờ';
                      }

                      return (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-white text-sm font-bold uppercase">
                                  {name.charAt(0)}
                                </div>
                              )}
                              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#16133a] ${statusBg}`}></span>
                            </div>
                            <div>
                              <p className="text-white text-sm font-bold leading-tight">{name}</p>
                              <p className="text-xs text-zinc-500">{p.activity ? `${p.activity.game} — ${p.activity.detail}` : statusTextDesc}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => setSelectedChatId(p.id)}
                              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                              title="Nhắn tin"
                            >
                              <MessageSquare size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pending Request Mock for fidelity */}
                    {activeTab === 'pending' && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                            N
                          </div>
                          <div>
                            <p className="text-white text-sm font-bold leading-tight">nguyena2000</p>
                            <p className="text-xs text-zinc-500">Yêu cầu kết bạn đến • 1 ngày trước</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors">Chấp nhận</button>
                          <button className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors">Từ chối</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Direct Chat Panel Area */
            <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
              
              {/* Voice/Video Call Interface */}
              {isCalling && activeChatPartner && (
                <div className="bg-black/30 p-4 border-b border-white/10 flex flex-col relative shrink-0" style={{ height: '350px' }}>
                  <div className="absolute top-4 right-4 z-20 flex gap-2">
                    <button 
                      onClick={() => setIsCalling(false)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:scale-105"
                    >
                      Gác máy (Đóng cuộc gọi)
                    </button>
                  </div>
                  
                  {(() => {
                    const roomId = user.id < activeChatPartner.id 
                      ? `dm-${user.id}-${activeChatPartner.id}`
                      : `dm-${activeChatPartner.id}-${user.id}`;
                    const currentUsername = profile?.display_name || user?.email?.split('@')[0] || 'User';

                    return (
                      <VoiceRoom 
                        channelId={roomId} 
                        username={currentUsername} 
                        video={callType === 'video'} 
                      />
                    );
                  })()}
                </div>
              )}
              
              {/* Message Log */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col justify-end">
                
                {/* Initial Welcome message */}
                <div className="text-center py-6 border-b border-white/5 mb-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-white text-3xl mx-auto mb-3">👋</div>
                  <h3 className="text-white font-bold text-base">Bắt đầu cuộc trò chuyện với {activeChatPartner?.display_name}</h3>
                  <p className="text-xs text-zinc-500">Đây là sự khởi đầu của lịch sử tin nhắn trực tiếp của bạn.</p>
                </div>

                {/* Messages list */}
                {(chatMessages[selectedChatId] || chatMessages.default).map((msg, index) => {
                  const isMe = msg.sender === 'me';
                  const partnerName = activeChatPartner?.display_name || 'Bạn';
                  const partnerAvatar = activeChatPartner?.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${activeChatPartner.avatar_key}` : null;

                  return (
                    <div key={index} className="flex gap-4 items-start hover:bg-white/5 -mx-6 px-6 py-1 transition-all">
                      <div className="relative flex-shrink-0 mt-0.5">
                        {isMe ? (
                          profile?.avatar_key ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${profile.avatar_key}`} alt="Me" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                              {(profile?.display_name || 'M').charAt(0).toUpperCase()}
                            </div>
                          )
                        ) : (
                          partnerAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={partnerAvatar} alt="Partner" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-white font-bold text-sm">
                              {partnerName.charAt(0).toUpperCase()}
                            </div>
                          )
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-bold text-sm leading-none hover:underline cursor-pointer">{isMe ? 'Bạn' : partnerName}</span>
                          <span className="text-[10px] text-zinc-500 font-medium">{msg.time}</span>
                        </div>
                        <p className="text-sm text-zinc-300 mt-1 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-4 bg-transparent border-t border-white/10 flex gap-2 flex-shrink-0">
                <input 
                  type="text" 
                  placeholder={`Nhắn tin cho @${activeChatPartner?.display_name || 'user'}`}
                  value={currentMessageInput}
                  onChange={e => setCurrentMessageInput(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 text-sm text-white rounded-xl p-3 outline-none focus:border-cyan-400 focus:placeholder-white/40 placeholder-white/20 transition-all"
                />
                <button type="submit" className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors">
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}

          {/* COLUMN 3: ACTIVE NOW SIDEBAR */}
          {selectedChatId === null && (
            <div className="w-80 flex-shrink-0 bg-black/10 border-l border-white/10 p-4 flex flex-col gap-4 overflow-y-auto hidden lg:flex animate-scale-in">
              <h3 className="text-white font-bold text-base">Đang Hoạt Động</h3>
              
              {(() => {
                const onlineFriends = profilesWithStatus.filter(p => p.status !== 'offline');
                
                if (onlineFriends.length === 0) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-zinc-500 gap-2 mt-12">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-2 shadow">💤</div>
                      <p className="text-sm font-semibold text-zinc-400">Bây giờ đang trống...</p>
                      <p className="text-xs text-zinc-600 max-w-[200px]">Khi có bạn bè bắt đầu hoạt động, ví dụ như chơi game hoặc tham gia phòng thoại, chúng tôi sẽ hiển thị ở đây!</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {onlineFriends.map(p => {
                      const avatar = p.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${p.avatar_key}` : null;
                      const name = p.display_name || p.username || 'User';
                      
                      // Match mockup games/details based on activity presets or fallback to status
                      const activity = p.activity || (p.status_text ? { game: 'Trạng thái', detail: p.status_text, icon: '💬' } : null);

                      return (
                        <div key={p.id} className="bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-white text-sm font-bold uppercase">
                                  {name.charAt(0)}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-[#16133a]"></span>
                            </div>
                            <div>
                              <p className="text-white text-sm font-bold leading-tight">{name}</p>
                              <p className="text-[11px] text-zinc-500 mt-0.5">
                                {activity ? activity.game : 'Đang hoạt động'}
                              </p>
                            </div>
                          </div>
                          
                          {activity && (
                            <div className="bg-black/20 p-3 rounded-xl mt-3 flex items-center gap-3 border border-white/10">
                              <span className="text-2xl">{activity.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white leading-tight truncate">{activity.game}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{activity.detail}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
