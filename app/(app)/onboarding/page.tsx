import { createWorkspace } from '@/app/actions/workspace'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/components/workspace/OnboardingForm';

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

        <OnboardingForm />
      </div>
    </div>
  );
}
