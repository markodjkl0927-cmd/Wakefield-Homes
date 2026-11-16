import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'
import { toast } from '@/store/ui'
import { Button } from '@/components/ui'

/** Copies text to the clipboard, falling back to a hidden textarea where the async API is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy approach
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/**
 * "Copy" button that confirms with a check mark and a toast.
 * `what` completes the accessible name, e.g. what="license number 2705 032552A" -> "Copy license number 2705 032552A".
 */
export function CopyButton({ value, what, toastTitle = 'Copied to clipboard', className }: { value: string; what: string; toastTitle?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onCopy = async () => {
    const ok = await copyText(value)
    if (!ok) {
      toast.error('Couldn’t copy', 'Select the number and copy it manually.')
      return
    }
    toast.success(toastTitle, value)
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="secondary"
      size="md"
      onClick={onCopy}
      aria-label={`${copied ? 'Copied' : 'Copy'} ${what}`}
      className={cn('min-w-[6.5rem]', copied && 'text-emerald-700 ring-emerald-200', className)}
      leftIcon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    >
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
