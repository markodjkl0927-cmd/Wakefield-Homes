import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * tailwind-merge would read the custom `text-user` utility (src/index.css) as a text color and drop it
 * when another text color follows, so it gets a class group of its own.
 */
const twMerge = extendTailwindMerge<'user-text'>({
  extend: {
    classGroups: {
      'user-text': ['text-user', 'user-text'],
    },
  },
})

/** Merge class names, letting later Tailwind utilities override earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
