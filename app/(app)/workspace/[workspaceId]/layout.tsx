import React from 'react'
import ChannelSidebar from '@/components/workspace/ChannelSidebar'

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params;
  
  return (
    <div className="flex w-full h-full">
      <ChannelSidebar workspaceId={workspaceId} />
      {children}
    </div>
  )
}
