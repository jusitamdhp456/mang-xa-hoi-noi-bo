import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FriendsClientPage from './FriendsClientPage';

export const metadata = {
  title: "Bạn bè | Mạng Xã Hội",
  description: "Trang danh sách bạn bè và tin nhắn trực tiếp nội bộ."
};

export default async function FriendsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch current user profile and other profiles in parallel
  const [profileResult, otherProfilesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .limit(20)
  ]);

  const profile = profileResult.data;
  const otherProfiles = otherProfilesResult.data;

  return (
    <FriendsClientPage 
      user={user} 
      profile={profile} 
      otherProfiles={otherProfiles || []} 
    />
  );
}
