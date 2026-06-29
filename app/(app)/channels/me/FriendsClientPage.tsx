'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserPanel } from '@/components/workspace/UserPanel';
import { 
  User, 
  MessageSquare, 
  Plus, 
  Search, 
  HelpCircle, 
  Compass, 
  Gamepad2, 
  Phone, 
  Video, 
  Send, 
  Check, 
  X, 
  ShieldCheck, 
  Users, 
  Activity, 
  Edit3, 
  ChevronRight, 
  Volume2, 
  Settings,
  AlertCircle
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { VoiceRoom } from '@/components/workspace/VoiceRoom';

interface FriendsClientPageProps {
  user: SupabaseUser;
  profile: any;
  otherProfiles: any[];
}

type ViewType = 'profile' | 'friends' | 'chat' | 'voice';
type TabType = 'online' | 'all' | 'pending' | 'add';

// Generate a consistent 10-digit random-looking number from UUID
const getTenDigitId = (uuid: string) => {
  if (!uuid) return '3829104829';
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idNum = Math.abs(hash) % 9000000000 + 1000000000;
  return idNum.toString();
};

export default function FriendsClientPage({ user, profile, otherProfiles }: FriendsClientPageProps) {
  // Views: profile (Thông tin tài khoản), friends (Quản lý bạn bè), chat (DM chat), voice (Kênh thoại)
  const [activeView, setActiveView] = useState<ViewType>('profile');
  const [activeTab, setActiveTab] = useState<TabType>('online');
  const [dmSearch, setDmSearch] = useState('');
  const [friendSearch, setFriendSearch] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendStatus, setAddFriendStatus] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');

  // Obfuscation states for privacy toggle
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

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

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, selectedChatId]);

  // Initialize persistent friends and DMs list
  useEffect(() => {
    const savedFriends = localStorage.getItem('friends_ids_v3');
    if (savedFriends) {
      setFriendIds(JSON.parse(savedFriends));
    } else {
      const seed: string[] = [];
      setFriendIds(seed);
      localStorage.setItem('friends_ids_v3', JSON.stringify(seed));
    }

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
        localStorage.setItem('friends_ids_v3', JSON.stringify(updatedFriends));
        setAddFriendStatus(`Thành công! Đã kết bạn với "${foundUser.display_name}".`);
      }
    } else {
      setAddFriendStatus(`Không tìm thấy người dùng có Tên/ID: "${query}".`);
    }

    setAddFriendInput('');
    setTimeout(() => setAddFriendStatus(''), 4000);
  };

  // Helper to obfuscate email
  const getObfuscatedEmail = () => {
    const email = user?.email || 'user@example.com';
    const [name, domain] = email.split('@');
    if (showEmail) return email;
    return '*'.repeat(name.length) + '@' + domain;
  };

  // Helper to obfuscate phone
  const getObfuscatedPhone = () => {
    if (showPhone) return '0987658842';
    return '********8842';
  };

  const currentUsername = profile?.username || user?.email?.split('@')[0] || 'username';
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${profile.avatar_key}` : null;
  const user10DigitId = getTenDigitId(user?.id);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-transparent">
      
      {/* COLUMN 1: SUB-SIDEBAR (Discord Settings & DM list) */}
      <div className="w-60 bg-black/30 backdrop-blur-xl border-r border-white/10 flex-shrink-0 flex flex-col h-full text-white z-10 transition-all select-none">
        
        {/* Profile Card Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 hover:bg-white/5 cursor-pointer transition-colors group">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                  {displayName.charAt(0)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 bg-green-500"></span>
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-white text-xs truncate leading-tight group-hover:text-cyan-300 transition-colors">
                {displayName}
              </h4>
              <p className="text-[10px] text-zinc-400 font-bold truncate mt-0.5">Sửa Hồ Sơ ✏️</p>
            </div>
          </div>
        </div>

        {/* Search DM input */}
        <div className="p-3 shrink-0">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm kiếm..."
              value={dmSearch}
              onChange={e => setDmSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/5 text-xs text-white rounded-xl pl-9 pr-3 py-2 outline-none placeholder:text-zinc-500 focus:border-indigo-500 focus:bg-black/55 transition-all"
            />
            <Search className="absolute left-3 top-2 text-zinc-500" size={14} />
          </div>
        </div>

        {/* Menu Navigation Links */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
          
          <div className="pb-1 px-3 text-[10px] font-black text-zinc-500 uppercase tracking-wider">Tài khoản</div>
          
          <button 
            onClick={() => {
              setActiveView('profile');
              setSelectedChatId(null);
              setActiveVoiceRoomId(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeView === 'profile' ? 'bg-white/15 text-white shadow-sm' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
          >
            <User size={16} className="shrink-0" />
            <span>Thông Tin Tài Khoản</span>
          </button>

          <button 
            onClick={() => {
              setActiveView('friends');
              setSelectedChatId(null);
              setActiveVoiceRoomId(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeView === 'friends' ? 'bg-white/15 text-white shadow-sm' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
          >
            <Users size={16} className="shrink-0" />
            <span>Bạn bè</span>
          </button>

          {/* Group Voice Rooms Section */}
          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-[10px] font-black text-zinc-500 tracking-wider uppercase group">
            <span>Kênh thoại nhóm</span>
            <button 
              onClick={() => setIsCreateVoiceRoomOpen(true)}
              className="hover:text-zinc-300 transition-colors"
              title="Tạo kênh thoại mới"
            >
              <Plus size={12} />
            </button>
          </div>

          <div className="space-y-0.5">
            {voiceRooms.map(room => {
              const isSelected = activeVoiceRoomId === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedChatId(null);
                    setActiveVoiceRoomId(room.id);
                    setActiveView('voice');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeView === 'voice' && activeVoiceRoomId === room.id ? 'bg-white/15 text-white shadow-sm' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
                >
                  <span className="text-sm shrink-0">🔊</span>
                  <span className="truncate">{room.name}</span>
                </button>
              );
            })}
          </div>

          {/* DM Users List Header */}
          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-[10px] font-black text-zinc-500 tracking-wider uppercase group border-t border-white/5 mt-3">
            <span>Tin nhắn trực tiếp</span>
          </div>

          {/* DM Users */}
          <div className="space-y-0.5">
            {filteredDMs.map(p => {
              const avatar = p.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${p.avatar_key}` : null;
              const name = p.display_name || p.username || 'User';
              const isSelected = selectedChatId === p.id;
              
              let statusBg = 'bg-zinc-500';
              if (p.status === 'online') statusBg = 'bg-green-500';
              else if (p.status === 'idle') statusBg = 'bg-yellow-500';

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedChatId(p.id);
                    setActiveVoiceRoomId(null);
                    setActiveView('chat');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeView === 'chat' && isSelected ? 'bg-white/15 text-white shadow-sm' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
                >
                  <div className="relative flex-shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-indigo-900 flex items-center justify-center text-white text-[10px] font-bold uppercase">
                        {name.charAt(0)}
                      </div>
                    )}
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${statusBg}`}></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{name}</p>
                    {p.status_text && (
                      <p className="text-[10px] text-zinc-500 truncate leading-none mt-0.5">{p.status_text}</p>
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

      {/* COLUMN 2: MAIN PANEL */}
      <div className="flex-1 flex flex-col h-full bg-[#313338]/15 animate-scale-in overflow-hidden relative">
        
        {/* VIEW 1: USER ACCOUNT SETTINGS (Exactly like Discord screenshot) */}
        {activeView === 'profile' && (
          <div className="flex-1 flex flex-col overflow-y-auto bg-zinc-900/40 p-6 md:p-8 scrollbar-thin scrollbar-thumb-white/10 select-none">
            <div className="max-w-3xl space-y-6">
              
              {/* Profile Card Header Title */}
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Thông Tin Tài Khoản</h2>
                <p className="text-xs text-zinc-400 mt-1">Quản lý và cập nhật hồ sơ bảo mật thông tin tài khoản của bạn.</p>
              </div>

              {/* Box 1: Account Information details */}
              <div className="bg-[#2b2d31]/80 rounded-2xl border border-white/5 p-5 space-y-5">
                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <div className="relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-black text-xl flex items-center justify-center border border-white/10">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-zinc-900"></span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">{displayName}</h3>
                    <p className="text-xs text-zinc-400">@{currentUsername}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Item 1: Username */}
                  <div className="flex items-center justify-between gap-4 py-1">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider leading-none">Tên đăng nhập</p>
                      <p className="text-xs text-white font-semibold mt-1.5">{currentUsername}</p>
                    </div>
                    <button className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer">
                      Chỉnh sửa
                    </button>
                  </div>

                  {/* Item 2: Email */}
                  <div className="flex items-center justify-between gap-4 py-1 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider leading-none">Email</p>
                      <p className="text-xs text-white font-semibold mt-1.5 flex items-center gap-2">
                        {getObfuscatedEmail()}
                        <button 
                          onClick={() => setShowEmail(!showEmail)} 
                          className="text-[10px] text-indigo-400 hover:underline font-bold cursor-pointer"
                        >
                          {showEmail ? 'Ẩn' : 'Hiển thị'}
                        </button>
                      </p>
                    </div>
                    <button className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer">
                      Chỉnh sửa
                    </button>
                  </div>

                  {/* Item 3: Phone Number */}
                  <div className="flex items-center justify-between gap-4 py-1 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider leading-none">Số Điện Thoại</p>
                      <p className="text-xs text-white font-semibold mt-1.5 flex items-center gap-2">
                        {getObfuscatedPhone()}
                        <button 
                          onClick={() => setShowPhone(!showPhone)} 
                          className="text-[10px] text-indigo-400 hover:underline font-bold cursor-pointer"
                        >
                          {showPhone ? 'Ẩn' : 'Hiển thị'}
                        </button>
                      </p>
                    </div>
                    <button className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer">
                      Chỉnh sửa
                    </button>
                  </div>

                  {/* Item 4: Unique 10 Digit User ID */}
                  <div className="flex items-center justify-between gap-4 py-1 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider leading-none">Mã ID Người Dùng</p>
                      <code className="text-xs text-cyan-400 font-mono font-bold mt-1.5 block bg-cyan-500/10 border border-cyan-500/10 px-2 py-0.5 rounded w-max select-all cursor-pointer" title="Double click to copy">
                        {user10DigitId}
                      </code>
                    </div>
                    <button className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer">
                      Sao chép ID
                    </button>
                  </div>
                </div>
              </div>

              {/* Box 2: Password and security settings */}
              <div className="bg-[#2b2d31]/80 rounded-2xl border border-white/5 p-5 space-y-5">
                <h3 className="font-extrabold text-white text-sm">Mật khẩu & Bảo Mật</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-300 font-bold">Mật khẩu</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Thay đổi mật khẩu đăng nhập của bạn thường xuyên để giữ an toàn.</p>
                    </div>
                    <button className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer">
                      Chỉnh sửa
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-xs text-zinc-300 font-bold">Xác Thực Đa Nhân Tố (2FA)</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Bảo vệ tài khoản bằng lớp bảo mật mã xác minh điện thoại.</p>
                    </div>
                    <button className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer">
                      Thiết lập <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-xs text-zinc-300 font-bold">Thiết Bị Đã Đăng Nhập</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Hiện có 50 thiết bị đang duy trì phiên hoạt động.</p>
                    </div>
                    <button className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer">
                      Chi tiết <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Box 3: Account status */}
              <div className="bg-[#2b2d31]/80 rounded-2xl border border-white/5 p-5 space-y-4">
                <h3 className="font-extrabold text-white text-sm">Trạng thái tài khoản</h3>
                
                <div className="bg-emerald-500/10 border border-emerald-500/15 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400">Tài khoản của bạn hoàn toàn ổn</h4>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Cảm ơn vì đã tuân thủ Điều khoản dịch vụ và Nguyên tắc cộng đồng của chúng tôi. Nếu có bất kỳ vi phạm nào, thông tin vi phạm sẽ được hiển thị chi tiết tại đây.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 4: Family Center */}
              <div className="bg-[#2b2d31]/80 rounded-2xl border border-white/5 p-5 flex justify-between items-center gap-4">
                <div>
                  <h3 className="font-extrabold text-white text-sm">Trung Tâm Gia Đình</h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Nhận cập nhật về trải nghiệm của thanh thiếu niên trên hệ thống, quản lý an toàn gia đình.</p>
                </div>
                <button className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer">
                  Thiết lập <ChevronRight size={14} />
                </button>
              </div>

              {/* Box 5: Delete actions */}
              <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-5 space-y-4">
                <div>
                  <h3 className="font-extrabold text-red-400 text-sm">Vùng nguy hiểm</h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Vô hiệu hóa hoặc xóa bỏ vĩnh viễn tài khoản của bạn khỏi hệ thống.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 rounded-lg transition-colors cursor-pointer border border-white/5">
                    Vô Hiệu Hóa Tài Khoản
                  </button>
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer">
                    Xóa Tài Khoản
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: FRIENDS DIRECTORY (Standard Discord Friend view) */}
        {activeView === 'friends' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
            
            {/* Friends Header Tab Bar */}
            <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between flex-shrink-0 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border-r border-white/15 pr-4 text-white">
                  <Users size={20} className="text-zinc-400" />
                  <span className="font-extrabold text-sm tracking-tight">Bạn bè</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setActiveTab('online')}
                    className={`px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${activeTab === 'online' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Trực tuyến
                  </button>
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Tất cả
                  </button>
                  <button 
                    onClick={() => setActiveTab('pending')}
                    className={`px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${activeTab === 'pending' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Chờ xử lý
                    <span className="ml-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase leading-none">1</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('add')}
                    className={`px-3 py-1.5 rounded font-bold text-xs transition-all cursor-pointer ${activeTab === 'add' ? 'text-green-400 bg-green-500/10' : 'text-green-500 hover:text-green-400 hover:bg-green-500/5'}`}
                  >
                    Thêm Bạn
                  </button>
                </div>
              </div>
            </div>

            {/* Friends Main Listing View */}
            <div className="flex-1 flex overflow-hidden">
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
                              @{currentUsername}
                            </code>
                          </div>
                          <span className="w-1 h-1 rounded-full bg-zinc-700 hidden sm:block"></span>
                          <div className="flex items-center gap-1">
                            <span>Mã ID:</span>
                            <code className="text-cyan-400 font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/10 select-all cursor-pointer" title="Click đúp để copy">
                              {user.id}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleAddFriendSubmit} className="flex bg-black/30 p-3 rounded-xl border border-white/10 items-center justify-between focus-within:border-green-400 transition-colors">
                      <input 
                        type="text"
                        placeholder="Nhập tên người dùng hoặc ID..."
                        value={addFriendInput}
                        onChange={e => setAddFriendInput(e.target.value)}
                        className="bg-transparent text-sm text-zinc-100 flex-1 outline-none pr-4 placeholder-zinc-500"
                      />
                      <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                      >
                        Gửi Yêu Cầu Kết Bạn
                      </button>
                    </form>

                    {addFriendStatus && (
                      <p className="text-xs text-green-400 font-semibold">{addFriendStatus}</p>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: ONLINE OR ALL OR PENDING */}
                {activeTab !== 'add' && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm bạn bè..."
                        className="w-full bg-black/30 text-xs text-white rounded-xl p-2.5 pl-9 outline-none border border-white/10 focus:border-cyan-400 transition-all duration-200"
                        value={friendSearch}
                        onChange={e => setFriendSearch(e.target.value)}
                      />
                      <Search size={16} className="absolute left-3 top-2.5 text-zinc-500" />
                    </div>

                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-4">
                      {activeTab === 'online' ? `Trực tuyến — ${friendsList.length}` : activeTab === 'all' ? `Tất cả bạn bè — ${allList.length}` : 'Đang chờ xử lý'}
                    </h3>

                    <div className="space-y-1">
                      {activeTab === 'online' && friendsList.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-scale-in">
                          <div className="w-20 h-20 rounded-full bg-zinc-800/40 flex items-center justify-center text-3xl mb-4 border border-white/5 shadow-md">
                            👽
                          </div>
                          <h4 className="text-white font-bold text-sm">Không có ai trực tuyến cả</h4>
                          <p className="text-xs text-zinc-500 mt-1 max-w-xs">Không có ai ở đây cả. Bạn có muốn thêm bạn mới?</p>
                          <button 
                            onClick={() => setActiveTab('add')}
                            className="mt-5 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all shadow-md cursor-pointer hover:scale-105"
                          >
                            Thêm Bạn Bè
                          </button>
                        </div>
                      )}

                      {activeTab === 'all' && allList.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-scale-in">
                          <div className="w-20 h-20 rounded-full bg-zinc-800/40 flex items-center justify-center text-3xl mb-4 border border-white/5 shadow-md">
                            👾
                          </div>
                          <h4 className="text-white font-bold text-sm">Bạn không có bạn bè</h4>
                          <p className="text-xs text-zinc-500 mt-1 max-w-xs">Hãy thêm bạn bè mới để trò chuyện trực tiếp và gọi thoại nhé!</p>
                          <button 
                            onClick={() => setActiveTab('add')}
                            className="mt-5 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all shadow-md cursor-pointer hover:scale-105"
                          >
                            Thêm Bạn Bè
                          </button>
                        </div>
                      )}

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
                                onClick={() => {
                                  setSelectedChatId(p.id);
                                  setActiveView('chat');
                                }}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
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
                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-white/5 max-w-xl">
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
                            <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer">Chấp nhận</button>
                            <button className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer">Từ chối</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Activity widget */}
              <div className="w-72 border-l border-white/10 p-6 hidden lg:flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider">Đang Hoạt Động</h3>
                <div className="space-y-4">
                  {friendsList.slice(0, 2).map((p, idx) => {
                    const avatar = p.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${p.avatar_key}` : null;
                    const name = p.display_name || p.username || 'User';

                    return (
                      <div key={p.id} className="bg-white/5 border border-white/5 p-3 rounded-xl flex gap-3">
                        <div className="relative">
                          {avatar ? (
                            <img src={avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-900 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                              {name.charAt(0)}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 bg-green-500"></span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-bold truncate leading-tight">{name}</p>
                          {p.activity && (
                            <div className="mt-1.5 space-y-1">
                              <p className="text-[10px] text-zinc-400 truncate font-semibold leading-none">{p.activity.game}</p>
                              <p className="text-[9px] text-zinc-500 truncate leading-none">{p.activity.detail}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DIRECT CHAT PANEL (With direct messaging logs) */}
        {activeView === 'chat' && activeChatPartner && (
          <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
            {/* Chat partner header bar */}
            <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between flex-shrink-0 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {activeChatPartner?.avatar_key ? (
                    <img src={`https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${activeChatPartner.avatar_key}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-white text-xs font-bold uppercase">
                      {activeChatPartner?.display_name?.charAt(0)}
                    </div>
                  )}
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${activeChatPartner?.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm leading-none">{activeChatPartner?.display_name}</h4>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold mt-0.5">@{activeChatPartner?.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-zinc-400">
                <button 
                  onClick={() => {
                    setCallType('voice');
                    setIsCalling(true);
                  }}
                  className="hover:text-zinc-200 animate-pulse-subtle cursor-pointer" 
                  title="Bắt đầu cuộc gọi thoại"
                >
                  <Phone size={18} />
                </button>
                <button 
                  onClick={() => {
                    setCallType('video');
                    setIsCalling(true);
                  }}
                  className="hover:text-zinc-200 animate-pulse-subtle cursor-pointer" 
                  title="Bắt đầu cuộc gọi video"
                >
                  <Video size={18} />
                </button>
              </div>
            </div>

            {/* Voice/Video Call Window (Direct connection VoiceRoom) */}
            {isCalling && (
              <div className="bg-black/30 p-4 border-b border-white/10 flex flex-col relative shrink-0" style={{ height: '350px' }}>
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button 
                    onClick={() => setIsCalling(false)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:scale-105 cursor-pointer"
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
            <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col">
              
              <div className="text-center py-6 border-b border-white/5 mb-4 shrink-0">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-white text-3xl mx-auto mb-3 shadow-lg border border-white/5">👋</div>
                <h3 className="text-white font-bold text-base">Bắt đầu cuộc trò chuyện với {activeChatPartner?.display_name}</h3>
                <p className="text-xs text-zinc-500">Đây là sự khởi đầu của lịch sử tin nhắn trực tiếp của bạn.</p>
              </div>

              <div className="flex-1 space-y-4">
                {(chatMessages[selectedChatId || ''] || chatMessages.default || []).map((msg, index) => {
                  const isMe = msg.sender === 'me';
                  const partnerName = activeChatPartner?.display_name || 'Bạn';
                  const partnerAvatar = activeChatPartner?.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${activeChatPartner.avatar_key}` : null;

                  return (
                    <div key={index} className="flex gap-4 items-start hover:bg-white/5 -mx-6 px-6 py-1 transition-all">
                      <div className="relative flex-shrink-0 mt-0.5">
                        {isMe ? (
                          avatarUrl ? (
                            <img src={avatarUrl} alt="Me" className="w-9 h-9 rounded-full object-cover border border-white/5" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )
                        ) : (
                          partnerAvatar ? (
                            <img src={partnerAvatar} alt="Partner" className="w-9 h-9 rounded-full object-cover border border-white/5" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-900 flex items-center justify-center text-white font-bold text-xs uppercase">
                              {partnerName.charAt(0).toUpperCase()}
                            </div>
                          )
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-bold text-xs leading-none hover:underline cursor-pointer">{isMe ? 'Bạn' : partnerName}</span>
                          <span className="text-[9px] text-zinc-500 font-medium">{msg.time}</span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-transparent border-t border-white/10 flex gap-2 flex-shrink-0">
              <input 
                type="text" 
                placeholder={`Nhắn tin cho @${activeChatPartner?.display_name || 'user'}`}
                value={currentMessageInput}
                onChange={e => setCurrentMessageInput(e.target.value)}
                className="w-full bg-[#383a40]/60 border border-white/5 text-xs text-white rounded-xl p-3 outline-none placeholder:text-zinc-500 focus:border-indigo-500 focus:bg-[#383a40]/90 transition-all font-medium"
              />
            </form>
          </div>
        )}

        {/* VIEW 4: GROUP VOICE ROOM (Direct LiveKit connection) */}
        {activeView === 'voice' && activeVoiceRoomId && (
          <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
            <div className="h-16 border-b border-white/10 flex items-center px-6 justify-between flex-shrink-0 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="text-cyan-400 text-2xl">🔊</span>
                <div>
                  <h4 className="text-white font-bold text-sm leading-none">
                    {voiceRooms.find(r => r.id === activeVoiceRoomId)?.name || 'Kênh thoại nhóm'}
                  </h4>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold mt-0.5">Phòng thoại cộng đồng</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col relative overflow-hidden bg-[#121214]">
              {(() => {
                const currentUsername = profile?.display_name || user?.email?.split('@')[0] || 'User';
                return (
                  <VoiceRoom 
                    channelId={activeVoiceRoomId} 
                    username={currentUsername} 
                  />
                );
              })()}
            </div>
          </div>
        )}

      </div>

      {/* Popups & Modals */}
      {isCreateVoiceRoomOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#313338] border border-white/10 w-[350px] p-5 rounded-2xl shadow-2xl space-y-4 animate-scale-in text-white">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase">Tạo Kênh thoại Nhóm</h3>
              <button onClick={() => setIsCreateVoiceRoomOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            
            <input 
              type="text" 
              placeholder="Tên kênh thoại..." 
              value={newVoiceRoomName}
              onChange={e => setNewVoiceRoomName(e.target.value)}
              className="w-full bg-black/30 border border-white/10 text-xs text-white rounded-xl p-3 outline-none placeholder:text-zinc-500 focus:border-indigo-500 transition-all font-bold"
            />
            
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setIsCreateVoiceRoomOpen(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  const trimmed = newVoiceRoomName.trim();
                  if (trimmed) {
                    const newRoom = { id: `room-${Date.now()}`, name: trimmed };
                    setVoiceRooms([...voiceRooms, newRoom]);
                    setActiveVoiceRoomId(newRoom.id);
                    setActiveView('voice');
                    setIsCreateVoiceRoomOpen(false);
                    setNewVoiceRoomName('');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
