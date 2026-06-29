import React from 'react';
import ChannelSidebar from '@/components/workspace/ChannelSidebar';
import WorkspaceResponsiveWrapper from './WorkspaceResponsiveWrapper';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  
  return (
    <WorkspaceResponsiveWrapper workspaceId={workspaceId} sidebar={<ChannelSidebar workspaceId={workspaceId} />}>
      {children}
    </WorkspaceResponsiveWrapper>
  );
}
