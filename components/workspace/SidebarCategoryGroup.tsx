'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { SidebarChannelLink } from './SidebarChannelLink'
import { CreateChannelModal } from './CreateChannelModal'

interface ChannelItem {
  id: string
  name: string
  type: string
  is_private: boolean
  category_id?: string | null
}

interface CategoryItem {
  id: string
  name: string
}

interface SidebarCategoryGroupProps {
  title: string
  type: 'text' | 'voice'
  channels: ChannelItem[]
  workspaceId: string
  categories: CategoryItem[]
}

export function SidebarCategoryGroup({
  title,
  type,
  channels,
  workspaceId,
  categories
}: SidebarCategoryGroupProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (channels.length === 0) return null

  return (
    <div className="mt-5 select-none">
      {/* Category Header Row */}
      <div 
        className="flex items-center justify-between px-3 py-1 group/cat cursor-pointer text-white/50 hover:text-white/80 transition-colors"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 flex-1 text-left text-xs font-bold uppercase tracking-wider"
        >
          {isOpen ? (
            <ChevronDown size={12} className="shrink-0 transition-transform text-white/40" />
          ) : (
            <ChevronRight size={12} className="shrink-0 transition-transform text-white/40" />
          )}
          <span className="truncate">{title}</span>
        </button>

        {/* Plus Button to Quick Create Channel of this type */}
        <CreateChannelModal
          workspaceId={workspaceId}
          categories={categories}
          triggerType="icon"
          defaultType={type}
        />
      </div>

      {/* Channel Links List */}
      {isOpen && (
        <div className="mt-1 space-y-0.5 pl-1 animate-scale-in">
          {channels.map(channel => (
            <SidebarChannelLink 
              key={channel.id} 
              workspaceId={workspaceId} 
              channel={channel} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
