import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { VoiceSettingsProvider } from '@/components/providers/VoiceSettingsProvider';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch workspaces mà user này tham gia
  let userWorkspaces: { workspaces: { id: string, name: string } | null }[] = [];
  let userProfile: any = null;

  if (user) {
    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profile) userProfile = profile;

    // Fetch workspaces
    const { data } = await supabase
      .from('workspace_members')
      .select('workspaces(id, name)')
      .eq('user_id', user.id);
    if (data) userWorkspaces = data as unknown as { workspaces: { id: string, name: string } | null }[];
  }

  const avatarUrl = userProfile?.avatar_key ? `https://pub-9664a868c7184eaea9c2c0f43942f9d9.r2.dev/${userProfile.avatar_key}` : null;
  const initial = (userProfile?.display_name || user?.email?.split('@')[0] || 'M').charAt(0).toUpperCase();

  return (
    // Xoá bg-gray-100 vì globals.css đã lo phần nền Gradient
    <div className="flex h-screen overflow-hidden p-2 sm:p-4 gap-2">
      {/* Sidebar Server - Glassmorphism (Dark) */}
      <div className="w-[72px] bg-black/20 backdrop-blur-xl border border-white/10 shadow-lg rounded-3xl flex-shrink-0 flex flex-col items-center py-4 gap-3 overflow-y-auto hide-scrollbar z-10">
         {/* Home button (Direct Messages) */}
         <Link href="/channels/me" className="flex-shrink-0">
           <div 
             className="w-12 h-12 bg-white/10 hover:bg-[#5865F2] backdrop-blur-md shadow-sm border border-white/10 text-white rounded-full hover:rounded-2xl flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-200 overflow-hidden"
             title="Tin nhắn trực tiếp & Bạn bè"
           >
             {avatarUrl ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <span className="font-bold text-lg text-white">{initial}</span>
             )}
           </div>
         </Link>

         {/* Separator */}
         <div className="w-8 h-[2px] bg-white/20 flex-shrink-0 rounded-full"></div>

         {userWorkspaces.map((item, index) => {
           let ws = item.workspaces;
           if (Array.isArray(ws)) ws = ws[0];
           if (!ws || !ws.name) return null;
           // Lấy ký tự đầu tiên làm avatar
           const initial = ws.name.charAt(0).toUpperCase();
           
           return (
             <Link key={ws.id || index} href={`/workspace/${ws.id}`}>
               <div 
                 className="w-12 h-12 bg-white/10 backdrop-blur-md shadow-sm border border-white/10 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:bg-white/20 hover:shadow-md hover:scale-105 transition-all duration-200"
                 title={ws.name}
               >
                 {initial}
               </div>
             </Link>
           );
         })}
         
         <div className="w-8 h-[2px] bg-white/20 my-1 rounded-full flex-shrink-0"></div>
         
         <Link href="/onboarding" className="flex-shrink-0">
           <div className="w-12 h-12 bg-white/5 border border-white/10 text-white/70 rounded-full flex items-center justify-center text-2xl cursor-pointer hover:bg-white/20 hover:text-white hover:scale-105 transition-all duration-200 shadow-sm" title="Thêm Không gian làm việc">
              +
           </div>
         </Link>
      </div>
      
      {/* Main Content (Dark) */}
      <div className="flex-1 flex overflow-hidden rounded-3xl shadow-xl bg-black/20 backdrop-blur-xl border border-white/10 z-10 text-white">
        <VoiceSettingsProvider>
          {children}
        </VoiceSettingsProvider>
      </div>
    </div>
  );
}
