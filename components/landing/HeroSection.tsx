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
            Nền tảng Mạng Xã Hội cực kỳ lý tưởng để trò chuyện với bạn bè hoặc thậm chí xây dựng một cộng đồng trên toàn thế giới. Hãy tùy chỉnh không gian của riêng bạn để trò chuyện, vui chơi và giao lưu.
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
             {/* Chat area mock */}
             <div className="flex-1 bg-[#313338] h-full p-6 flex flex-col">
                <div className="flex-1 flex flex-col justify-end gap-6">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-pink-500 flex-shrink-0"></div>
                    <div className="flex flex-col gap-2 w-full">
                       <div className="w-32 h-4 rounded bg-[#404eed]"></div>
                       <div className="w-2/3 h-16 rounded bg-[#2b2d31]"></div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-yellow-500 flex-shrink-0"></div>
                    <div className="flex flex-col gap-2 w-full">
                       <div className="w-24 h-4 rounded bg-[#404eed]"></div>
                       <div className="w-1/2 h-10 rounded bg-[#2b2d31]"></div>
                    </div>
                  </div>
                </div>
                {/* Input box */}
                <div className="w-full h-12 bg-[#383a40] rounded-xl mt-6"></div>
             </div>
          </div>

          {/* Floating Character 1 */}
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-400 rounded-full border-8 border-[#404eed] flex items-center justify-center animate-bounce z-20 shadow-xl" style={{ animationDuration: '3s' }}>
            <span className="text-5xl">👾</span>
          </div>

          {/* Floating Character 2 */}
          <div className="absolute top-10 -right-5 w-32 h-32 bg-yellow-400 rounded-full border-8 border-[#404eed] flex items-center justify-center animate-bounce z-20 shadow-xl" style={{ animationDuration: '4s', animationDelay: '1s' }}>
            <span className="text-4xl">🎮</span>
          </div>
        </div>

      </div>

      {/* Ground / Footer illustration area */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/20 to-transparent"></div>
    </div>
  );
}
