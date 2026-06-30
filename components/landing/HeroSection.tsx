import React from 'react';
import Link from 'next/link';

interface HeroSectionProps {
  isLoggedIn: boolean;
}

export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  return (
    <div className="relative bg-[#404eed] w-full min-h-screen overflow-hidden flex items-center justify-center pt-20">
      
      {/* Background Graphic Left (Stars/Clouds mock) */}
      <div className="absolute top-1/4 left-10 opacity-60">
        <svg width="250" height="250" viewBox="0 0 200 200" fill="none">
          <path d="M100 0L120 80L200 100L120 120L100 200L80 120L0 100L80 80Z" fill="white" opacity="0.1" />
        </svg>
      </div>
      
      {/* Background Graphic Right (Stars/Clouds mock) */}
      <div className="absolute top-10 right-20 opacity-60">
        <svg width="150" height="150" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="50" fill="white" opacity="0.05" />
          <path d="M100 20L110 80L180 100L110 120L100 180L90 120L20 100L90 80Z" fill="white" opacity="0.1" />
        </svg>
      </div>

      <div className="z-10 max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row items-center justify-between gap-12 mt-10 lg:mt-20">
        
        {/* Text Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left text-white">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[1.1] mb-8 font-sans">
            Trò chuyện<br />nhóm đây<br />thú vị và các<br />trò chơi
          </h1>
          <p className="text-lg md:text-xl font-medium max-w-2xl leading-relaxed mb-10 text-white/90">
            Nền tảng IntraSocial cực kỳ lý tưởng để trò chuyện với bạn bè hoặc thậm chí xây dựng một cộng đồng trên toàn thế giới. Hãy tùy chỉnh không gian của riêng bạn để trò chuyện, vui chơi và giao lưu.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center lg:justify-start">
            <Link 
              href="#"
              className="w-full sm:w-auto bg-white text-zinc-900 px-8 py-4 rounded-full font-medium text-lg hover:text-[#404eed] hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Tải về cho Windows
            </Link>
            
            <Link 
              href={isLoggedIn ? "/onboarding" : "/login"}
              className="w-full sm:w-auto bg-zinc-900 text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-zinc-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex items-center justify-center"
            >
              Mở trên trình duyệt
            </Link>
          </div>
        </div>

        {/* Illustration Mock */}
        <div className="w-full lg:w-1/2 relative hidden md:block">
          {/* Main "Monitor" outline */}
          <div className="w-[120%] h-[500px] relative -right-10 rounded-2xl bg-gradient-to-tr from-indigo-900 to-[#404eed] shadow-2xl border-[10px] border-[#2b2d31] overflow-hidden flex transform -rotate-2 hover:rotate-0 transition-transform duration-500">
             {/* Sidebar mock */}
             <div className="w-16 bg-[#1e1f22] h-full flex flex-col items-center py-4 gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5865F2] mb-2"></div>
                <div className="w-10 h-10 rounded-full bg-[#313338]"></div>
                <div className="w-10 h-10 rounded-full bg-[#313338]"></div>
                <div className="w-10 h-10 rounded-full bg-[#313338]"></div>
             </div>
             {/* Channel list mock */}
             <div className="w-48 bg-[#2b2d31] h-full p-4 flex flex-col gap-4">
                <div className="w-full h-6 rounded bg-[#3f4147]"></div>
                <div className="w-3/4 h-4 rounded bg-[#3f4147]"></div>
                <div className="w-5/6 h-4 rounded bg-[#3f4147]"></div>
             </div>
             {/* Document/Folder Explorer mock */}
             <div className="flex-1 bg-[#1e1f22] h-full p-5 flex flex-col text-zinc-300 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4 flex-shrink-0">
                   <div className="flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <span className="font-semibold text-white text-sm">Tài liệu & Tệp tin</span>
                   </div>
                   <div className="flex gap-2">
                      <div className="w-24 h-7 bg-[#2b2d31] rounded-lg border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-medium">Tìm kiếm...</div>
                      <div className="w-16 h-7 bg-[#5865F2] hover:bg-[#4752c4] rounded-lg text-[10px] text-white font-medium flex items-center justify-center cursor-pointer">Tải lên</div>
                   </div>
                </div>

                {/* Folders Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4 flex-shrink-0">
                   {/* Folder 1 */}
                   <div className="bg-[#2b2d31] hover:bg-[#35373c] p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1 group">
                      <div className="flex justify-between items-center">
                         <span className="text-xl text-yellow-500 drop-shadow">📂</span>
                         <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      </div>
                      <span className="text-xs font-semibold text-white truncate">Dự án Thiết kế</span>
                      <span className="text-[10px] text-zinc-500 font-medium">12 tệp • 48 MB</span>
                   </div>

                   {/* Folder 2 */}
                   <div className="bg-[#2b2d31] hover:bg-[#35373c] p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1 group">
                      <div className="flex justify-between items-center">
                         <span className="text-xl text-blue-500 drop-shadow">📂</span>
                         <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      </div>
                      <span className="text-xs font-semibold text-white truncate">Báo cáo tài chính</span>
                      <span className="text-[10px] text-zinc-500 font-medium">8 tệp • 14 MB</span>
                   </div>

                   {/* Folder 3 */}
                   <div className="bg-[#2b2d31] hover:bg-[#35373c] p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1 group">
                      <div className="flex justify-between items-center">
                         <span className="text-xl text-purple-500 drop-shadow">📂</span>
                         <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                      </div>
                      <span className="text-xs font-semibold text-white truncate">Hình ảnh Truyền thông</span>
                      <span className="text-[10px] text-zinc-500 font-medium">35 tệp • 120 MB</span>
                   </div>

                   {/* Folder 4 */}
                   <div className="bg-[#2b2d31] hover:bg-[#35373c] p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1 group">
                      <div className="flex justify-between items-center">
                         <span className="text-xl text-red-500 drop-shadow">📂</span>
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      </div>
                      <span className="text-xs font-semibold text-white truncate">Tài liệu Onboarding</span>
                      <span className="text-[10px] text-zinc-500 font-medium">18 tệp • 22 MB</span>
                   </div>

                   {/* Folder 5 */}
                   <div className="bg-[#2b2d31] hover:bg-[#35373c] p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1 group">
                      <div className="flex justify-between items-center">
                         <span className="text-xl text-teal-500 drop-shadow">📂</span>
                         <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                      </div>
                      <span className="text-xs font-semibold text-white truncate">Quy trình SOP</span>
                      <span className="text-[10px] text-zinc-500 font-medium">9 tệp • 5 MB</span>
                   </div>

                   {/* Folder 6 */}
                   <div className="bg-[#2b2d31] hover:bg-[#35373c] p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex flex-col gap-1 group">
                      <div className="flex justify-between items-center">
                         <span className="text-xl text-pink-500 drop-shadow">📂</span>
                         <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                      </div>
                      <span className="text-xs font-semibold text-white truncate">Kế hoạch Quý 3</span>
                      <span className="text-[10px] text-zinc-500 font-medium">14 tệp • 32 MB</span>
                   </div>
                </div>

                {/* Recent Files Section */}
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex-shrink-0">Tệp tin gần đây</h4>
                <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
                   <div className="flex items-center justify-between p-2 rounded-lg bg-[#2b2d31]/50 border border-zinc-800/40 hover:bg-[#2b2d31] transition-all cursor-pointer">
                      <div className="flex items-center gap-2.5">
                         <span className="text-base">📄</span>
                         <div className="flex flex-col">
                            <span className="text-xs font-medium text-white truncate max-w-[130px]">ke-hoach-kinh-doanh.pdf</span>
                            <span className="text-[9px] text-zinc-500">2.4 MB • Cập nhật 2 giờ trước</span>
                         </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">Tải về</span>
                   </div>

                   <div className="flex items-center justify-between p-2 rounded-lg bg-[#2b2d31]/50 border border-zinc-800/40 hover:bg-[#2b2d31] transition-all cursor-pointer">
                      <div className="flex items-center gap-2.5">
                         <span className="text-base">📊</span>
                         <div className="flex flex-col">
                            <span className="text-xs font-medium text-white truncate max-w-[130px]">danh-sach-nhan-vien.xlsx</span>
                            <span className="text-[9px] text-zinc-500">1.8 MB • Cập nhật 5 giờ trước</span>
                         </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">Tải về</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Floating Character 1 */}
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-400 rounded-full border-8 border-[#404eed] flex items-center justify-center animate-bounce z-20 shadow-xl" style={{ animationDuration: '3s' }}>
            <span className="text-5xl">📄</span>
          </div>

          {/* Floating Character 2 */}
          <div className="absolute top-10 -right-5 w-32 h-32 bg-yellow-400 rounded-full border-8 border-[#404eed] flex items-center justify-center animate-bounce z-20 shadow-xl" style={{ animationDuration: '4s', animationDelay: '1s' }}>
            <span className="text-4xl">📂</span>
          </div>
        </div>

      </div>

      {/* Ground / Footer illustration area */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
  );
}
