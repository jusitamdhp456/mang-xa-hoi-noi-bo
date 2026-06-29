import { login } from '@/app/actions/auth'
import Link from 'next/link'
import { SubmitButton } from '@/components/auth/SubmitButton'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="flex h-screen items-center justify-center bg-transparent">
      <div className="w-full max-w-4xl rounded-3xl bg-[#151b2e]/90 shadow-2xl border border-white/10 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Form */}
        <div className="flex-1 p-8 md:p-12 space-y-8">
          <div className="text-center md:text-left">
             <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full mb-4 flex items-center justify-center shadow-md border-4 border-white/20 mx-auto md:mx-0">
                <span className="text-3xl">👋</span>
             </div>
             <h2 className="text-3xl font-extrabold text-white">Chào mừng trở lại!</h2>
             <p className="text-sm text-white/70 mt-2 font-medium">
               Chúng tôi rất vui mừng khi thấy bạn quay lại!
             </p>
          </div>
          
          {error && <div className="p-3 bg-red-500/20 backdrop-blur-sm text-red-200 font-bold text-sm rounded-xl border border-red-500/30 shadow-sm">{error}</div>}

          <form action={login} className="flex flex-col gap-5 mt-8">
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Email <span className="text-red-400">*</span></label>
              <input 
                type="email" 
                name="email"
                required
                className="w-full rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm p-3 outline-none focus:bg-black/50 focus:ring-2 focus:ring-cyan-400 transition-all font-medium text-white shadow-sm"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/70 uppercase tracking-wider">Mật khẩu <span className="text-red-400">*</span></label>
              <input 
                type="password" 
                name="password"
                required
                className="w-full rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm p-3 outline-none focus:bg-black/50 focus:ring-2 focus:ring-cyan-400 transition-all font-medium text-white shadow-sm"
              />
              <div className="text-left mt-1">
                <Link href="#" className="text-xs text-cyan-400 font-medium hover:underline">Quên mật khẩu?</Link>
              </div>
            </div>

            <SubmitButton className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-white hover:from-cyan-400 hover:to-blue-400 font-bold text-md transition-colors shadow-lg hover:shadow-cyan-500/30 transform mt-2">
              Đăng Nhập
            </SubmitButton>
          </form>

          <div className="text-left text-sm font-medium text-white/70 mt-6">
            Cần một tài khoản? <Link href="/register" className="text-cyan-400 font-bold hover:underline">Đăng ký</Link>
          </div>
        </div>

        {/* Right Side: QR Code (Discord Style) */}
        <div className="hidden md:flex flex-col items-center justify-center w-80 bg-black/20 p-8 border-l border-white/10 relative overflow-hidden">
           {/* Decorative elements */}
           <div className="absolute top-10 right-10 w-24 h-24 bg-cyan-500 rounded-full blur-3xl opacity-20"></div>
           <div className="absolute bottom-10 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
           
           <div className="relative bg-white p-4 rounded-2xl shadow-2xl mb-8 transform transition-transform hover:scale-105 duration-300">
             {/* Fake QR Code using SVG */}
             <svg width="150" height="150" viewBox="0 0 100 100" className="text-black">
                <rect width="100" height="100" fill="white" />
                {/* QR Pattern mock */}
                <path d="M10,10 h25 v25 h-25 z M15,15 h15 v15 h-15 z M65,10 h25 v25 h-25 z M70,15 h15 v15 h-15 z M10,65 h25 v25 h-25 z M15,70 h15 v15 h-15 z M45,10 h10 v10 h-10 z M45,25 h15 v10 h-15 z M45,45 h10 v20 h-10 z M10,45 h25 v10 h-25 z M65,45 h25 v10 h-25 z M65,65 h10 v10 h-10 z M80,65 h10 v25 h-10 z M45,75 h20 v15 h-20 z M25,80 h10 v10 h-10 z" fill="currentColor"/>
                {/* Center logo mock */}
                <rect x="40" y="40" width="20" height="20" rx="5" fill="#06b6d4" />
             </svg>
             
             {/* Scanning line animation */}
             <div className="absolute top-4 left-4 right-4 h-0.5 bg-cyan-400 shadow-[0_0_8px_2px_rgba(6,182,212,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
           </div>

           <h3 className="text-2xl font-bold text-white text-center mb-2">Đăng nhập bằng mã QR</h3>
           <p className="text-sm text-white/70 text-center font-medium leading-relaxed">
             Quét mã này bằng **Ứng dụng di động** để đăng nhập ngay lập tức.
           </p>
        </div>
      </div>
    </div>
  );
}
