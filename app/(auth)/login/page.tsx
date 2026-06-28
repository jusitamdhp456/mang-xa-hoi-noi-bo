import { login } from '@/app/actions/auth'
import Link from 'next/link'
import { SubmitButton } from '@/components/auth/SubmitButton'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="flex h-screen items-center justify-center bg-transparent">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white/60 backdrop-blur-xl p-8 shadow-2xl border border-white/60">
        <div className="text-center">
           <div className="w-20 h-20 bg-gradient-to-br from-pink-300 to-purple-400 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md border-4 border-white">
              <span className="text-4xl">👋</span>
           </div>
           <h2 className="text-3xl font-extrabold text-zinc-800">Chào mừng trở lại</h2>
           <p className="text-sm text-zinc-500 mt-2 font-medium">
             Mạng xã hội nội bộ dành cho đội ngũ của bạn
           </p>
        </div>
        
        {error && <div className="p-3 bg-red-100/80 backdrop-blur-sm text-red-700 font-bold text-sm rounded-xl border border-red-200 shadow-sm">{error}</div>}

        <form action={login} className="flex flex-col gap-5 mt-8">
          <input 
            type="email" 
            name="email"
            placeholder="Địa chỉ email" 
            required
            className="rounded-2xl border border-white bg-white/50 backdrop-blur-sm p-4 outline-none focus:bg-white focus:ring-2 focus:ring-pink-300 transition-all font-medium text-zinc-700 shadow-sm"
          />
          <input 
            type="password" 
            name="password"
            placeholder="Mật khẩu" 
            required
            className="rounded-2xl border border-white bg-white/50 backdrop-blur-sm p-4 outline-none focus:bg-white focus:ring-2 focus:ring-pink-300 transition-all font-medium text-zinc-700 shadow-sm"
          />
          <SubmitButton className="rounded-full bg-zinc-900 py-4 text-white hover:bg-pink-500 font-bold text-lg transition-colors shadow-lg hover:shadow-pink-500/30 transform hover:-translate-y-0.5 mt-2">
            Bắt đầu trải nghiệm →
          </SubmitButton>
        </form>

        <div className="text-center text-sm font-medium text-zinc-500 mt-6">
          Chưa có tài khoản? <Link href="/register" className="text-pink-600 font-bold hover:underline">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
