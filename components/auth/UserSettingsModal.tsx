'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ImageUploader } from '../ui/ImageUploader';
import { updateAvatar, updateProfile } from '@/app/actions/user';
import { X, User, LogOut, Volume2, Video, Tv, Bell, ShieldCheck, Check, Laptop } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface UserSettingsModalProps {
  user: any;
  profile: any;
  customTrigger?: React.ReactNode;
}

type TabType = 'account' | 'profile' | 'voice' | 'appearance' | 'notifications';

export function UserSettingsModal({ user, profile, customTrigger }: UserSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Profile Form state
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [statusText, setStatusText] = useState(profile?.status_text || '');
  const [aboutMe, setAboutMe] = useState(profile?.about_me || '');
  const [bannerColor, setBannerColor] = useState(profile?.banner_color || '#5865f2');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Audio/Video mock state
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [inputMode, setInputMode] = useState<'activity' | 'ptt'>('activity');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Appearance state
  const [theme, setTheme] = useState<'dark' | 'light' | 'midnight'>('dark');
  const [layoutMode, setLayoutMode] = useState<'cozy' | 'compact'>('cozy');

  // Notifications state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setStatusText(profile.status_text || '');
      setAboutMe(profile.about_me || '');
      setBannerColor(profile.banner_color || '#5865f2');
    }
  }, [profile]);

  // Handle ESC key to close settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // WebRTC Video Preview handler
  useEffect(() => {
    if (activeTab === 'voice' && isOpen) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          setVideoStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn("Could not access camera for preview:", err.message);
        });
    } else {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
      }
    }
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeTab, isOpen]);

  const handleUploadSuccess = async (url: string) => {
    await updateAvatar(url);
    router.refresh();
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    const res = await updateProfile({
      display_name: displayName,
      status_text: statusText,
      about_me: aboutMe,
      banner_color: bannerColor
    });

    setIsSaving(false);
    if (res?.error) {
      setSaveMessage(`Lỗi: ${res.error}`);
    } else {
      setSaveMessage('Đã lưu các thay đổi thành công!');
      setTimeout(() => setSaveMessage(''), 3000);
      router.refresh();
    }
  };

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const avatarUrl = profile?.avatar_key ? `/api/media/${profile.avatar_key}` : null;
  const computedDisplayName = displayName || user?.email?.split('@')[0] || 'User';

  const bannerPresets = [
    '#5865f2', // Blurple
    '#24a159', // Green
    '#e5c518', // Yellow
    '#eb459e', // Pink
    '#ed4245', // Red
    '#00aaaa', // Teal
    '#2b2d31', // Dark Gray
    '#111214'  // Midnight
  ];

  const modalContent = isOpen && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0891b2] flex text-zinc-300 font-sans animate-in fade-in duration-200">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="w-[280px] bg-black/20 backdrop-blur-xl flex-shrink-0 flex justify-end py-12 pr-6 border-r border-white/10 overflow-y-auto">
            <div className="w-48 flex flex-col gap-1 text-xs font-semibold">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider px-2.5 mb-1.5">Cài đặt người dùng</span>
              
              <button 
                onClick={() => setActiveTab('account')}
                className={`w-full text-left py-1.5 px-2.5 rounded text-sm font-medium transition-colors ${activeTab === 'account' ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-zinc-200'}`}
              >
                Tài khoản của tôi
              </button>
              
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full text-left py-1.5 px-2.5 rounded text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-zinc-200'}`}
              >
                Hồ sơ người dùng
              </button>

              <div className="h-[1px] bg-white/5 my-2"></div>
              
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider px-2.5 mb-1.5">Cài đặt ứng dụng</span>

              <button 
                onClick={() => setActiveTab('voice')}
                className={`w-full text-left py-1.5 px-2.5 rounded text-sm font-medium transition-colors ${activeTab === 'voice' ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-zinc-200'}`}
              >
                Giọng nói & Video
              </button>

              <button 
                onClick={() => setActiveTab('appearance')}
                className={`w-full text-left py-1.5 px-2.5 rounded text-sm font-medium transition-colors ${activeTab === 'appearance' ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-zinc-200'}`}
              >
                Giao diện
              </button>

              <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full text-left py-1.5 px-2.5 rounded text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-zinc-200'}`}
              >
                Thông báo
              </button>

              <div className="h-[1px] bg-white/5 my-2"></div>

              <button 
                onClick={handleLogout}
                className="w-full text-left py-1.5 px-2.5 rounded text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 bg-transparent py-12 pl-10 pr-24 overflow-y-auto flex gap-10">
            <div className="max-w-2xl flex-1">
              
              {/* TAB 1: MY ACCOUNT */}
              {activeTab === 'account' && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-6">Tài khoản của tôi</h2>
                  
                  {/* Account Card Banner */}
                  <div className="bg-black/30 rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-6">
                    <div 
                      className="h-28 w-full relative transition-all duration-300"
                      style={{ backgroundColor: bannerColor }}
                    ></div>
                    
                    <div className="px-6 pb-6 relative">
                      {/* Avatar Overlay */}
                      <div className="absolute -top-12 left-6 w-20 h-20 rounded-full overflow-hidden border-[6px] border-[#1e1f22] bg-black/20 backdrop-blur-xl">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/50 text-2xl font-bold">
                            {computedDisplayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Display Info */}
                      <div className="pt-10 flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {computedDisplayName}
                          </h3>
                          <p className="text-sm text-zinc-400">{user?.email}</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab('profile')}
                          className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Chỉnh sửa hồ sơ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Personal details info fields */}
                  <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                      <div>
                        <p className="text-xs text-zinc-500 font-bold uppercase">Tên hiển thị</p>
                        <p className="text-sm text-white font-medium">{computedDisplayName}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                      <div>
                        <p className="text-xs text-zinc-500 font-bold uppercase">Email</p>
                        <p className="text-sm text-white font-medium">{user?.email}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-zinc-500 font-bold uppercase">Trạng thái cá nhân</p>
                        <p className="text-sm text-white font-medium">{statusText || 'Chưa cài đặt trạng thái'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: USER PROFILE */}
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileSave} className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-2">Hồ sơ người dùng</h2>
                  <p className="text-xs text-zinc-400 mb-6">Tùy chỉnh thông tin hiển thị của bạn trong toàn hệ thống.</p>
                  
                  {saveMessage && (
                    <div className={`p-3 rounded-lg text-sm border font-medium ${saveMessage.startsWith('Lỗi') ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                      {saveMessage}
                    </div>
                  )}

                  {/* Avatar Upload Container */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-bold uppercase">Ảnh đại diện</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg border border-white/10 bg-black/20">
                        <ImageUploader 
                          onUploadSuccess={handleUploadSuccess} 
                          folder="avatars"
                          defaultImage={avatarUrl || undefined}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                      <div className="text-xs text-zinc-500">
                        Hỗ trợ PNG, JPG, GIF kích thước tối đa 5MB. Nhấp trực tiếp vào ảnh để thay đổi.
                      </div>
                    </div>
                  </div>

                  {/* Display Name Input */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-bold uppercase">Tên hiển thị</label>
                    <input 
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nhập tên hiển thị..."
                      className="w-full bg-black/30 border border-black/30 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#5865f2] transition-colors"
                      required
                    />
                  </div>

                  {/* Status Input */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-bold uppercase">Trạng thái cá nhân</label>
                    <input 
                      type="text"
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      placeholder="Hôm nay bạn thế nào?..."
                      className="w-full bg-black/30 border border-black/30 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#5865f2] transition-colors"
                    />
                  </div>

                  {/* Banner Color Picker */}
                  <div className="space-y-3">
                    <label className="text-xs text-zinc-400 font-bold uppercase block">Màu biểu ngữ</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {bannerPresets.map(color => (
                        <button
                          type="button"
                          key={color}
                          onClick={() => setBannerColor(color)}
                          className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform relative"
                          style={{ backgroundColor: color }}
                        >
                          {bannerColor === color && (
                            <span className="absolute inset-0 flex items-center justify-center text-white text-[10px]">
                              <Check size={14} />
                            </span>
                          )}
                        </button>
                      ))}
                      <input 
                        type="color"
                        value={bannerColor}
                        onChange={(e) => setBannerColor(e.target.value)}
                        className="w-8 h-8 rounded-full border border-white/10 p-0 overflow-hidden cursor-pointer hover:scale-110 transition-transform"
                      />
                    </div>
                  </div>

                  {/* About Me Input */}
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-400 font-bold uppercase">Tiểu sử (Giới thiệu bản thân)</label>
                    <textarea 
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      placeholder="Một chút thông tin về bạn..."
                      rows={4}
                      className="w-full bg-black/30 border border-black/30 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#5865f2] transition-colors resize-none"
                    />
                  </div>

                  {/* Save Buttons */}
                  <div className="pt-4 border-t border-white/5 flex justify-end gap-2">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="bg-[#24a159] hover:bg-[#1f874a] text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: VOICE & VIDEO */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-6">Giọng nói & Video</h2>

                  {/* Device Configuration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-400 font-bold uppercase">Thiết bị đầu vào (Mic)</label>
                      <select className="w-full bg-black/30 border border-black/30 rounded-lg p-2.5 text-sm text-white focus:outline-none">
                        <option>Microphone mặc định</option>
                        <option>Microphone ngoài (USB)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-zinc-400 font-bold uppercase">Thiết bị đầu ra (Loa/Tai nghe)</label>
                      <select className="w-full bg-black/30 border border-black/30 rounded-lg p-2.5 text-sm text-white focus:outline-none">
                        <option>Tai nghe mặc định</option>
                        <option>Loa ngoài hệ thống</option>
                      </select>
                    </div>
                  </div>

                  {/* Volume Controls */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-zinc-400 font-bold uppercase">Âm lượng mic</label>
                        <span className="text-xs text-zinc-500 font-semibold">{inputVolume}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100"
                        value={inputVolume}
                        onChange={(e) => setInputVolume(Number(e.target.value))}
                        className="w-full accent-[#5865f2] bg-zinc-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-zinc-400 font-bold uppercase">Âm lượng loa</label>
                        <span className="text-xs text-zinc-500 font-semibold">{outputVolume}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100"
                        value={outputVolume}
                        onChange={(e) => setOutputVolume(Number(e.target.value))}
                        className="w-full accent-[#5865f2] bg-zinc-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Input mode */}
                  <div className="space-y-3">
                    <label className="text-xs text-zinc-400 font-bold uppercase block">Chế độ đàm thoại</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setInputMode('activity')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${inputMode === 'activity' ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' : 'bg-black/20 backdrop-blur-xl border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Volume2 size={20} />
                          <span className="text-sm font-semibold">Tự động nhận giọng nói</span>
                        </div>
                        {inputMode === 'activity' && <Check size={18} className="text-[#5865f2]" />}
                      </div>

                      <div 
                        onClick={() => setInputMode('ptt')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${inputMode === 'ptt' ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' : 'bg-black/20 backdrop-blur-xl border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Laptop size={20} />
                          <span className="text-sm font-semibold">Ấn để nói (Push to talk)</span>
                        </div>
                        {inputMode === 'ptt' && <Check size={18} className="text-[#5865f2]" />}
                      </div>
                    </div>
                  </div>

                  {/* Webcam Preview Panel */}
                  <div className="space-y-3">
                    <label className="text-xs text-zinc-400 font-bold uppercase block">Kiểm tra Camera (Webcam)</label>
                    <div className="bg-black/30 rounded-xl overflow-hidden aspect-video relative flex items-center justify-center border border-white/10">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                      {!videoStream && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-zinc-400 text-center p-4">
                          <Video size={36} className="text-zinc-600 animate-pulse" />
                          <p className="text-sm font-medium">Chưa có kết nối Camera</p>
                          <p className="text-xs text-zinc-500 max-w-xs">Nhấp Cấp quyền Camera trên trình duyệt để kiểm tra khung hình trực tiếp của bạn.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: APPEARANCE */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-6">Giao diện</h2>

                  {/* Themes Select */}
                  <div className="space-y-3">
                    <label className="text-xs text-zinc-400 font-bold uppercase block">Chủ đề (Theme)</label>
                    <div className="grid grid-cols-3 gap-4">
                      
                      {/* Dark */}
                      <div 
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${theme === 'dark' ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' : 'bg-black/20 backdrop-blur-xl border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        <div className="w-full h-10 bg-[#313338] rounded-md border border-white/10 mb-1"></div>
                        <span className="text-sm font-semibold">Tối (Dark)</span>
                      </div>

                      {/* Light */}
                      <div 
                        onClick={() => setTheme('light')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${theme === 'light' ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' : 'bg-black/20 backdrop-blur-xl border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        <div className="w-full h-10 bg-[#f2f3f5] rounded-md border border-white/10 mb-1"></div>
                        <span className="text-sm font-semibold">Sáng (Light)</span>
                      </div>

                      {/* Midnight */}
                      <div 
                        onClick={() => setTheme('midnight')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 ${theme === 'midnight' ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' : 'bg-black/20 backdrop-blur-xl border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        <div className="w-full h-10 bg-[#0c0d0e] rounded-md border border-white/10 mb-1"></div>
                        <span className="text-sm font-semibold">Cực tối (Midnight)</span>
                      </div>
                    </div>
                  </div>

                  {/* Layout Display Style */}
                  <div className="space-y-3">
                    <label className="text-xs text-zinc-400 font-bold uppercase block">Chế độ hiển thị tin nhắn</label>
                    <div className="space-y-3">
                      
                      {/* Cozy */}
                      <div 
                        onClick={() => setLayoutMode('cozy')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${layoutMode === 'cozy' ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' : 'bg-black/20 backdrop-blur-xl border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#5865f2] flex-shrink-0 flex items-center justify-center font-bold text-white">U</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Cozy (Tiêu chuẩn)</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Hiển thị tin nhắn kèm avatar to, thông thoáng và dễ đọc.</p>
                        </div>
                      </div>

                      {/* Compact */}
                      <div 
                        onClick={() => setLayoutMode('compact')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${layoutMode === 'compact' ? 'bg-[#5865f2]/10 border-[#5865f2] text-white' : 'bg-black/20 backdrop-blur-xl border-white/5 text-zinc-400 hover:bg-white/5'}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center font-bold text-white/50 text-xs">C</div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-white">Compact (Bản thu gọn)</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Tiết kiệm diện tích màn hình bằng cách ẩn avatar, gom tin nhắn sát nhau.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-6">Thông báo</h2>

                  <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-6">
                    
                    {/* Push Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">Thông báo đẩy trên máy tính</p>
                        <p className="text-xs text-zinc-500">Nhận thông báo khi có tin nhắn hoặc cuộc gọi mới ngay cả khi ẩn tab.</p>
                      </div>
                      <button 
                        onClick={() => setPushEnabled(!pushEnabled)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${pushEnabled ? 'bg-[#24a159]' : 'bg-zinc-600'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${pushEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Sounds Toggle */}
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div>
                        <p className="text-sm font-semibold text-white">Âm thanh thông báo</p>
                        <p className="text-xs text-zinc-500">Phát âm thanh khi gửi/nhận tin nhắn, tham gia cuộc gọi.</p>
                      </div>
                      <button 
                        onClick={() => setSoundsEnabled(!soundsEnabled)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${soundsEnabled ? 'bg-[#24a159]' : 'bg-zinc-600'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${soundsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Email Toggle */}
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div>
                        <p className="text-sm font-semibold text-white">Thông báo qua Email</p>
                        <p className="text-xs text-zinc-500">Nhận báo cáo tóm tắt các cuộc trò chuyện bị bỏ lỡ qua hộp thư.</p>
                      </div>
                      <button 
                        onClick={() => setEmailEnabled(!emailEnabled)}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${emailEnabled ? 'bg-[#24a159]' : 'bg-zinc-600'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${emailEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: PROFILE LIVE PREVIEW CARD */}
            {activeTab === 'profile' && (
              <div className="w-[300px] flex-shrink-0">
                <label className="text-xs text-zinc-400 font-bold uppercase block mb-3">Xem trước hồ sơ</label>
                
                <div className="bg-black/30 rounded-xl overflow-hidden border border-white/10 shadow-2xl text-white">
                  {/* Banner */}
                  <div 
                    className="h-16 w-full relative transition-all duration-300"
                    style={{ backgroundColor: bannerColor }}
                  ></div>
                  
                  {/* Content box */}
                  <div className="px-4 pb-4 pt-10 relative">
                    {/* Avatar */}
                    <div className="absolute -top-8 left-4 w-16 h-16 rounded-full overflow-hidden border-4 border-[#1e1f22] bg-black/20 backdrop-blur-xl">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/50 text-xl font-bold">
                          {computedDisplayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="bg-[#111214] rounded-lg p-3 mt-1 space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">{computedDisplayName}</h4>
                        <p className="text-xs text-zinc-400">{user?.email?.split('@')[0]}</p>
                      </div>
                      
                      {statusText && (
                        <div className="text-xs text-zinc-300 italic border-l-2 border-[#5865f2] pl-2 py-0.5">
                          "{statusText}"
                        </div>
                      )}

                      <div className="h-[1px] bg-white/5"></div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Tiểu sử</p>
                        <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap break-all">
                          {aboutMe || 'Chưa viết lời giới thiệu bản thân...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DISCORD CLOSE BUTTON (ESC) */}
          <div className="absolute top-12 right-20 flex flex-col items-center">
            <button 
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 rounded-full border border-zinc-500 text-zinc-400 hover:text-white hover:bg-zinc-700/50 flex items-center justify-center transition-all cursor-pointer hover:scale-105"
            >
              <X size={18} />
            </button>
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mt-1.5">ESC</span>
          </div>

        </div>
      );

      return (
        <>
          {customTrigger ? (
            <div onClick={() => setIsOpen(true)}>{customTrigger}</div>
          ) : (
            <div 
              className="w-12 h-12 mt-auto bg-white/10 backdrop-blur-md shadow-sm border border-white/10 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-white/20 hover:shadow-md transition-all duration-200 overflow-hidden"
              onClick={() => setIsOpen(true)}
              title="Cài đặt cá nhân"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-white/70" />
              )}
            </div>
          )}

          {mounted && typeof document !== 'undefined'
            ? createPortal(modalContent, document.body)
            : modalContent}
        </>
      );
}
