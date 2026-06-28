import { login } from '@/app/actions/auth'
import Link from 'next/link'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">Đăng nhập vào hệ thống</h2>
        <p className="text-center text-sm text-gray-600">
          Mạng xã hội nội bộ dành cho đội ngũ của bạn
        </p>
        
        {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded">{error}</div>}

        <form action={login} className="flex flex-col gap-4">
          <input 
            type="email" 
            name="email"
            placeholder="Địa chỉ email" 
            required
            className="rounded border p-2"
          />
          <input 
            type="password" 
            name="password"
            placeholder="Mật khẩu" 
            required
            className="rounded border p-2"
          />
          <button type="submit" className="rounded bg-blue-600 p-2 text-white hover:bg-blue-700">
            Đăng nhập
          </button>
        </form>

        <div className="text-center text-sm text-gray-500 mt-4">
          Chưa có tài khoản? <Link href="/register" className="text-blue-600 hover:underline">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
