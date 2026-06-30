import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "IntraSocial | Nơi trò chuyện và kết nối",
  description: "Nền tảng IntraSocial cực kỳ lý tưởng để trò chuyện với bạn bè hoặc thậm chí xây dựng một cộng đồng trên toàn thế giới.",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // Fetch workspaces that this user has joined
  const { data: userWorkspaces } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if (userWorkspaces && userWorkspaces.length > 0) {
    redirect(`/workspace/${userWorkspaces[0].workspace_id}`);
  } else {
    redirect("/onboarding");
  }
}
