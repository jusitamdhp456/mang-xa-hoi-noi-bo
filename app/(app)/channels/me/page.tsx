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

  // Fetch current user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch other profiles for DM list
  const { data: otherProfiles } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .limit(20);

  return (
    <FriendsClientPage 
      user={user} 
      profile={profile} 
      otherProfiles={otherProfiles || []} 
    />
  );
}
