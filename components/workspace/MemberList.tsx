import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function MemberList({ workspaceId }: { channelId?: string, workspaceId: string }) {
  const supabase = await createSupabaseServerClient()
  
  const { data: members } = await supabase
    .from('workspace_members')
    .select('role, profiles(id, display_name, status_text)')
    .eq('workspace_id', workspaceId)

  type MemberRow = {
    role: string;
    profiles: { id: string; display_name: string; status_text: string | null } | null;
  };

  return (
    <div className="w-60 bg-gray-50 border-l flex-shrink-0 flex flex-col h-full overflow-y-auto p-4 hidden lg:block">
      <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">Thành viên — {members?.length || 0}</h3>
      <div className="flex flex-col gap-3">
        {(members as unknown as MemberRow[])?.map((m) => (
          m.profiles && (
          <div key={m.profiles.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-200 p-1 -mx-1 rounded transition-colors">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
              {m.profiles.display_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-800 truncate">{m.profiles.display_name}</p>
              {m.profiles.status_text && (
                <p className="text-xs text-gray-500 truncate">{m.profiles.status_text}</p>
              )}
            </div>
          </div>
          )
        ))}
      </div>
    </div>
  )
}
