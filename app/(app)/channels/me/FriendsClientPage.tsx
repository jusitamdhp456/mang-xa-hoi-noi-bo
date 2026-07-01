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
  PhoneOff,
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
  AlertCircle,
  MoreVertical,
  Reply,
  Pencil,
  Trash2
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { VoiceRoom } from '@/components/workspace/VoiceRoom';
import { RichText } from '@/lib/richtext';
import { getBlockedIds } from '@/app/actions/block';
import { parseStatus } from '@/lib/status';
import { PhoneLinkRow } from '@/components/workspace/PhoneLinkRow';
import { EmbedList } from '@/lib/embeds';
import { VoiceInviteCard } from '@/components/chat/VoiceInviteCard';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { 
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest, 
  getFriends, 
  getFriendRequests,
  sendDirectMessage,
  editDirectMessage,
  deleteDirectMessage,
  getDirectMessages,
  removeFriend,
  loadFriendsDashboardData
} from '@/app/actions/friend';
import { createGroupWorkspaceWithPartner } from '@/app/actions/workspace';

interface FriendsClientPageProps {
  user: SupabaseUser;
  profile: any;
  otherProfiles: any[];
}

type ViewType = 'profile' | 'friends' | 'chat' | 'voice';
type TabType = 'online' | 'all' | 'pending' | 'add';

const getTenDigitId = (uuid: string) => {
  if (!uuid) return '3829104829';
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idNum = Math.abs(hash) % 9000000000 + 1000000000;
  return idNum.toString();
};

// Play short ascending chirp synth beep when sending a message
const playSendSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('AudioContext failed:', e);
  }
};

// Play Discord-like dual-tone synth chord beep when receiving a message
const playReceiveSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.005, start + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    
    playBeep(520, ctx.currentTime, 0.07);
    playBeep(650, ctx.currentTime + 0.08, 0.12);
  } catch (e) {
    console.warn('AudioContext failed:', e);
  }
};

let ringtoneInterval: any = null;

const playIncomingCallRingtone = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playRing = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 1.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    };

    playRing();
    if (ringtoneInterval) clearInterval(ringtoneInterval);
    ringtoneInterval = setInterval(playRing, 2000);
  } catch (e) {
    console.warn('Ringtone failed:', e);
  }
};

let callToneInterval: any = null;

const playCallingTone = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = () => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);
    };

    playBeep();
    if (callToneInterval) clearInterval(callToneInterval);
    callToneInterval = setInterval(playBeep, 2500);
  } catch (e) {
    console.warn('Failed to play calling tone:', e);
  }
};

const stopCallSounds = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (callToneInterval) {
    clearInterval(callToneInterval);
    callToneInterval = null;
  }
};

export default function FriendsClientPage({ user, profile, otherProfiles }: FriendsClientPageProps) {
  const [activeView, setActiveView] = useState<ViewType>('profile');
  const [activeTab, setActiveTab] = useState<TabType>('online');
  const [dmSearch, setDmSearch] = useState('');
  const [friendSearch, setFriendSearch] = useState('');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendStatus, setAddFriendStatus] = useState('');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');

  const [showEmail, setShowEmail] = useState(false);

  const [voiceRooms, setVoiceRooms] = useState([
    { id: 'general-lobby', name: 'Phòng thoại chung' },
    { id: 'gaming-lounge', name: 'Kênh chơi game' }
  ]);
  const [activeVoiceRoomId, setActiveVoiceRoomId] = useState<string | null>(null);
  const [isCreateVoiceRoomOpen, setIsCreateVoiceRoomOpen] = useState(false);
  const [newVoiceRoomName, setNewVoiceRoomName] = useState('');
  
  // Real database-backed States
  const [friendsProfiles, setFriendsProfiles] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [dbMessages, setDbMessages] = useState<any[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  useEffect(() => { getBlockedIds().then((ids) => setBlockedIds(new Set(ids))); }, []);
  const [currentMessageInput, setCurrentMessageInput] = useState('');
  // DM reply / edit / typing
  const [dmReplyTo, setDmReplyTo] = useState<any | null>(null);
  const [editingDmId, setEditingDmId] = useState<string | null>(null);
  const [editDmText, setEditDmText] = useState('');
  const [dmTypingName, setDmTypingName] = useState<string | null>(null);
  const dmTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDmTypingSent = useRef(0);

  // Dropdown, Preview & Notification Toast States
  const [activeMenuFriendId, setActiveMenuFriendId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [previewUser, setPreviewUser] = useState<any | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Array<{ id: string, title: string, content: string, avatar: string | null, threadId: string }>>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [incomingCallInvite, setIncomingCallInvite] = useState<any | null>(null);
  const [mobileShowSidebar, setMobileShowSidebar] = useState(true);

  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Context Menu & Sidebar states
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [chatThemeColor, setChatThemeColor] = useState<string>('indigo'); 
  const [archiveActiveTab, setArchiveActiveTab] = useState<'media' | 'files' | 'links'>('media');
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  const themeStyles: Record<string, { bg: string; border: string; label: string; dot: string }> = {
    indigo: { bg: 'bg-indigo-600', border: 'border-indigo-500', label: 'Indigo', dot: 'bg-indigo-500' },
    emerald: { bg: 'bg-emerald-600', border: 'border-emerald-500', label: 'Xanh lục', dot: 'bg-emerald-500' },
    pink: { bg: 'bg-pink-600', border: 'border-pink-500', label: 'Hồng', dot: 'bg-pink-500' },
    amber: { bg: 'bg-amber-600', border: 'border-amber-500', label: 'Hổ phách', dot: 'bg-amber-500' },
    rose: { bg: 'bg-rose-600', border: 'border-rose-500', label: 'Đỏ hồng', dot: 'bg-rose-500' },
    violet: { bg: 'bg-violet-600', border: 'border-violet-500', label: 'Tím oải hương', dot: 'bg-violet-500' },
  };

  useEffect(() => {
    if (selectedChatId) {
      const savedTheme = localStorage.getItem(`chat-theme-${selectedChatId}`);
      setChatThemeColor(savedTheme || 'indigo');
    }
  }, [selectedChatId]);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1200;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleFileSelection = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
    } else {
      setSelectedFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFileSelection(file);
          break;
        }
      }
    }
  };

  // Toggle chat-active class on html node based on sidebar visibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!mobileShowSidebar) {
        document.documentElement.classList.add('chat-active');
      } else {
        document.documentElement.classList.remove('chat-active');
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.documentElement.classList.remove('chat-active');
      }
    };
  }, [mobileShowSidebar]);

  // Load saved unread counts on mount
  useEffect(() => {
    const saved = localStorage.getItem('friends_unread_counts');
    if (saved) {
      setUnreadCounts(JSON.parse(saved));
    }
  }, []);

  // Clear unread count when chat is opened
  useEffect(() => {
    if (selectedChatId) {
      setUnreadCounts(prev => {
        if (!prev[selectedChatId]) return prev;
        const updated = { ...prev };
        delete updated[selectedChatId];
        localStorage.setItem('friends_unread_counts', JSON.stringify(updated));
        return updated;
      });
    }
  }, [selectedChatId]);

  const handleAnswerCall = () => {
    if (!incomingCallInvite) return;
    
    stopCallSounds();
    const info = incomingCallInvite;
    setIncomingCallInvite(null);

    // Broadcast call_accepted event to the caller
    const supabase = createSupabaseBrowserClient();
    supabase.channel(`room-dm-${info.threadId}`).send({
      type: 'broadcast',
      event: 'call_accepted',
      payload: {
        receiverId: info.senderId
      }
    });

    setCallType(info.callType);
    setSelectedChatId(info.threadId);
    setActiveVoiceRoomId(null);
    setActiveView('chat');
    setIsCalling(true);
  };

  const handleDeclineCall = () => {
    if (!incomingCallInvite) return;
    
    stopCallSounds();
    const info = incomingCallInvite;
    setIncomingCallInvite(null);

    const supabase = createSupabaseBrowserClient();
    supabase.channel(`room-dm-${info.threadId}`).send({
      type: 'broadcast',
      event: 'call_declined',
      payload: {
        receiverId: info.senderId
      }
    });
  };

  const handleHangUp = () => {
    setIsCalling(false);
    stopCallSounds();
    
    if (activeChatPartner) {
      const supabase = createSupabaseBrowserClient();
      supabase.channel(`room-dm-${selectedChatId}`).send({
        type: 'broadcast',
        event: 'call_declined',
        payload: {
          receiverId: activeChatPartner.id
        }
      });
    }
  };

  const initiateCall = (type: 'voice' | 'video') => {
    setCallType(type);
    setIsCalling(true);
    
    // Play calling ringback beep on caller side
    playCallingTone();
    
    if (activeChatPartner) {
      const supabase = createSupabaseBrowserClient();
      supabase.channel(`room-dm-${selectedChatId}`).send({
        type: 'broadcast',
        event: 'incoming_call_invite',
        payload: {
          threadId: selectedChatId,
          callType: type,
          senderName: displayName,
          senderId: user.id,
          senderAvatar: profile?.avatar_key || null
        }
      });
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dbMessages, selectedChatId]);

  // Load saved navigation state on mount
  useEffect(() => {
    const savedView = localStorage.getItem('friends_active_view');
    const savedTab = localStorage.getItem('friends_active_tab');
    const savedChatId = localStorage.getItem('friends_selected_chat_id');
    const savedVoiceRoomId = localStorage.getItem('friends_active_voice_room_id');

    if (savedView) setActiveView(savedView as ViewType);
    if (savedTab) setActiveTab(savedTab as TabType);
    if (savedChatId) {
      setSelectedChatId(savedChatId);
      setMobileShowSidebar(false);
    }
    if (savedVoiceRoomId) {
      setActiveVoiceRoomId(savedVoiceRoomId);
      setMobileShowSidebar(false);
    }
  }, []);

  // Save navigation state on change
  useEffect(() => {
    if (isMounted.current) {
      localStorage.setItem('friends_active_view', activeView);
      localStorage.setItem('friends_active_tab', activeTab);
      if (selectedChatId) {
        localStorage.setItem('friends_selected_chat_id', selectedChatId);
      } else {
        localStorage.removeItem('friends_selected_chat_id');
      }
      if (activeVoiceRoomId) {
        localStorage.setItem('friends_active_voice_room_id', activeVoiceRoomId);
      } else {
        localStorage.removeItem('friends_active_voice_room_id');
      }
    } else {
      isMounted.current = true;
    }
  }, [activeView, activeTab, selectedChatId, activeVoiceRoomId]);

  // Load blocked user IDs
  useEffect(() => {
    const saved = localStorage.getItem('blocked_user_ids');
    if (saved) {
      setBlockedUserIds(JSON.parse(saved));
    }
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleCloseMenu = () => {
      setActiveMenuFriendId(null);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Show Toast Helper
  const showToast = (senderName: string, content: string, avatarKey: string | null, threadId: string) => {
    const id = `toast-${Date.now()}`;
    const avatarUrl = avatarKey ? `/api/media/${avatarKey}` : null;
    
    setToasts(prev => [...prev, { id, title: senderName, content, avatar: avatarUrl, threadId }]);
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Load friends and pending requests from Supabase in a single parallel request
  const loadDashboardData = async () => {
    try {
      const { friends, requests } = await loadFriendsDashboardData();
      setFriendsProfiles(friends);
      setFriendRequests(requests);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Real-time updates subscription for requests and friends
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    const channel1 = supabase
      .channel('friend-requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    const channel2 = supabase
      .channel('thread-members-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'direct_thread_members', filter: `user_id=eq.${user.id}` },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    // Reliable realtime via broadcast on a per-user channel (no dependency on
    // postgres_changes being enabled). Other clients notify us here when they
    // send/accept a friend request targeting us.
    const userEvents = supabase
      .channel(`user-events-${user.id}`)
      .on('broadcast', { event: 'friend_request' }, () => {
        loadDashboardData();
      })
      .on('broadcast', { event: 'friend_accepted' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(userEvents);
    };
  }, [user.id]);

  // Subscribe to all friend DM thread channels for realtime messaging, sound beeps, and unread badges
  useEffect(() => {
    if (friendsProfiles.length === 0) return;

    const supabase = createSupabaseBrowserClient();
    const activeChannels: any[] = [];

    friendsProfiles.forEach(friend => {
      if (!friend.threadId) return;

      const channel = supabase
        .channel(`room-dm-${friend.threadId}`)
        .on('broadcast', { event: 'new_message' }, (payload) => {
          const msg = payload.payload;
          
          // Ignore messages sent by ourselves
          if (msg.sender_id !== user.id) {
            // Play receiving double beep
            playReceiveSound();

            if (selectedChatId === friend.threadId) {
              // Append to active chat
              setDbMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            } else {
              // Show toast and increment unread badge
              const senderName = friend.display_name || friend.username || 'Bạn';
              showToast(senderName, msg.content, friend.avatar_key, friend.threadId);

              setUnreadCounts(prev => {
                const nextCount = (prev[friend.threadId] || 0) + 1;
                const updated = { ...prev, [friend.threadId]: nextCount };
                localStorage.setItem('friends_unread_counts', JSON.stringify(updated));
                return updated;
              });
            }
          }
        })
        .on('broadcast', { event: 'dm_edit' }, (payload) => {
          const { id, content } = payload.payload || {};
          if (selectedChatId !== friend.threadId || !id) return;
          setDbMessages(prev => prev.map(m => (m.id === id ? { ...m, content, edited_at: new Date().toISOString() } : m)));
        })
        .on('broadcast', { event: 'dm_delete' }, (payload) => {
          const { id } = payload.payload || {};
          if (selectedChatId !== friend.threadId || !id) return;
          setDbMessages(prev => prev.filter(m => m.id !== id));
        })
        .on('broadcast', { event: 'dm_typing' }, (payload) => {
          const { senderId, name } = payload.payload || {};
          if (selectedChatId !== friend.threadId || senderId === user.id) return;
          setDmTypingName(name || 'Đang gõ');
          if (dmTypingTimer.current) clearTimeout(dmTypingTimer.current);
          dmTypingTimer.current = setTimeout(() => setDmTypingName(null), 3500);
        })
        .on('broadcast', { event: 'incoming_call_invite' }, (payload) => {
          const info = payload.payload;
          if (info.senderId !== user.id) {
            setIncomingCallInvite(info);
            playIncomingCallRingtone();
          }
        })
        .on('broadcast', { event: 'call_declined' }, (payload) => {
          if (payload.payload.receiverId === user.id) {
            setIsCalling(false);
            setIncomingCallInvite(null);
            stopCallSounds();
          }
        })
        .on('broadcast', { event: 'call_accepted' }, (payload) => {
          if (payload.payload.receiverId === user.id) {
            stopCallSounds();
          }
        })
        .subscribe();

      activeChannels.push(channel);
    });

    return () => {
      activeChannels.forEach(ch => {
        supabase.removeChannel(ch);
      });
    };
  }, [friendsProfiles, selectedChatId, user.id]);

  // Load direct messages history when a thread is selected
  useEffect(() => {
    if (!selectedChatId) {
      setDbMessages([]);
      return;
    }

    const loadMessages = async () => {
      const msgs = await getDirectMessages(selectedChatId);
      setDbMessages(msgs);
    };

    loadMessages();
  }, [selectedChatId]);

  // Real status from the user's own setting (profiles.status_text encodes it).
  // No fabricated "playing a game" activity — the app doesn't track that.
  const realStatus = (statusRaw?: string | null) => {
    const { state, text } = parseStatus(statusRaw);
    return {
      status: state === 'invisible' ? 'offline' : state, // online | idle | dnd
      statusText: text,
      activity: null as null,
    };
  };

  // Filter out blocked users
  const friendsProfilesFiltered = friendsProfiles.filter(p => !blockedUserIds.includes(p.id));

  const profilesWithStatus = friendsProfilesFiltered.map((p) => ({
    ...p,
    ...realStatus(p.status_text),
  }));

  // Filtering lists
  const filteredDMs = profilesWithStatus.filter(p => 
    (p.display_name || '').toLowerCase().includes(dmSearch.toLowerCase())
  );

  const friendsList = profilesWithStatus.filter(p => 
    p.status !== 'offline' && 
    (p.display_name || '').toLowerCase().includes(friendSearch.toLowerCase())
  );

  const allList = profilesWithStatus.filter(p => 
    (p.display_name || '').toLowerCase().includes(friendSearch.toLowerCase())
  );

  const activeChatPartner = profilesWithStatus.find(p => p.threadId === selectedChatId);

  // DM: typing / edit / delete
  const handleDmTyping = () => {
    const now = Date.now();
    if (now - lastDmTypingSent.current < 2000 || !selectedChatId) return;
    lastDmTypingSent.current = now;
    createSupabaseBrowserClient().channel(`room-dm-${selectedChatId}`).send({
      type: 'broadcast', event: 'dm_typing', payload: { senderId: user.id, name: displayName },
    });
  };

  const handleEditDm = async (id: string, content: string) => {
    const t = content.trim();
    setEditingDmId(null);
    if (!t) return;
    setDbMessages(prev => prev.map(m => (m.id === id ? { ...m, content: t, edited_at: new Date().toISOString() } : m)));
    const res = await editDirectMessage(id, t);
    if (res?.error) return;
    createSupabaseBrowserClient().channel(`room-dm-${selectedChatId}`).send({
      type: 'broadcast', event: 'dm_edit', payload: { id, content: t },
    });
  };

  const handleDeleteDm = async (id: string) => {
    setDbMessages(prev => prev.filter(m => m.id !== id));
    const res = await deleteDirectMessage(id);
    if (res?.error) { alert(res.error); return; }
    createSupabaseBrowserClient().channel(`room-dm-${selectedChatId}`).send({
      type: 'broadcast', event: 'dm_delete', payload: { id },
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!currentMessageInput.trim() && !selectedFile) || !selectedChatId || isUploading) return;

    const content = currentMessageInput.trim();
    const currentFile = selectedFile;
    
    setCurrentMessageInput('');
    setSelectedFile(null);

    // Play sending sound
    playSendSound();

    let finalContent = content;
    let msgType = 'text';

    try {
      if (currentFile) {
        setIsUploading(true);
        const formData = new FormData()
        formData.append('file', currentFile)
        formData.append('threadId', selectedChatId)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (!uploadRes.ok) {
          const errData = await uploadRes.json()
          throw new Error(errData.error || 'Tải tệp tin lên thất bại')
        }
        
        const uploadData = await uploadRes.json()
        const attachmentPayload = {
          objectKey: uploadData.objectKey,
          fileName: uploadData.fileName,
          mimeType: uploadData.mimeType,
          sizeBytes: uploadData.sizeBytes
        };

        finalContent = JSON.stringify(attachmentPayload);
        msgType = uploadData.mimeType.startsWith('image/') ? 'image' : 'file';
      }

      const replyTarget = dmReplyTo;
      setDmReplyTo(null);

      const tempMessageId = `msg-temp-${Date.now()}`;
      const messagePayload = {
        id: tempMessageId,
        thread_id: selectedChatId,
        sender_id: user.id,
        content: finalContent,
        type: msgType,
        created_at: new Date().toISOString(),
        reply_to_id: replyTarget?.id || null,
        reply_to: replyTarget ? { id: replyTarget.id, content: replyTarget.content, profiles: { display_name: replyTarget.sender_id === user.id ? displayName : (activeChatPartner?.display_name || 'Bạn') } } : null,
      };

      // Render locally immediately
      setDbMessages(prev => [...prev, messagePayload]);

      // Broadcast to the thread channel room-dm first for instant delivery
      const supabase = createSupabaseBrowserClient();
      supabase
        .channel(`room-dm-${selectedChatId}`)
        .send({
          type: 'broadcast',
          event: 'new_message',
          payload: messagePayload
        });

      // Notify the recipient's global toast listener (works anywhere in the app)
      if (activeChatPartner?.id) {
        supabase.channel(`dm-notify:${activeChatPartner.id}`).send({
          type: 'broadcast',
          event: 'dm_toast',
          payload: { senderName: displayName, content: finalContent },
        });
      }

      // Save in database
      await sendDirectMessage(selectedChatId, finalContent, msgType as any, replyTarget?.id);
    } catch (err: any) {
      console.error('Failed to send DM:', err);
      alert(err.message || 'Gửi tin nhắn hoặc tệp tin thất bại');
      setCurrentMessageInput(content);
      setSelectedFile(currentFile);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Notify another user's per-user channel so their UI refreshes in realtime.
  const notifyUser = (targetId: string, event: 'friend_request' | 'friend_accepted') => {
    if (!targetId) return;
    const supabase = createSupabaseBrowserClient();
    supabase.channel(`user-events-${targetId}`).send({
      type: 'broadcast',
      event,
      payload: { from: user.id },
    });
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = addFriendInput.trim();
    if (!query) return;

    const foundUser = otherProfiles.find(p => 
      p.username?.toLowerCase() === query.toLowerCase() ||
      p.id === query ||
      getTenDigitId(p.id) === query
    );

    if (foundUser) {
      const isAlreadyFriend = friendsProfiles.some(f => f.id === foundUser.id);
      if (isAlreadyFriend) {
        setAddFriendStatus(`Bạn và "${foundUser.display_name}" đã kết bạn từ trước.`);
      } else {
        try {
          const res = await sendFriendRequest(foundUser.id);
          notifyUser(foundUser.id, 'friend_request');
          if (res?.message) {
            setAddFriendStatus(res.message);
          } else {
            setAddFriendStatus(`Đã gửi yêu cầu kết bạn đến "${foundUser.display_name}". Chờ họ chấp nhận.`);
          }
        } catch (e) {
          console.error(e);
          setAddFriendStatus('Có lỗi xảy ra khi gửi yêu cầu kết bạn.');
        }
      }
    } else {
      setAddFriendStatus(`Không tìm thấy người dùng có Tên/ID: "${query}".`);
    }

    setAddFriendInput('');
    setTimeout(() => setAddFriendStatus(''), 4000);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const req = friendRequests.find((r: any) => r.id === requestId);
      await acceptFriendRequest(requestId);
      await loadDashboardData();
      // Let the original sender's friend list refresh (new DM thread appears).
      if (req?.sender_id) notifyUser(req.sender_id, 'friend_accepted');
    } catch (e) {
      console.error('Failed to accept request:', e);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineFriendRequest(requestId);
      await loadDashboardData();
    } catch (e) {
      console.error('Failed to decline request:', e);
    }
  };

  const getObfuscatedEmail = () => {
    const email = user?.email || 'user@example.com';
    const [name, domain] = email.split('@');
    if (showEmail) return email;
    return '*'.repeat(name.length) + '@' + domain;
  };

  const currentUsername = profile?.username || user?.email?.split('@')[0] || 'username';
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_key ? `/api/media/${profile.avatar_key}` : null;
  const user10DigitId = getTenDigitId(user?.id);

  const handleCopyId = async () => {
    try { await navigator.clipboard.writeText(user10DigitId); alert('Đã sao chép ID người dùng'); }
    catch { /* ignore */ }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    if (!confirm(`Gửi email đặt lại mật khẩu tới ${user.email}?`)) return;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    alert(error ? 'Lỗi gửi email đặt lại mật khẩu' : 'Đã gửi email đặt lại mật khẩu. Kiểm tra hộp thư nhé!');
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-transparent">
      
      {/* COLUMN 1: SUB-SIDEBAR (Discord Settings & DM list) */}
      <div className={`w-full md:w-60 bg-black/30 backdrop-blur-xl border-r border-white/10 flex-shrink-0 flex flex-col h-full text-white z-10 transition-all select-none ${mobileShowSidebar ? 'flex' : 'hidden md:flex'}`}>
        
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

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
          
          <div className="pb-1 px-3 text-[10px] font-black text-zinc-500 uppercase tracking-wider">Tài khoản</div>
          
          <button 
            onClick={() => {
              setActiveView('profile');
              setSelectedChatId(null);
              setActiveVoiceRoomId(null);
              setMobileShowSidebar(false);
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
              setMobileShowSidebar(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeView === 'friends' ? 'bg-white/15 text-white shadow-sm' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
          >
            <Users size={16} className="shrink-0" />
            <span>Bạn bè</span>
          </button>

          <div className="pt-4 pb-1 px-3 flex items-center justify-between text-[10px] font-black text-zinc-500 tracking-wider uppercase group mt-1">
            <span>Tin nhắn trực tiếp</span>
          </div>

          <div className="space-y-0.5">
            {filteredDMs.map(p => {
              const avatar = p.avatar_key ? `/api/media/${p.avatar_key}` : null;
              const name = p.display_name || p.username || 'User';
              const isSelected = selectedChatId === p.threadId;
              
              let statusBg = p.status === 'dnd' ? 'bg-rose-500' : p.status === 'idle' ? 'bg-amber-500' : p.status !== 'offline' ? 'bg-green-500' : 'bg-zinc-500';

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedChatId(p.threadId);
                    setActiveVoiceRoomId(null);
                    setActiveView('chat');
                    setMobileShowSidebar(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${activeView === 'chat' && isSelected ? 'bg-white/15 text-white shadow-sm' : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                  </div>

                  {/* Red Unread Count Badge */}
                  {unreadCounts[p.threadId] && unreadCounts[p.threadId] > 0 && (
                    <span className="shrink-0 text-red-500 text-[10px] font-black uppercase leading-none ml-1.5 animate-pulse-subtle">
                      {unreadCounts[p.threadId] > 5 ? '5+' : unreadCounts[p.threadId]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <UserPanel user={user} profile={profile} />
      </div>

      {/* COLUMN 2: MAIN PANEL */}
      <div className={`flex-1 flex flex-col h-full bg-[#313338]/15 animate-scale-in overflow-hidden relative ${!mobileShowSidebar ? 'flex' : 'hidden md:flex'}`}>
        
        {/* VIEW 1: USER ACCOUNT SETTINGS */}
        {activeView === 'profile' && (
          <div className="flex-1 flex flex-col overflow-y-auto bg-zinc-900/40 p-6 md:p-8 scrollbar-thin scrollbar-thumb-white/10 select-none">
            <div className="max-w-3xl space-y-6">
              {/* Mobile Back Button */}
              <div className="flex items-center gap-3 md:hidden mb-4">
                <button 
                  onClick={() => setMobileShowSidebar(true)}
                  className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white cursor-pointer flex items-center justify-center"
                >
                  <ChevronRight className="rotate-180" size={16} />
                </button>
                <span className="text-zinc-400 text-xs font-bold">Quay lại danh sách</span>
              </div>
              
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Thông Tin Tài Khoản</h2>
                <p className="text-xs text-zinc-400 mt-1">Quản lý và cập nhật hồ sơ bảo mật thông tin tài khoản của bạn.</p>
              </div>

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
                  <div className="flex items-center justify-between gap-4 py-1">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider leading-none">Tên đăng nhập</p>
                      <p className="text-xs text-white font-semibold mt-1.5">{currentUsername}</p>
                    </div>
                  </div>

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
                  </div>

                  <PhoneLinkRow initialPhone={user?.phone} />

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase font-black tracking-wider leading-none">Mã ID Người Dùng</p>
                      <code className="text-xs text-cyan-400 font-mono font-bold mt-1.5 block bg-cyan-500/10 border border-cyan-500/10 px-2 py-0.5 rounded w-max select-all cursor-pointer">
                        {user10DigitId}
                      </code>
                    </div>
                    <button onClick={handleCopyId} className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer">
                      Sao chép ID
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#2b2d31]/80 rounded-2xl border border-white/5 p-5 space-y-5">
                <h3 className="font-extrabold text-white text-sm">Mật khẩu & Bảo Mật</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-300 font-bold">Mật khẩu</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Gửi email đặt lại mật khẩu tới địa chỉ email của bạn.</p>
                    </div>
                    <button onClick={handleResetPassword} className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-[11px] font-bold text-white rounded-lg transition-colors cursor-pointer">
                      Đặt lại
                    </button>
                  </div>
                </div>
              </div>

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

            </div>
          </div>
        )}

        {/* VIEW 2: FRIENDS DIRECTORY */}
        {activeView === 'friends' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
            
            <div className="h-16 border-b border-white/10 flex items-center px-4 sm:px-6 justify-between flex-shrink-0 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  onClick={() => setMobileShowSidebar(true)}
                  className="md:hidden p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white cursor-pointer mr-1 flex items-center justify-center"
                >
                  <ChevronRight className="rotate-180" size={16} />
                </button>
                <div className="flex items-center gap-2 border-r border-white/15 pr-4 text-white">
                  <Users size={20} className="text-zinc-400" />
                  <span className="font-extrabold text-sm tracking-tight">Bạn bè</span>
                </div>
                
                <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar shrink-0 max-w-[calc(100vw-150px)] sm:max-w-none">
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
                    {friendRequests.length > 0 && (
                      <span className="ml-1.5 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase leading-none">
                        {friendRequests.length}
                      </span>
                    )}
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

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col p-6 overflow-y-auto font-sans">
                
                {/* TAB CONTENT: ADD FRIEND */}
                {activeTab === 'add' && (
                  <div className="space-y-6 max-w-xl">
                    <div>
                      <h3 className="text-white font-bold uppercase text-xs tracking-wider mb-2">Thêm Bạn</h3>
                      <p className="text-xs text-zinc-400">Bạn có thể kết bạn với người dùng khác bằng cách nhập chính xác Tên tài khoản hoặc mã ID của họ.</p>
                      
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
                              {user10DigitId}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleAddFriendSubmit} className="flex bg-black/30 p-3 rounded-xl border border-white/10 items-center justify-between focus-within:border-green-400 transition-colors">
                      <input 
                        type="text"
                        placeholder="Nhập tên người dùng hoặc ID để kết bạn..."
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
                      <p className="text-xs text-green-400 font-semibold animate-fade-in">{addFriendStatus}</p>
                    )}

                    {/* Live Search Results */}
                    {addFriendInput.trim() && (
                      <div className="space-y-2.5 mt-4 animate-scale-in">
                        <h4 className="text-[10px] text-zinc-500 uppercase font-black tracking-wider leading-none">
                          Kết quả tìm kiếm ({
                            otherProfiles.filter(p => 
                              p.username?.toLowerCase().includes(addFriendInput.trim().toLowerCase()) ||
                              p.display_name?.toLowerCase().includes(addFriendInput.trim().toLowerCase()) ||
                              p.id === addFriendInput.trim() ||
                              getTenDigitId(p.id).includes(addFriendInput.trim())
                            ).length
                          })
                        </h4>
                        
                        <div className="space-y-1.5">
                          {otherProfiles.filter(p => 
                            p.username?.toLowerCase().includes(addFriendInput.trim().toLowerCase()) ||
                            p.display_name?.toLowerCase().includes(addFriendInput.trim().toLowerCase()) ||
                            p.id === addFriendInput.trim() ||
                            getTenDigitId(p.id).includes(addFriendInput.trim())
                          ).slice(0, 5).map(p => {
                            const isAlreadyFriend = friendsProfiles.some(f => f.id === p.id);
                            const avatar = p.avatar_key ? `/api/media/${p.avatar_key}` : null;
                            const name = p.display_name || p.username || 'User';

                            const handleAddClick = async () => {
                              try {
                                const res = await sendFriendRequest(p.id);
                                notifyUser(p.id, 'friend_request');
                                if (res?.message) {
                                  setAddFriendStatus(res.message);
                                } else {
                                  setAddFriendStatus(`Đã gửi lời mời kết bạn đến "${name}". Chờ đối phương chấp nhận.`);
                                }
                                loadDashboardData();
                                setTimeout(() => setAddFriendStatus(''), 6000);
                              } catch (e) {
                                console.error(e);
                                setAddFriendStatus('Có lỗi xảy ra khi gửi kết bạn.');
                              }
                            };

                            return (
                              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    {avatar ? (
                                      <img src={avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-indigo-900 flex items-center justify-center text-white text-xs font-bold uppercase">
                                        {name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-white text-xs font-bold leading-tight">{name}</p>
                                    <p className="text-[10px] text-zinc-500 mt-0.5">@{p.username || 'user'}</p>
                                  </div>
                                </div>

                                <div className="flex gap-2 items-center">
                                  {isAlreadyFriend ? (
                                    <>
                                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
                                        Bạn bè ✔
                                      </span>
                                      <button
                                        onClick={() => {
                                          setSelectedChatId(p.threadId);
                                          setActiveView('chat');
                                        }}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                                      >
                                        Nhắn tin
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={handleAddClick}
                                      className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer"
                                    >
                                      Kết bạn
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {otherProfiles.filter(p => 
                            p.username?.toLowerCase().includes(addFriendInput.trim().toLowerCase()) ||
                            p.display_name?.toLowerCase().includes(addFriendInput.trim().toLowerCase()) ||
                            p.id === addFriendInput.trim() ||
                            getTenDigitId(p.id).includes(addFriendInput.trim())
                          ).length === 0 && (
                            <p className="text-xs text-zinc-500 italic py-2">Không tìm thấy người dùng có Tên/ID: "{addFriendInput}"</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: ONLINE OR ALL */}
                {activeTab !== 'add' && activeTab !== 'pending' && (
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
                      {activeTab === 'online' ? `Trực tuyến — ${friendsList.length}` : `Tất cả bạn bè — ${allList.length}`}
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
                            className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all shadow-md cursor-pointer hover:scale-105"
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
                            className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all shadow-md cursor-pointer hover:scale-105"
                          >
                            Thêm Bạn Bè
                          </button>
                        </div>
                      )}

                      {(activeTab === 'online' ? friendsList : allList).map(p => {
                        const avatar = p.avatar_key ? `/api/media/${p.avatar_key}` : null;
                        const name = p.display_name || p.username || 'User';
                        let statusBg = p.status === 'dnd' ? 'bg-rose-500' : p.status === 'idle' ? 'bg-amber-500' : p.status !== 'offline' ? 'bg-green-500' : 'bg-zinc-500';
                        let statusTextDesc = p.status !== 'offline' ? 'Trực tuyến' : 'Ngoại tuyến';

                        return (
                          <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {avatar ? (
                                  <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold uppercase">
                                    {name.charAt(0)}
                                  </div>
                                )}
                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#16133a] ${statusBg}`}></span>
                              </div>
                              <div>
                                <p className="text-white text-sm font-bold leading-tight">{name}</p>
                                <p className="text-xs text-zinc-500">{p.statusText || statusTextDesc}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 items-center">
                              <button 
                                onClick={() => {
                                  setSelectedChatId(p.threadId);
                                  setActiveView('chat');
                                }}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Nhắn tin"
                              >
                                <MessageSquare size={16} />
                              </button>

                              {/* Three Dots More Actions Menu Trigger */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuPosition({ x: rect.left, y: rect.bottom + window.scrollY });
                                  setActiveMenuFriendId(p.id);
                                }}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                                title="Thêm hành động"
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: PENDING REQUESTS LIST */}
                {activeTab === 'pending' && (
                  <div className="space-y-4 max-w-xl">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Lời mời kết bạn đang chờ — {friendRequests.length}
                    </h3>
                    
                    <div className="space-y-2">
                      {friendRequests.map(req => {
                        const initial = (req.sender_name || 'U').charAt(0).toUpperCase();
                        return (
                          <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="relative w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                {req.sender_avatar ? (
                                  <img src={`/api/media/${req.sender_avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  initial
                                )}
                              </div>
                              <div>
                                <p className="text-white text-sm font-bold leading-tight">{req.sender_name}</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">@{req.sender_username} • Lời mời kết bạn</p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAcceptRequest(req.id)}
                                className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                              >
                                Chấp nhận
                              </button>
                              <button 
                                onClick={() => handleDeclineRequest(req.id)}
                                className="px-3.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {friendRequests.length === 0 && (
                        <p className="text-xs text-zinc-500 italic py-2">Không có lời mời kết bạn nào đang chờ xử lý.</p>
                      )}
                    </div>
                  </div>
                )}

              </div>

              <div className="w-72 border-l border-white/10 p-6 hidden lg:flex flex-col gap-4 overflow-y-auto shrink-0 select-none">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider">Đang Hoạt Động</h3>
                {friendsList.length === 0 ? (
                  <div className="text-center mt-6">
                    <p className="text-sm font-bold text-white/80">Yên tĩnh quá…</p>
                    <p className="text-xs text-zinc-500 mt-1">Khi bạn bè trực tuyến, họ sẽ hiện ở đây.</p>
                  </div>
                ) : (
                <div className="space-y-3">
                  {friendsList.map((p) => {
                    const avatar = p.avatar_key ? `/api/media/${p.avatar_key}` : null;
                    const name = p.display_name || p.username || 'User';
                    const dot = p.status === 'dnd' ? 'bg-rose-500' : p.status === 'idle' ? 'bg-amber-500' : 'bg-green-500';

                    return (
                      <div key={p.id} className="bg-white/5 border border-white/5 p-3 rounded-xl flex gap-3 items-center">
                        <div className="relative shrink-0">
                          {avatar ? (
                            <img src={avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                              {name.charAt(0)}
                            </div>
                          )}
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${dot}`}></span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-bold truncate leading-tight">{name}</p>
                          {p.statusText && (
                            <p className="text-[10px] text-zinc-400 truncate leading-none mt-1">{p.statusText}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DIRECT CHAT PANEL */}
        {activeView === 'chat' && activeChatPartner && (
          <div 
            className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative"
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              if (e.dataTransfer.files?.[0]) {
                handleFileSelection(e.dataTransfer.files[0]);
              }
            }}
          >
            {isDragOver && (
              <div className="absolute inset-0 bg-indigo-950/80 border-4 border-dashed border-indigo-500 rounded-3xl flex flex-col items-center justify-center z-50 pointer-events-none animate-fade-in-up">
                <span className="text-4xl mb-3">📥</span>
                <p className="text-base font-bold text-white">Thả tệp tin hoặc ảnh vào đây</p>
                <p className="text-xs text-zinc-300 mt-1">Hệ thống sẽ đính kèm tệp vào tin nhắn của bạn</p>
              </div>
            )}
            {isCalling ? (
              /* FULL VIEW Calling Screen */
              <div className="flex-1 flex flex-col h-full bg-[#121214] overflow-hidden p-6 relative animate-scale-in">
                {/* Hang up button in top right */}
                <div className="absolute top-6 right-6 z-20">
                  <button 
                    onClick={handleHangUp}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:scale-105 cursor-pointer flex items-center gap-1.5"
                  >
                    <PhoneOff size={14} />
                    Gác máy (Đóng cuộc gọi)
                  </button>
                </div>
                
                <VoiceRoom 
                  channelId={selectedChatId || ''} 
                  username={displayName} 
                  video={callType === 'video'} 
                  userId={user.id}
                  partnerId={activeChatPartner.id}
                />
              </div>
            ) : (
              /* Normal text chat interface */
              <>
                <div className="h-16 border-b border-white/10 flex items-center px-4 sm:px-6 justify-between flex-shrink-0 bg-white/5 backdrop-blur-md relative z-30">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button 
                      onClick={() => setMobileShowSidebar(true)}
                      className="md:hidden p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white cursor-pointer mr-1 flex items-center justify-center"
                    >
                      <ChevronRight className="rotate-180" size={16} />
                    </button>
                    <div className="relative">
                      {activeChatPartner?.avatar_key ? (
                        <img src={`/api/media/${activeChatPartner.avatar_key}`} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-white text-xs font-bold uppercase">
                          {activeChatPartner?.display_name?.charAt(0)}
                        </div>
                      )}
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${activeChatPartner?.status === 'dnd' ? 'bg-rose-500' : activeChatPartner?.status === 'idle' ? 'bg-amber-500' : (activeChatPartner && activeChatPartner.status !== 'offline') ? 'bg-green-500' : 'bg-zinc-500'}`}></span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm leading-none">{activeChatPartner?.display_name}</h4>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold mt-0.5">@{activeChatPartner?.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-zinc-400">
                    <button 
                      onClick={() => initiateCall('voice')}
                      className="hover:text-zinc-200 animate-pulse-subtle cursor-pointer" 
                      title="Bắt đầu cuộc gọi thoại"
                    >
                      <Phone size={18} />
                    </button>
                    <button 
                      onClick={() => initiateCall('video')}
                      className="hover:text-zinc-200 animate-pulse-subtle cursor-pointer" 
                      title="Bắt đầu cuộc gọi video"
                    >
                      <Video size={18} />
                    </button>

                    <div className="relative">
                      <button 
                        onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                        className="hover:text-zinc-200 cursor-pointer p-1 rounded hover:bg-white/5 transition-all flex items-center justify-center" 
                        title="Tiện ích khác"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {isMoreDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#1e1f22] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 animate-scale-in">
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreDropdownOpen(false);
                              setIsArchiveOpen(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            📁 Tệp lưu trữ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreDropdownOpen(false);
                              setIsColorModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            🎨 Đổi màu tin nhắn
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreDropdownOpen(false);
                              setGroupNameInput(`Nhóm của Bạn & ${activeChatPartner?.display_name || 'Bạn bè'}`);
                              setIsGroupModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-indigo-600 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            👥 Tạo nhóm chat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Side-by-side flex layout to support Right Archive Sidebar */}
                <div className="flex-1 flex overflow-hidden relative">
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Message Log */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col">
                  
                  <div className="text-center py-6 border-b border-white/5 mb-4 shrink-0">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-white text-3xl mx-auto mb-3 shadow-lg border border-white/5">👋</div>
                    <h3 className="text-white font-bold text-base">Bắt đầu cuộc trò chuyện với {activeChatPartner?.display_name}</h3>
                    <p className="text-xs text-zinc-500">Đây là sự khởi đầu của lịch sử tin nhắn trực tiếp của bạn.</p>
                  </div>

                  <div className="flex-1 space-y-5 flex flex-col justify-end">
                    {dbMessages.filter((msg) => !blockedIds.has(msg.sender_id)).map((msg, index) => {
                      const isMe = msg.sender_id === user.id;
                      const partnerName = activeChatPartner?.display_name || 'Bạn';
                      const partnerAvatar = activeChatPartner?.avatar_key ? `/api/media/${activeChatPartner.avatar_key}` : null;
                      const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div
                          key={msg.id || index}
                          className={`group flex gap-3 items-end max-w-[85%] sm:max-w-[75%] transition-all ${isMe ? 'self-end flex-row-reverse' : 'self-start flex-row'}`}
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0 mb-0.5">
                            {isMe ? (
                              avatarUrl ? (
                                <img src={avatarUrl} alt="Me" className="w-8 h-8 rounded-full object-cover border border-white/5 shadow-md" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-black text-xs uppercase shadow-md border border-white/5">
                                  {displayName.charAt(0).toUpperCase()}
                                </div>
                              )
                            ) : (
                              partnerAvatar ? (
                                <img src={partnerAvatar} alt="Partner" className="w-8 h-8 rounded-full object-cover border border-white/5 shadow-md" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-white font-black text-xs uppercase shadow-md border border-white/5">
                                  {partnerName.charAt(0).toUpperCase()}
                                </div>
                              )
                            )}
                          </div>

                          {/* Chat Bubble container */}
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {/* Sender Info */}
                            <div className="flex items-center gap-1.5 px-1 mb-1 text-[10px] text-zinc-500 font-bold select-none">
                              <span>{isMe ? 'Bạn' : partnerName}</span>
                              <span>•</span>
                              <span>{timeStr}</span>
                              {msg.edited_at && <span className="text-zinc-500 font-normal italic">(đã sửa)</span>}
                            </div>

                            {/* Reply preview */}
                            {msg.reply_to && (
                              <div className={`mb-1 px-2.5 py-1 rounded-lg bg-black/20 border-l-2 border-indigo-400/60 ${isMe ? 'self-end' : 'self-start'}`}>
                                <p className="text-[10px] font-bold text-indigo-300 truncate">↩ {msg.reply_to.profiles?.display_name || 'tin nhắn'}</p>
                                <p className="text-[11px] text-zinc-400 truncate max-w-[220px]">{(() => { const c = msg.reply_to.content || ''; return c.startsWith('{') ? '(tệp đính kèm)' : c; })()}</p>
                              </div>
                            )}

                            {/* Inline edit */}
                            {editingDmId === msg.id ? (
                              <div className="flex items-center gap-1.5 w-full">
                                <input
                                  value={editDmText}
                                  onChange={(e) => setEditDmText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditDm(msg.id, editDmText); if (e.key === 'Escape') setEditingDmId(null); }}
                                  autoFocus
                                  className="flex-1 bg-black/40 border border-indigo-500/50 rounded-xl px-3 py-2 text-[14px] text-white outline-none"
                                />
                                <button onClick={() => handleEditDm(msg.id, editDmText)} className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"><Check size={16} /></button>
                                <button onClick={() => setEditingDmId(null)} className="text-red-400 hover:text-red-300 p-1 cursor-pointer"><X size={16} /></button>
                              </div>
                            ) : (
                            <div className="flex items-end gap-1.5">
                            {/* Hover actions (text messages only) */}
                            {msg.type !== 'image' && !msg.content?.startsWith('[VOICE_INVITE]:') && (
                              <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center ${isMe ? '' : 'order-last'}`}>
                                <button onClick={() => setDmReplyTo(msg)} title="Trả lời" className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"><Reply size={13} /></button>
                                {isMe && msg.type !== 'file' && <button onClick={() => { setEditDmText(msg.content || ''); setEditingDmId(msg.id); }} title="Sửa" className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"><Pencil size={13} /></button>}
                                {isMe && <button onClick={() => { if (confirm('Xoá tin nhắn này?')) handleDeleteDm(msg.id); }} title="Xoá" className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-400 hover:bg-white/10 cursor-pointer"><Trash2 size={13} /></button>}
                              </div>
                            )}
                            <div className="min-w-0">
                            {/* Bubble Body: Conditional styling if it's an image */}
                            {msg.type === 'image' ? (
                              (() => {
                                try {
                                  const attachment = JSON.parse(msg.content);
                                  return (
                                    <button 
                                      type="button"
                                      onClick={() => setActiveLightboxImg(`/api/media/${attachment.objectKey}`)}
                                      className="inline-block relative group/img overflow-hidden rounded-xl border border-white/10 shadow-md max-w-[150px] sm:max-w-[180px] transition-all hover:scale-[1.02] duration-200 mt-1 cursor-pointer text-left"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img 
                                        src={`/api/media/${attachment.objectKey}`} 
                                        alt={attachment.fileName} 
                                        className="w-full h-auto object-cover max-h-40" 
                                      />
                                    </button>
                                  );
                                } catch (e) {
                                  return (
                                    <div className="px-4 py-2.5 rounded-2xl bg-zinc-800/90 border border-white/5 text-zinc-200 rounded-bl-none text-[13.5px]">
                                      {msg.content}
                                    </div>
                                  );
                                }
                              })()
                            ) : msg.content.startsWith('[VOICE_INVITE]:') ? (
                              <VoiceInviteCard payload={msg.content.slice('[VOICE_INVITE]:'.length)} />
                            ) : (
                              /* Bubble Body for text or file */
                              <div 
                                className={`px-4 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed break-words text-[13.5px] sm:text-[14px] font-medium shadow-md border ${
                                  isMe 
                                    ? `${themeStyles[chatThemeColor]?.bg || 'bg-indigo-600'} ${themeStyles[chatThemeColor]?.border || 'border-indigo-500'} text-white rounded-br-none` 
                                    : 'bg-zinc-800/90 border-white/5 text-zinc-200 rounded-bl-none'
                                }`}
                              >
                                {msg.type === 'file' ? (
                                  (() => {
                                    try {
                                      const attachment = JSON.parse(msg.content);
                                      return (
                                        <div className="flex items-center gap-3 bg-black/25 p-3 rounded-xl border border-white/5 max-w-sm mt-1">
                                          <span className="text-2xl shrink-0">📎</span>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-zinc-200 truncate">{attachment.fileName}</p>
                                            <p className="text-[10px] text-zinc-400 mt-0.5">{(attachment.sizeBytes / 1024).toFixed(1)} KB</p>
                                          </div>
                                          <a 
                                            href={`/api/media/${attachment.objectKey}`} 
                                            download={attachment.fileName}
                                            className="p-1.5 bg-white/5 hover:bg-white/15 rounded-lg text-xs font-bold text-white transition-all select-none shrink-0"
                                          >
                                            Tải xuống
                                          </a>
                                        </div>
                                      );
                                    } catch (e) {
                                      return <span>{msg.content}</span>;
                                    }
                                  })()
                                ) : (
                                  <>
                                    <RichText text={msg.content} />
                                    <EmbedList text={msg.content} />
                                  </>
                                )}
                              </div>
                            )}
                            </div>
                            </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                {dmTypingName && (
                  <div className="px-5 pb-1 text-[11px] text-zinc-400 italic animate-pulse shrink-0">{dmTypingName} đang gõ…</div>
                )}
                {dmReplyTo && (
                  <div className="mx-4 mb-1 flex items-center justify-between gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2 animate-fade-in-up">
                    <div className="min-w-0 text-xs">
                      <span className="text-indigo-300 font-bold">Đang trả lời {dmReplyTo.sender_id === user.id ? 'chính bạn' : (activeChatPartner?.display_name || 'tin nhắn')}</span>
                      <p className="text-zinc-400 truncate">{(dmReplyTo.content || '').startsWith('{') ? '(tệp đính kèm)' : dmReplyTo.content}</p>
                    </div>
                    <button type="button" onClick={() => setDmReplyTo(null)} className="text-zinc-400 hover:text-white shrink-0 cursor-pointer" title="Hủy trả lời">×</button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="p-4 bg-transparent border-t border-white/10 flex flex-col gap-3 flex-shrink-0">
                  {/* File Upload Preview */}
                  {selectedFile && (
                    selectedFile.type.startsWith('image/') ? (
                      /* Staging Image Preview */
                      <div className="relative w-28 h-28 ml-2 rounded-xl border border-white/10 overflow-hidden group shadow-md animate-scale-in flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={URL.createObjectURL(selectedFile)} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setSelectedFile(null)} 
                          className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer shadow-sm text-xs font-bold transition-all border border-white/10"
                          title="Hủy ảnh"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      /* Staging File Card Preview */
                      <div className="flex items-center gap-3 bg-[#2b2d31] p-3 rounded-2xl border border-white/5 shadow-md w-max max-w-sm ml-2 animate-scale-in">
                        <div className="text-xl">📁</div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-200 truncate max-w-[200px]">{selectedFile.name}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedFile(null)} 
                          className="text-zinc-400 hover:text-white transition-colors text-base font-bold bg-white/5 hover:bg-white/10 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer shadow-sm"
                          title="Hủy tệp"
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}

                  {/* Uploading progress indicator */}
                  {isUploading && (
                    <div className="flex items-center gap-2 text-zinc-400 text-xs px-2 animate-pulse font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
                      <span>Đang tải tệp tin lên hệ thống...</span>
                    </div>
                  )}

                  <div className="bg-[#383a40]/60 border border-white/5 rounded-2xl py-3 px-4 flex items-center shadow-lg focus-within:border-indigo-500 focus-within:bg-[#383a40]/80 transition-all">
                    {/* Add attachment button */}
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-zinc-400 hover:text-white mr-3 shrink-0 flex items-center justify-center w-7 h-7 bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-base font-bold animate-pulse-subtle"
                      title="Đính kèm tệp tin / hình ảnh"
                      disabled={isUploading}
                    >
                      +
                    </button>
                    
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                      }}
                    />

                    <input 
                      type="text" 
                      placeholder={isUploading ? "Vui lòng đợi..." : `Nhắn tin cho @${activeChatPartner?.display_name || 'user'}`}
                      value={currentMessageInput}
                      onChange={e => { setCurrentMessageInput(e.target.value); handleDmTyping(); }}
                      onPaste={handlePaste}
                      disabled={isUploading}
                      className="bg-transparent w-full outline-none text-xs text-white disabled:opacity-50 placeholder:text-zinc-500 font-medium mr-2"
                    />
                    <button 
                      type="submit" 
                      disabled={isUploading || (!currentMessageInput.trim() && !selectedFile)}
                      className="text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:hover:text-zinc-400 p-1 hover:bg-white/5 rounded-lg flex items-center justify-center"
                      title="Gửi tin nhắn"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
                </div>

                {/* Right side: Archive Sidebar */}
                {isArchiveOpen && (
                  <div className="w-80 border-l border-white/10 bg-[#2b2d31] flex flex-col h-full z-20 animate-slide-in flex-shrink-0">
                     {/* Sidebar Header */}
                     <div className="p-4 border-b border-white/10 flex items-center justify-between">
                       <span className="text-xs font-extrabold text-white uppercase tracking-wider">📁 Tệp lưu trữ</span>
                       <button 
                         type="button"
                         onClick={() => setIsArchiveOpen(false)}
                         className="text-zinc-400 hover:text-white text-lg font-bold cursor-pointer"
                       >
                         ×
                       </button>
                     </div>

                     {/* Tabs */}
                     <div className="flex border-b border-white/5 bg-[#1e1f22]/50 p-1 flex-shrink-0">
                       {(['media', 'files', 'links'] as const).map((tab) => (
                         <button
                           key={tab}
                           type="button"
                           onClick={() => setArchiveActiveTab(tab)}
                           className={`flex-1 text-[10px] font-extrabold py-1.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
                             archiveActiveTab === tab 
                               ? 'bg-indigo-600 text-white' 
                               : 'text-zinc-400 hover:text-zinc-200'
                           }`}
                         >
                           {tab === 'media' ? 'Ảnh' : tab === 'files' ? 'Tệp tin' : 'Links'}
                         </button>
                       ))}
                     </div>

                     {/* Content List */}
                     <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {archiveActiveTab === 'media' && (() => {
                          const mediaMsgs = dbMessages.filter(m => m.type === 'image');
                          if (mediaMsgs.length === 0) return <p className="text-zinc-500 text-center text-xs mt-8 font-medium">Chưa chia sẻ hình ảnh nào</p>;
                          return (
                            <div className="grid grid-cols-2 gap-2">
                              {mediaMsgs.map((m, idx) => {
                                try {
                                  const attachment = JSON.parse(m.content);
                                  return (
                                    <button 
                                      key={idx} 
                                      type="button"
                                      onClick={() => setActiveLightboxImg(`/api/media/${attachment.objectKey}`)}
                                      className="aspect-square bg-black/20 rounded-lg overflow-hidden border border-white/5 hover:scale-[1.02] transition-all flex items-center justify-center cursor-pointer"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img 
                                        src={`/api/media/${attachment.objectKey}`} 
                                        alt={attachment.fileName} 
                                        className="w-full h-full object-cover" 
                                      />
                                    </button>
                                  );
                                } catch(e) {
                                  return null;
                                }
                              })}
                            </div>
                          );
                        })()}

                        {archiveActiveTab === 'files' && (() => {
                          const fileMsgs = dbMessages.filter(m => m.type === 'file');
                          if (fileMsgs.length === 0) return <p className="text-zinc-500 text-center text-xs mt-8 font-medium">Chưa chia sẻ tệp tin nào</p>;
                          return (
                            <div className="space-y-2">
                              {fileMsgs.map((m, idx) => {
                                try {
                                  const attachment = JSON.parse(m.content);
                                  return (
                                    <div key={idx} className="bg-black/20 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                                      <span className="text-lg shrink-0">📎</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-bold text-zinc-200 truncate">{attachment.fileName}</p>
                                        <p className="text-[9px] text-zinc-400 mt-0.5">{(attachment.sizeBytes / 1024).toFixed(1)} KB</p>
                                      </div>
                                      <a 
                                        href={`/api/media/${attachment.objectKey}`} 
                                        download={attachment.fileName}
                                        className="text-[9px] font-bold bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white shrink-0"
                                      >
                                        Tải
                                      </a>
                                    </div>
                                  );
                                } catch(e) {
                                  return null;
                                }
                              })}
                            </div>
                          );
                        })()}

                        {archiveActiveTab === 'links' && (() => {
                          const linkRegex = /(https?:\/\/[^\s]+)/g;
                          const links: Array<{ url: string; sender: string; time: string }> = [];
                          dbMessages.forEach(m => {
                            const found = m.content.match(linkRegex);
                            if (found) {
                              found.forEach((url: string) => {
                                links.push({
                                  url,
                                  sender: m.sender_id === user.id ? 'Bạn' : (activeChatPartner?.display_name || 'Đối tác'),
                                  time: new Date(m.created_at).toLocaleDateString()
                                });
                              });
                            }
                          });

                          if (links.length === 0) return <p className="text-zinc-500 text-center text-xs mt-8 font-medium">Chưa chia sẻ liên kết nào</p>;
                          return (
                            <div className="space-y-2">
                              {links.map((lnk, idx) => (
                                <div key={idx} className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                                  <a 
                                    href={lnk.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-indigo-400 hover:underline font-bold break-all block"
                                  >
                                    {lnk.url}
                                  </a>
                                  <div className="flex justify-between text-[9px] text-zinc-500 font-bold pt-1">
                                    <span>Gửi bởi: {lnk.sender}</span>
                                    <span>{lnk.time}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                     </div>
                  </div>
                )}
              </div>
            </>
            )}
          </div>
        )}

        {/* VIEW 4: GROUP VOICE ROOM */}
        {activeView === 'voice' && activeVoiceRoomId && (
          <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
            <div className="h-16 border-b border-white/10 flex items-center px-4 sm:px-6 justify-between flex-shrink-0 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  onClick={() => setMobileShowSidebar(true)}
                  className="md:hidden p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white cursor-pointer mr-1 flex items-center justify-center"
                >
                  <ChevronRight className="rotate-180" size={16} />
                </button>
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
              <VoiceRoom 
                channelId={activeVoiceRoomId} 
                username={displayName} 
              />
            </div>
          </div>
        )}

      </div>

      {/* Popovers & Modals */}
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer animate-pulse-subtle"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Row Context Action Menu */}
      {activeMenuFriendId && menuPosition && (
        <div 
          style={{ top: menuPosition.y, left: menuPosition.x - 140 }}
          className="fixed z-50 bg-[#1e1b4b]/95 border border-white/15 backdrop-blur-2xl rounded-xl p-1.5 shadow-2xl animate-scale-in text-white w-44"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const friend = friendsProfiles.find(f => f.id === activeMenuFriendId);
              setPreviewUser(friend);
              setActiveMenuFriendId(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer text-left"
          >
            <span>Xem hồ sơ</span>
          </button>
          
          <button
            onClick={async () => {
              const friend = friendsProfiles.find(f => f.id === activeMenuFriendId);
              if (friend && friend.threadId) {
                if (confirm(`Bạn có chắc chắn muốn hủy kết bạn với "${friend.display_name || friend.username}"?`)) {
                  try {
                    await removeFriend(friend.threadId);
                    await loadDashboardData();
                  } catch (e) {
                    console.error('Failed to unfriend:', e);
                  }
                }
              }
              setActiveMenuFriendId(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-455 hover:bg-red-600 hover:text-white rounded-lg transition-colors cursor-pointer text-left border-t border-white/5 mt-1"
          >
            <span>Hủy kết bạn</span>
          </button>
          
          <button
            onClick={() => {
              if (confirm("Bạn có chắc chắn muốn chặn người dùng này?")) {
                const updated = [...blockedUserIds, activeMenuFriendId];
                setBlockedUserIds(updated);
                localStorage.setItem('blocked_user_ids', JSON.stringify(updated));
              }
              setActiveMenuFriendId(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-455 hover:bg-red-650 hover:text-white rounded-lg transition-colors cursor-pointer text-left"
          >
            <span>Chặn người dùng</span>
          </button>
        </div>
      )}

      {/* User Profile Preview Card Modal */}
      {previewUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1f22]/95 border border-white/10 w-[350px] rounded-2xl shadow-2xl overflow-hidden animate-scale-in text-white font-sans">
            <div className="h-20 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
              <button 
                onClick={() => setPreviewUser(null)} 
                className="absolute top-3 right-3 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-1.5 rounded-full transition-all cursor-pointer border border-white/5"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="px-5 pb-5 relative space-y-4">
              <div className="-mt-10 relative inline-block">
                {previewUser.avatar_key ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={`/api/media/${previewUser.avatar_key}`} 
                    alt="" 
                    className="w-20 h-20 rounded-full object-cover border-4 border-[#1e1f22] bg-zinc-800" 
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-indigo-900 text-white font-black text-2xl flex items-center justify-center border-4 border-[#1e1f22]">
                    {(previewUser.display_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#1e1f22] bg-green-500"></span>
              </div>

              <div>
                <h3 className="font-black text-lg text-white leading-tight">{previewUser.display_name || previewUser.username}</h3>
                <p className="text-xs text-zinc-400">@{previewUser.username || 'user'}</p>
              </div>

              <div className="border-t border-white/5 pt-3.5 space-y-3">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider leading-none">Mã ID Người Dùng</span>
                  <code className="text-xs text-cyan-400 font-mono font-bold block mt-1 bg-cyan-500/10 border border-cyan-500/10 px-2 py-0.5 rounded w-max select-all cursor-pointer">
                    {getTenDigitId(previewUser.id)}
                  </code>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider leading-none">Mã ID UUID</span>
                  <code className="text-[10px] text-zinc-400 font-mono block mt-1 select-all cursor-pointer">
                    {previewUser.id}
                  </code>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setPreviewUser(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-lg transition-colors cursor-pointer border border-white/5 text-zinc-200 hover:text-white"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
        {toasts.map(t => (
          <div 
            key={t.id} 
            onClick={() => {
              setSelectedChatId(t.threadId);
              setActiveVoiceRoomId(null);
              setActiveView('chat');
              setToasts(prev => prev.filter(x => x.id !== t.id));
            }}
            className="pointer-events-auto bg-black/40 border border-white/10 hover:bg-black/55 p-3.5 rounded-xl shadow-2xl flex gap-3 animate-scale-in items-center text-white w-80 backdrop-blur-xl cursor-pointer hover:border-white/20 transition-all"
          >
            <div className="shrink-0 relative">
              {t.avatar ? (
                <img src={t.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/5" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase border border-white/5">
                  {t.title.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="font-bold text-xs text-white truncate">{t.title}</h5>
              <p className="text-[11px] text-white/80 truncate mt-0.5">{t.content}</p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setToasts(prev => prev.filter(x => x.id !== t.id));
              }}
              className="text-zinc-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-all shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Chat Bubble Theme Color Modal */}
      {isColorModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#2b2d31] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-sm font-bold text-white mb-4">🎨 Chọn màu sắc tin nhắn</h3>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(themeStyles).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setChatThemeColor(key);
                    localStorage.setItem(`chat-theme-${selectedChatId}`, key);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    chatThemeColor === key
                      ? 'border-indigo-500 bg-indigo-600/10 text-white'
                      : 'border-white/5 bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${value.dot}`} />
                  {value.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsColorModalOpen(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 transition-colors text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Chat Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#2b2d31] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h3 className="text-sm font-bold text-white mb-2">👥 Tạo nhóm chat mới</h3>
            <p className="text-xs text-zinc-400 mb-4 font-medium leading-relaxed">Tạo không gian làm việc nhóm và tự động mời @{activeChatPartner?.display_name}.</p>

            <div className="space-y-2 mb-6">
              <label className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 block">Tên nhóm</label>
              <input
                type="text"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                className="w-full bg-black/25 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors font-medium"
                placeholder="Tên nhóm của bạn..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 transition-colors text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!groupNameInput.trim() || !activeChatPartner) return;
                  setIsGroupModalOpen(false);
                  const res = await createGroupWorkspaceWithPartner(
                    activeChatPartner.id, 
                    activeChatPartner.display_name || 'Đối tác', 
                    groupNameInput.trim()
                  );
                  if (res.error) {
                    alert(res.error);
                  } else if (res.workspaceId) {
                    window.location.href = `/workspace/${res.workspaceId}`;
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Tạo ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal Overlay */}
      {activeLightboxImg && (
        <div 
          onClick={() => setActiveLightboxImg(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[100] p-4 cursor-zoom-out animate-fade-in"
        >
          {/* Close & Action bar at the top */}
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10" onClick={e => e.stopPropagation()}>
            <a 
              href={activeLightboxImg}
              download
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-white/10"
              title="Tải ảnh gốc"
            >
              📥 Tải ảnh
            </a>
            <button
              type="button"
              onClick={() => setActiveLightboxImg(null)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-all cursor-pointer border border-white/10"
              title="Đóng xem ảnh"
            >
              ×
            </button>
          </div>

          {/* Main image view container */}
          <div className="max-w-4xl max-h-[85vh] relative animate-scale-in" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeLightboxImg} 
              alt="Lightbox View" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/10 shadow-2xl select-none"
            />
          </div>
        </div>
      )}

      {/* Incoming Call Overlay */}
      {incomingCallInvite && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1e1f22]/95 border border-white/10 w-[320px] rounded-2xl shadow-2xl p-6 text-center text-white space-y-5 animate-scale-in">
            <div className="relative inline-block">
              {incomingCallInvite.senderAvatar ? (
                <img 
                  src={`/api/media/${incomingCallInvite.senderAvatar}`} 
                  alt="" 
                  className="w-20 h-20 rounded-full object-cover border-4 border-indigo-600 mx-auto" 
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-600 text-white font-black text-2xl flex items-center justify-center border-4 border-indigo-600 mx-auto">
                  {incomingCallInvite.senderName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-1 right-1 w-4.5 h-4.5 bg-green-500 rounded-full border-4 border-[#1e1f22] animate-ping"></span>
            </div>

            <div>
              <h3 className="font-extrabold text-base text-white">{incomingCallInvite.senderName}</h3>
              <p className="text-xs text-zinc-400 mt-1">Đang gọi {incomingCallInvite.callType === 'video' ? 'video' : 'thoại'} cho bạn...</p>
            </div>

            <div className="flex justify-center gap-3.5 pt-2">
              <button
                onClick={handleDeclineCall}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                Từ chối 📞
              </button>
              <button
                onClick={handleAnswerCall}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5 animate-pulse-subtle"
              >
                Nhận cuộc gọi 📞
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
