import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";

export const metadata = {
  title: "Mạng Xã Hội | Nơi trò chuyện và kết nối",
  description: "Nền tảng Mạng Xã Hội cực kỳ lý tưởng để trò chuyện với bạn bè hoặc thậm chí xây dựng một cộng đồng trên toàn thế giới.",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const isLoggedIn = !!user;

  return (
    <main className="min-h-screen bg-[#404eed] font-sans selection:bg-cyan-500 selection:text-white">
      <Navbar isLoggedIn={isLoggedIn} />
      <HeroSection isLoggedIn={isLoggedIn} />
      {/* 
        You can add more sections here below the fold if you want to extend the landing page.
        For example: Features section, Footer, etc.
      */}
    </main>
  );
}
