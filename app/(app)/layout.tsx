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

  if (user) {
    const { data } = await supabase
      .from('workspace_members')
      .select('workspaces(id, name)')
      .eq('user_id', user.id);
    if (data) userWorkspaces = data as unknown as { workspaces: { id: string, name: string } | null }[];
  }

  return (
    // Xoá bg-gray-100 vì globals.css đã lo phần nền Gradient
    <div className="flex h-screen overflow-hidden p-2 sm:p-4 gap-2">
      {/* Sidebar Server - Glassmorphism (Dark) */}
      <div className="w-[72px] bg-black/20 backdrop-blur-xl border border-white/10 shadow-lg rounded-3xl flex-shrink-0 flex flex-col items-center py-4 gap-3 overflow-y-auto hide-scrollbar z-10">
         {/* Home button (Direct Messages) */}
         <Link href="/channels/me" className="flex-shrink-0">
           <div 
             className="w-12 h-12 bg-white/10 hover:bg-[#5865F2] backdrop-blur-md shadow-sm border border-white/10 text-white rounded-full hover:rounded-2xl flex items-center justify-center cursor-pointer hover:scale-105 transition-all duration-200"
             title="Tin nhắn trực tiếp & Bạn bè"
           >
             <svg className="w-6 h-6 fill-current" viewBox="0 0 127.14 96.36">
               <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.89-.65,1.76-1.34,2.58-2.07a75.14,75.14,0,0,0,93.44,0c.82.73,1.69,1.42,2.58,2.07a68.43,68.43,0,0,1-10.5,5A77.7,77.7,0,0,0,111.72,85.5a105.73,105.73,0,0,0,31-18.83C143.74,50.85,137.63,28.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
             </svg>
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
