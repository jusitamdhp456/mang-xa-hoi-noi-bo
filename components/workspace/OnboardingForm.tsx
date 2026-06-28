'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWorkspace } from '@/app/actions/workspace';
import { SubmitButton } from '@/components/auth/SubmitButton';

export function OnboardingForm() {
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    try {
      const res = await createWorkspace(formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.workspaceId) {
        router.push(`/workspace/${res.workspaceId}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.');
    }
  }

  return (
    <>
      {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded mb-4">{error}</div>}
      
      <form action={handleSubmit} className="flex flex-col gap-4 mt-6">
        <div>
           <label className="block text-sm font-medium text-zinc-700 mb-1">Tên Không gian làm việc</label>
           <input 
             type="text" 
             name="name"
             placeholder="Vd: Công ty TNHH ABC" 
             required
             className="rounded-2xl border border-white bg-white/50 backdrop-blur-sm p-4 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-300 transition-all font-medium text-zinc-700 shadow-sm w-full"
           />
        </div>
        <SubmitButton className="rounded-full bg-indigo-600 py-4 text-white hover:bg-indigo-700 font-bold text-lg transition-colors shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 mt-2">
          Tạo Workspace →
        </SubmitButton>
      </form>
    </>
  );
}
