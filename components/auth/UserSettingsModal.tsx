'use client';

import React, { useState } from 'react';
import { ImageUploader } from '../ui/ImageUploader';
import { updateAvatar } from '@/app/actions/user';
import { X, User, LogOut } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface UserSettingsModalProps {
  user: any;
  profile: any;
  customTrigger?: React.ReactNode;
}

export function UserSettingsModal({ user, profile, customTrigger }: UserSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleUploadSuccess = async (url: string) => {
    await updateAvatar(url);
    // The page will revalidate and update the layout
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

  const avatarUrl = profile?.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${profile.avatar_key}` : null;
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

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

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1f22] border border-white/10 shadow-2xl rounded-3xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-6">Hồ sơ cá nhân</h2>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-32 h-32 mb-4 rounded-full overflow-hidden shadow-lg border-4 border-[#2b2d31] bg-black/20">
                <ImageUploader 
                  onUploadSuccess={handleUploadSuccess} 
                  folder="avatars"
                  defaultImage={avatarUrl || undefined}
                  className="w-full h-full rounded-full"
                />
              </div>
              <h3 className="text-xl font-bold text-white">{displayName}</h3>
              <p className="text-sm text-white/50">{user?.email}</p>
            </div>

            <div className="space-y-4 mt-8">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500/20 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-colors border border-red-500/30"
              >
                <LogOut size={18} />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
