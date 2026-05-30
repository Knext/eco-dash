'use client'

import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { IndicatorSnapshot } from '@/lib/indicators/types'
import { cn } from '@/lib/utils'
import { IndicatorCard } from './IndicatorCard'

interface Props {
  snapshot: IndicatorSnapshot
  related?: Record<string, IndicatorSnapshot>
  isEditing: boolean
}

export function SortableIndicatorCard({ snapshot, related, isEditing }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: snapshot.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <IndicatorCard snapshot={snapshot} related={related} />
      {isEditing && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={cn(
            'absolute inset-0 z-10 flex cursor-grab active:cursor-grabbing items-center justify-center',
            'rounded-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-[1px]',
            'border-2 border-dashed border-blue-400',
            'transition-opacity hover:bg-white/60 dark:hover:bg-gray-900/60',
          )}
          aria-label={`${snapshot.nameKr} 카드 드래그`}
        >
          <GripVertical size={28} className="text-blue-500" />
        </button>
      )}
    </div>
  )
}
