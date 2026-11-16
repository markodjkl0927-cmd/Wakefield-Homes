import { useState, type ImgHTMLAttributes } from 'react'
import { Home } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | undefined
  alt: string
  /** Wrapper classes — set the size / aspect ratio here (e.g. "aspect-[4/3] w-full"). */
  className?: string
  imgClassName?: string
  priority?: boolean
}

/**
 * Image with a shimmer placeholder, fade-in on load and a branded fallback if the photo fails.
 * Photos are served from the client's current site, which can be slow, so this keeps layouts calm.
 */
export function SmartImage({ src, alt, className, imgClassName, priority, ...rest }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(!src)
  return (
    <div className={cn('relative overflow-hidden bg-ink-100', className)}>
      {!loaded && !failed && <div className="skeleton absolute inset-0" aria-hidden />}
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-100 via-brand-50 to-lavender-100 text-brand-300" role="img" aria-label={alt}>
          <Home className="size-10" aria-hidden />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn('h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', imgClassName)}
          {...rest}
        />
      )}
    </div>
  )
}
