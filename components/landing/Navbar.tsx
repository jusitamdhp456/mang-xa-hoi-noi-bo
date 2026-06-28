import Link from 'next/link';

interface NavbarProps {
  isLoggedIn: boolean;
}

export function Navbar({ isLoggedIn }: NavbarProps) {
  return (
    <nav className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto right-0">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 text-white font-extrabold text-xl tracking-tight">
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 127.14 96.36"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Simple Discord-like icon shape using generic paths */}
          <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z" />
        </svg>
        Mạng Xã Hội
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
