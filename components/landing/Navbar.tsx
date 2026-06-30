import Link from 'next/link';

interface NavbarProps {
  isLoggedIn: boolean;
}

export function Navbar({ isLoggedIn }: NavbarProps) {
  return (
    <nav className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto right-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 text-white font-extrabold text-xl tracking-tight">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo" className="w-9 h-9 rounded-full object-cover" />
        IntraSocial
      </Link>

      {/* Nav Links (Hidden on small screens) */}
      <div className="hidden lg:flex items-center gap-8 text-white font-medium text-sm">
        <Link href="#" className="hover:underline">Tải về</Link>
        <Link href="#" className="hover:underline">Nitro</Link>
        <Link href="#" className="hover:underline">Khám phá</Link>
        <Link href="#" className="hover:underline">An toàn</Link>
        <Link href="#" className="hover:underline">Nhiệm vụ</Link>
        <Link href="#" className="hover:underline">Hỗ trợ</Link>
        <Link href="#" className="hover:underline">Blog</Link>
        <Link href="#" className="hover:underline">Nhà phát triển</Link>
      </div>

      {/* CTA Button */}
      <div>
        <Link
          href={isLoggedIn ? "/onboarding" : "/login"}
          className="bg-white text-zinc-900 px-4 py-2 rounded-full font-medium text-sm hover:text-[#404eed] hover:shadow-lg transition-all duration-200"
        >
          {isLoggedIn ? "Mở Ứng Dụng" : "Đăng nhập"}
        </Link>
      </div>
    </nav>
  );
}
