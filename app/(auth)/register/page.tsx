import { signup } from '@/app/actions/auth'
import Link from 'next/link'

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-center text-2xl font-bold text-gray-900">Đăng ký tài khoản</h2>
        <p className="text-center text-sm text-gray-600">
          Tạo tài khoản để tham gia mạng xã hội nội bộ
        </p>

        {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded">{error}</div>}

        <form action={signup} className="flex flex-col gap-4">
          <input 
            type="text" 
            name="displayName"
            placeholder="Họ và tên hiển thị" 
            required
            className="rounded border p-2"
          />
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
            placeholder="Mật khẩu (ít nhất 6 ký tự)" 
            required
            minLength={6}
            className="rounded border p-2"
          />
          <button type="submit" className="rounded bg-green-600 p-2 text-white hover:bg-green-700">
            Tạo tài khoản
          </button>
        </form>

        <div className="text-center text-sm text-gray-500 mt-4">
          Đã có tài khoản? <Link href="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
