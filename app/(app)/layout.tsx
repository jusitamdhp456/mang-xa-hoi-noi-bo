import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

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
      {/* Sidebar Server - Glassmorphism */}
      <div className="w-[72px] bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl flex-shrink-0 flex flex-col items-center py-4 gap-3 overflow-y-auto hide-scrollbar z-10">
         {userWorkspaces.map((item) => {
           const ws = item.workspaces;
           if (!ws) return null;
           // Lấy ký tự đầu tiên làm avatar
           const initial = ws.name.charAt(0).toUpperCase();
           
           return (
             <Link key={ws.id} href={`/workspace/${ws.id}`}>
               <div 
                 className="w-12 h-12 bg-white/60 backdrop-blur-md shadow-sm border border-white/60 rounded-full flex items-center justify-center text-zinc-800 font-bold cursor-pointer hover:bg-white hover:shadow-md hover:scale-105 transition-all duration-200"
                 title={ws.name}
               >
                 {initial}
               </div>
             </Link>
           );
         })}
         
         <div className="w-8 h-[2px] bg-white/50 my-1 rounded-full"></div>
         
         <Link href="/onboarding">
           <div className="w-12 h-12 bg-white/30 border border-white/40 text-zinc-600 rounded-full flex items-center justify-center text-2xl cursor-pointer hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 shadow-sm" title="Thêm Không gian làm việc">
              +
           </div>
         </Link>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden rounded-3xl shadow-xl bg-white/40 backdrop-blur-xl border border-white/50 z-10">
        {children}
      </div>
    </div>
  );
}
