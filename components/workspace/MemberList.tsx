import { createSupabaseServerClient } from '@/lib/supabase/server'
import MemberStatus from './MemberStatus'

export default async function MemberList({ workspaceId }: { channelId?: string, workspaceId: string }) {
  const supabase = await createSupabaseServerClient()
  
  const { data: members } = await supabase
    .from('workspace_members')
    .select('role, profiles(id, display_name, status_text, avatar_key)')
    .eq('workspace_id', workspaceId)

  type MemberRow = {
    role: string;
    profiles: { id: string; display_name: string; status_text: string | null; avatar_key: string | null } | null;
  };

  return (
    <div className="w-64 bg-transparent border-l border-white/50 flex-shrink-0 flex flex-col h-full overflow-y-auto p-4 hidden lg:block z-10">
      <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 tracking-wider">Thành viên — {members?.length || 0}</h3>
      <div className="flex flex-col gap-3">
        {(members as unknown as MemberRow[])?.map((m) => (
          m.profiles && (
          <div key={m.profiles.id} className="flex items-center gap-3 cursor-pointer hover:bg-white/10 p-2 -mx-2 rounded-xl transition-all group">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm relative bg-white/80 border border-white text-pink-500 font-bold text-lg">
              {m.profiles.avatar_key ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${m.profiles.avatar_key}`} alt={m.profiles.display_name} className="w-full h-full object-cover" />
              ) : (
                m.profiles.display_name?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate transition-colors">{m.profiles.display_name}</p>
              <MemberStatus userId={m.profiles.id} defaultStatus={m.profiles.status_text} />
            </div>
          </div>
          )
        ))}
      </div>
    </div>
  )
}
