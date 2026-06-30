import { signup } from '@/app/actions/auth'
import Link from 'next/link'
import { SubmitButton } from '@/components/auth/SubmitButton'

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="flex h-screen items-center justify-center bg-transparent">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-[#151b2e]/95 p-8 shadow-2xl border border-white/10 animate-fade-in-up">
        <div className="text-center">
           <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md border-4 border-white/20">
              <span className="text-4xl">✨</span>
           </div>
           <h2 className="text-3xl font-extrabold text-white">Tạo tài khoản mới</h2>
           <p className="text-sm text-white/70 mt-2 font-medium">
             Tham gia cộng đồng IntraSocial
           </p>
        </div>

        {error && <div className="p-3 bg-red-500/20 backdrop-blur-sm text-red-200 font-bold text-sm rounded-xl border border-red-500/30 shadow-sm">{error}</div>}

        <form action={signup} className="flex flex-col gap-5 mt-8">
          <input 
            type="text" 
            name="displayName"
            placeholder="Họ và tên hiển thị" 
            required
            className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-4 outline-none focus:bg-black/40 focus:ring-2 focus:ring-cyan-400 transition-all font-medium text-white placeholder-white/50 shadow-sm"
          />
          <input 
            type="email" 
            name="email"
            placeholder="Địa chỉ email" 
            required
            className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-4 outline-none focus:bg-black/40 focus:ring-2 focus:ring-cyan-400 transition-all font-medium text-white placeholder-white/50 shadow-sm"
          />
          <input 
            type="password" 
            name="password"
            placeholder="Mật khẩu (ít nhất 6 ký tự)" 
            required
            minLength={6}
            className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-4 outline-none focus:bg-black/40 focus:ring-2 focus:ring-cyan-400 transition-all font-medium text-white placeholder-white/50 shadow-sm"
          />
          <SubmitButton className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 py-4 text-white hover:from-cyan-400 hover:to-blue-400 font-bold text-lg transition-colors shadow-lg hover:shadow-cyan-500/30 transform hover:-translate-y-0.5 mt-2">
            Đăng ký tham gia →
          </SubmitButton>
        </form>

        <div className="text-center text-sm font-medium text-white/70 mt-6">
          Đã có tài khoản? <Link href="/login" className="text-cyan-400 font-bold hover:underline">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
