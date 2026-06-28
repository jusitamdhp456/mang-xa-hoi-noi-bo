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
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar Server */}
      <div className="w-[72px] bg-gray-900 flex-shrink-0 flex flex-col items-center py-3 gap-2 overflow-y-auto hide-scrollbar">
         {userWorkspaces.map((item) => {
           const ws = item.workspaces;
           if (!ws) return null;
           // Lấy ký tự đầu tiên làm avatar
           const initial = ws.name.charAt(0).toUpperCase();
           
           return (
             <Link key={ws.id} href={`/workspace/${ws.id}`}>
               <div 
                 className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:bg-indigo-500 hover:rounded-2xl transition-all duration-200"
                 title={ws.name}
               >
                 {initial}
               </div>
             </Link>
           );
         })}
         
         <div className="w-10 h-px bg-gray-700 my-1 rounded-full"></div>
         
         <Link href="/onboarding">
           <div className="w-12 h-12 bg-gray-800 text-green-500 rounded-full flex items-center justify-center text-2xl cursor-pointer hover:bg-green-500 hover:text-white hover:rounded-2xl transition-all duration-200" title="Thêm Không gian làm việc">
              +
           </div>
         </Link>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}
