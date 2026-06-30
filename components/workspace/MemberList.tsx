import { createSupabaseServerClient } from '@/lib/supabase/server'
import MemberStatus from './MemberStatus'
import { MemberRoleMenu } from './MemberRoleMenu'

const ROLE_META: Record<string, { label: string; color: string; rank: number }> = {
  owner: { label: 'Chủ sở hữu', color: 'text-amber-400', rank: 3 },
  admin: { label: 'Quản trị', color: 'text-rose-400', rank: 2 },
  mod: { label: 'Điều hành', color: 'text-sky-400', rank: 1 },
  member: { label: 'Thành viên', color: 'text-zinc-400', rank: 0 },
}
const GROUP_ORDER = ['owner', 'admin', 'mod', 'member']

type MemberRow = {
  role: string
  profiles: { id: string; display_name: string; status_text: string | null; avatar_key: string | null } | null
}

export default async function MemberList({ workspaceId }: { channelId?: string, workspaceId: string }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: members } = await supabase
    .from('workspace_members')
    .select('role, profiles(id, display_name, status_text, avatar_key)')
    .eq('workspace_id', workspaceId)

  const list = (members as unknown as MemberRow[])?.filter((m) => m.profiles) || []
  const myRole = list.find((m) => m.profiles?.id === user?.id)?.role || 'member'
  const myRank = ROLE_META[myRole]?.rank ?? 0
  const canManage = myRole === 'owner' || myRole === 'admin'

  const grouped = GROUP_ORDER.map((role) => ({
    role,
    meta: ROLE_META[role],
    members: list.filter((m) => m.role === role),
  })).filter((g) => g.members.length > 0)

  return (
    <div className="w-64 bg-transparent border-l border-white/50 flex-shrink-0 flex flex-col h-full overflow-y-auto p-4 hidden lg:block z-10">
      <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 tracking-wider">Thành viên — {list.length}</h3>
      <div className="flex flex-col gap-4">
        {grouped.map((g) => (
          <div key={g.role}>
            <p className={`text-[10px] font-extrabold uppercase tracking-wider mb-2 ${g.meta.color}`}>
              {g.meta.label} — {g.members.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {g.members.map((m) => {
                const p = m.profiles!
                const targetRank = ROLE_META[m.role]?.rank ?? 0
                const showMenu = canManage && p.id !== user?.id && targetRank < myRank
                return (
                  <div key={p.id} className="flex items-center gap-3 hover:bg-white/10 p-2 -mx-2 rounded-xl transition-all group">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm bg-white/80 border border-white text-pink-500 font-bold">
                      {p.avatar_key ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/media/${p.avatar_key}`} alt={p.display_name} className="w-full h-full object-cover" />
                      ) : (
                        p.display_name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                        {p.display_name}
                        {m.role === 'owner' && <span className="text-amber-400 text-xs" title="Chủ sở hữu">👑</span>}
                      </p>
                      <MemberStatus userId={p.id} defaultStatus={p.status_text} />
                    </div>
                    {showMenu && <MemberRoleMenu workspaceId={workspaceId} targetUserId={p.id} currentRole={m.role} />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
