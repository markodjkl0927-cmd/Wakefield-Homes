import { useState, type ReactNode } from 'react'
import { Box } from 'lucide-react'
import type { HouseConfig } from '@/types'
import { Button, type ButtonVariant } from '@/components/ui'
import { View3DModal } from './View3DModal'
import { preloadViewer3D } from './Viewer3D'

/** Button that opens the full-screen 3D viewer for a home or floor plan. */
export function View3DButton({
  title,
  subtitle,
  config,
  customModelId,
  details,
  label = 'View in 3D',
  variant = 'soft',
  size = 'md',
  className,
}: {
  title: string
  subtitle?: string
  config: HouseConfig
  customModelId?: string | null
  details?: ReactNode
  label?: string
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant={variant}
        size={size}
        leftIcon={<Box className="size-4" aria-hidden />}
        onClick={() => setOpen(true)}
        onPointerEnter={preloadViewer3D}
        onFocus={preloadViewer3D}
        aria-haspopup="dialog"
        className={className}
      >
        {label}
      </Button>
      <View3DModal open={open} onClose={() => setOpen(false)} title={title} subtitle={subtitle} config={config} customModelId={customModelId} details={details} />
    </>
  )
}
