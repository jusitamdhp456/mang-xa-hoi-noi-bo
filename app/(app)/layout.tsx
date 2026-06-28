import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { UserSettingsModal } from '@/components/auth/UserSettingsModal';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch workspaces mà user này tham gia
  let userWorkspaces: { workspaces: { id: string, name: string } | null }[] = [];
  let profile = null;

  if (user) {
    const { data } = await supabase
      .from('workspace_members')
      .select('workspaces(id, name)')
      .eq('user_id', user.id);
    if (data) userWorkspaces = data as unknown as { workspaces: { id: string, name: string } | null }[];

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = profileData;
  }

  return (
    // Xoá bg-gray-100 vì globals.css đã lo phần nền Gradient
    <div className="flex h-screen overflow-hidden p-2 sm:p-4 gap-2">
      {/* Sidebar Server - Glassmorphism (Dark) */}
      <div className="w-[72px] bg-black/20 backdrop-blur-xl border border-white/10 shadow-lg rounded-3xl flex-shrink-0 flex flex-col items-center py-4 gap-3 overflow-y-auto hide-scrollbar z-10">
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

         {/* Nút Avatar Cá Nhân nằm dưới cùng */}
         <UserSettingsModal user={user} profile={profile} />
      </div>
      
      {/* Main Content (Dark) */}
      <div className="flex-1 flex overflow-hidden rounded-3xl shadow-xl bg-black/20 backdrop-blur-xl border border-white/10 z-10 text-white">
        {children}
      </div>
    </div>
  );
}
