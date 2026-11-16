import { del, get, set } from 'idb-keyval'

/**
 * Custom 3D models (.glb) uploaded by staff are kept in the browser's IndexedDB,
 * keyed by home id, so the presentation can show "upload your architect's model".
 * Mounted viewers listen for changes and reload the model automatically.
 */
const key = (homeId: string) => `glb:${homeId}`
const EVENT = 'wh:glb-change'

function notify(homeId: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: homeId }))
}

export async function saveGlb(homeId: string, file: Blob): Promise<void> {
  await set(key(homeId), file)
  notify(homeId)
}

export async function getGlbBlob(homeId: string): Promise<Blob | null> {
  try {
    return ((await get(key(homeId))) as Blob | undefined) ?? null
  } catch {
    // Private browsing / blocked storage: behave as "no custom model".
    return null
  }
}

/** Returns an object URL for the stored model (caller should revoke it when done), or null. */
export async function getGlbUrl(homeId: string): Promise<string | null> {
  const blob = await getGlbBlob(homeId)
  return blob ? URL.createObjectURL(blob) : null
}

export async function removeGlb(homeId: string): Promise<void> {
  await del(key(homeId))
  notify(homeId)
}

/** Call `cb` whenever the stored model for `homeId` is saved or removed. Returns an unsubscribe function. */
export function subscribeGlb(homeId: string, cb: () => void): () => void {
  const handler = (e: Event) => {
    if ((e as CustomEvent<string>).detail === homeId) cb()
  }
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
