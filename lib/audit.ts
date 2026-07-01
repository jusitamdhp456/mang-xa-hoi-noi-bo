import { createSupabaseServiceClient } from '@/lib/supabase/server'

// Record a workspace moderation event. Best-effort — never throws.
export async function logAudit(workspaceId: string, actorId: string, action: string, detail?: string) {
  try {
    const service = createSupabaseServiceClient()
    await service.from('audit_logs').insert({
      workspace_id: workspaceId,
      actor_id: actorId,
      action,
      detail: detail || null,
    })
  } catch {
    /* ignore audit failures */
  }
}
