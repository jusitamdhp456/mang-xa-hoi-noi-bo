import { createWorkspace } from '@/app/actions/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  
  // Kiểm tra nếu đã có workspace thì chuyển hướng vào workspace đầu tiên
  const { data: workspaces } = await supabase.from('workspace_members').select('workspace_id').limit(1);
  if (workspaces && workspaces.length > 0) {
    redirect(`/workspace/${workspaces[0].workspace_id}`);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Chào mừng bạn!</h2>
          <p className="text-sm text-gray-600 mt-2">
            Hãy bắt đầu bằng cách tạo Không gian làm việc (Workspace) đầu tiên cho đội ngũ của bạn.
          </p>
        </div>

        {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded">{error}</div>}

        <form action={createWorkspace} className="flex flex-col gap-4 mt-6">
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Tên Không gian làm việc</label>
             <input 
               type="text" 
               name="name"
               placeholder="Vd: Công ty TNHH ABC" 
               required
               className="rounded border p-2 w-full"
             />
          </div>
          <button type="submit" className="rounded bg-indigo-600 p-2 text-white hover:bg-indigo-700 font-medium transition-colors">
            Tạo Workspace
          </button>
        </form>
      </div>
    </div>
  );
}
