import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPresignedDownloadUrl } from '@/lib/r2/client'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const objectKey = key.join('/')
    
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ở môi trường thực tế, cần query database xem user có quyền truy cập file này (workspace_members) không
    // Ở đây ta đơn giản hoá bằng việc redirect về presigned URL
    const downloadUrl = await getPresignedDownloadUrl(objectKey)

    return NextResponse.redirect(downloadUrl)
  } catch (error) {
    console.error('Media URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
