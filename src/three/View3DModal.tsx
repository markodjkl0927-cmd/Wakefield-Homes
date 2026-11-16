import { useId, type ReactNode } from 'react'
import { Hand, Keyboard, Moon, X } from 'lucide-react'
import type { HouseConfig } from '@/types'
import { Modal } from '@/components/ui'
import { Viewer3D } from './Viewer3D'

/**
 * PUBLIC API: full-screen 3D viewer dialog. `details` renders beside the canvas (specs, price, CTAs).
 * Desktop: large canvas on the left, title + details on the right. Mobile: canvas first, details below.
 */
export interface View3DModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  config: HouseConfig
  customModelId?: string | null
  details?: ReactNode
}

export function View3DModal({ open, onClose, title, subtitle, config, customModelId, details }: View3DModalProps) {
  const titleId = useId()
  return (
    <Modal open={open} onClose={onClose} size="full" bare ariaLabelledBy={titleId} className="sm:max-h-[94vh]">
      <ViewerDialogBody titleId={titleId} onClose={onClose} title={title} subtitle={subtitle} config={config} customModelId={customModelId} details={details} />
    </Modal>
  )
}

function ViewerDialogBody({ titleId, onClose, title, subtitle, config, customModelId, details }: Omit<View3DModalProps, 'open'> & { titleId: string }) {
  return (
    <div
      className="grid [grid-template-areas:'head'_'view'_'info'] lg:h-[min(86vh,860px)] lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_minmax(0,1fr)] lg:[grid-template-areas:'view_head'_'view_info']"
    >
      {/* A plain div, not <header>: inside the portaled dialog a header would be a second page "banner" landmark. */}
      <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-ink-100 bg-white/95 px-5 py-3.5 backdrop-blur [grid-area:head] lg:static lg:border-b-0 lg:bg-white lg:px-6 lg:pt-6 lg:pb-4">
        <div className="min-w-0">
          <p className="eyebrow">3D tour</p>
          <h2 id={titleId} tabIndex={-1} data-autofocus className="mt-1 text-lg font-semibold text-ink-900 outline-none sm:text-xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
        </div>
        <button
          type="button"
          data-modal-close
          onClick={onClose}
          aria-label="Close 3D viewer"
          className="-mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative h-[56vh] min-h-[300px] bg-brand-100 [grid-area:view] lg:h-full lg:min-h-0">
        <Viewer3D eager config={config} customModelId={customModelId} className="absolute inset-0 rounded-none" ariaLabel={`3D model of ${title}.`} />
      </div>

      <div className="min-h-0 overflow-y-auto px-5 pt-5 pb-6 [grid-area:info] lg:border-t lg:border-ink-100 lg:px-6">
        {details && <div className="mb-6">{details}</div>}
        <ul className="space-y-3 text-sm text-ink-600">
          <li className="flex gap-3">
            <Hand className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
            <span>Drag to rotate, scroll or pinch to zoom, and use the reset button to return to the starting view.</span>
          </li>
          <li className="flex gap-3">
            <Moon className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
            <span>Switch to Dusk or Night to see the home with its lights on.</span>
          </li>
          <li className="hidden gap-3 sm:flex">
            <Keyboard className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
            <span>Keyboard: focus the model, then use the arrow keys to rotate and + or − to zoom.</span>
          </li>
        </ul>
        <p className="mt-5 border-t border-ink-100 pt-4 text-xs leading-5 text-ink-500">3D models are illustrative. Colors, options and details vary by home and lot.</p>
      </div>
    </div>
  )
}

export default View3DModal
