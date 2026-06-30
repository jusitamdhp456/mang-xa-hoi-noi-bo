import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getPresignedUploadUrl } from '@/lib/r2/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, fileType, workspaceId, channelId, threadId } = body

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'Missing required file fields' }, { status: 400 })
    }
    
    let objectKey = ''
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    if (threadId) {
      objectKey = `direct/${threadId}/${Date.now()}-${safeFileName}`
    } else if (workspaceId && channelId) {
      objectKey = `workspaces/${workspaceId}/${channelId}/${Date.now()}-${safeFileName}`
    } else {
      return NextResponse.json({ error: 'Missing routing workspace/channel or thread context' }, { status: 400 })
    }

    const uploadUrl = await getPresignedUploadUrl(objectKey, fileType)

    return NextResponse.json({ uploadUrl, objectKey })
  } catch (error) {
    console.error('Presigned URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
