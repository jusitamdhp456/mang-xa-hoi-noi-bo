'use server';

import { getPresignedUploadUrl } from '@/lib/r2/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function generateUploadUrl(fileName: string, contentType: string, folder: 'avatars' | 'workspaces' | 'messages' = 'messages') {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Tạo một chuỗi ngẫu nhiên để tránh trùng tên file
  const uniqueId = crypto.randomUUID();
  const extension = fileName.split('.').pop() || '';
  const key = `${folder}/${user.id}/${uniqueId}.${extension}`;

  try {
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    
    // Tạm thời trả về public URL dạng r2.dev (sau này bạn có thể đổi thành custom domain)
    // Cấu trúc URL: https://pub-[id].r2.dev/key
    const publicUrlPrefix = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
    const publicUrl = publicUrlPrefix ? `${publicUrlPrefix}/${key}` : `/${key}`;

    return { uploadUrl, key, publicUrl };
  } catch (error: any) {
    console.error('Error generating upload URL:', error);
    return { error: 'Failed to generate upload URL' };
  }
}
