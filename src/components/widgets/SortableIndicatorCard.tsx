'use client'

import { GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { IndicatorCard } from './IndicatorCard'
import type { ComponentProps } from 'react'

type IndicatorCardProps = ComponentProps<typeof IndicatorCard>

interface Props extends IndicatorCardProps {
  isEditing: boolean
}

export function SortableIndicatorCard({ isEditing, ...cardProps }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardProps.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <IndicatorCard {...cardProps} />
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
          aria-label={`${cardProps.nameKr} 카드 드래그`}
        >
          <GripVertical size={28} className="text-blue-500" />
        </button>
      )}
    </div>
  )
}
