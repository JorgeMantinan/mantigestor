'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'
import { GripVertical } from 'lucide-react'

interface DragDropListProps<T> {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number, dragHandle: ReactNode) => ReactNode
  keyExtractor: (item: T) => string
}

export function DragDropList<T>({ items, onReorder, renderItem, keyExtractor }: DragDropListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    const item = items[index]
    if (!item) return
    dragItemRef.current = index
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', keyExtractor(item))
  }, [items, keyExtractor])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragItemRef.current !== null && dragItemRef.current !== index) {
      setOverIndex(index)
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    setOverIndex(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const fromIndex = dragItemRef.current
    if (fromIndex === null || fromIndex === dropIndex || !items[fromIndex]) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    const reordered = [...items]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved!)
    onReorder(reordered)
    setDragIndex(null)
    setOverIndex(null)
  }, [items, onReorder])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
    dragItemRef.current = null
  }, [])

  const dragHandle = (
    <button
      className="cursor-grab active:cursor-grabbing rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Arrastrar para reordenar"
      tabIndex={-1}
    >
      <GripVertical className="h-4 w-4" aria-hidden="true" />
    </button>
  )

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const key = keyExtractor(item)
        const isDragging = dragIndex === index
        const isOver = overIndex === index

        return (
          <div
            key={key}
            draggable
            onDragStart={e => handleDragStart(e, index)}
            onDragOver={e => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              transition-all duration-200 ease-in-out
              ${isDragging ? 'opacity-40 scale-[0.98]' : ''}
              ${isOver ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
            `}
          >
            {renderItem(item, index, dragHandle)}
          </div>
        )
      })}
    </div>
  )
}
