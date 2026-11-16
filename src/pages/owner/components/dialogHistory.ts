import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router'

export type DialogParams = Record<string, string | undefined>

/** Marker kept in the dialog's history entry (same URL, so links and reloads are unaffected). */
interface DialogMarker {
  dialog: string
}

function currentMarker(): string | null {
  const usr = (window.history.state as { usr?: Partial<DialogMarker> } | null)?.usr
  return typeof usr?.dialog === 'string' ? usr.dialog : null
}

/** Current URL, read from the browser (React Router's location may still be catching up). */
function here() {
  return { pathname: window.location.pathname, search: window.location.search, hash: window.location.hash }
}

export interface HistoryDialog<P extends DialogParams = DialogParams> {
  isOpen: boolean
  params: P | undefined
  /** Opens the dialog and gives it a history entry, so Back closes it instead of leaving the page. */
  open: (params?: P) => void
  /** Closes the dialog and removes its history entry; `then` replaces it with another page (e.g. the new request). */
  close: (then?: string) => void
  /** Set by the open dialog (useDialogBack): return true when Back was used to go one step back. */
  backHandler: RefObject<(() => boolean) | null>
}

/**
 * A dialog that answers the browser or phone Back button: Back steps back through a multi-step dialog
 * (see useDialogBack) and finally closes it, instead of leaving the page and losing what was typed.
 *
 * The dialog renders from local state, so it opens and moves between steps instantly; its one history
 * entry is kept in step behind the scenes. Closing it any other way removes that entry again.
 */
export function useHistoryDialog<P extends DialogParams = DialogParams>(name: string): HistoryDialog<P> {
  const navigate = useNavigate()
  const [state, setState] = useState<{ params?: P } | null>(null)
  // True while the dialog's entry is in the history and current.
  const pushed = useRef(false)
  const backHandler = useRef<(() => boolean) | null>(null)

  const pushEntry = useCallback(() => {
    pushed.current = true
    void navigate(here(), { state: { dialog: name } satisfies DialogMarker })
  }, [navigate, name])

  // Browser / phone Back while the dialog is open.
  const isOpen = !!state
  useEffect(() => {
    if (!isOpen) return
    const onPop = () => {
      if (!pushed.current || currentMarker() === name) return
      pushed.current = false
      if (backHandler.current?.()) pushEntry() // went back a step: stay open, ready for the next Back
      else setState(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [isOpen, name, pushEntry])

  return {
    isOpen,
    params: state?.params,
    backHandler,
    open: (params) => {
      setState({ params })
      if (!pushed.current) pushEntry()
    },
    close: (then) => {
      setState(null)
      const hadEntry = pushed.current && currentMarker() === name
      pushed.current = false
      if (then) void navigate(then, { replace: hadEntry })
      else if (hadEntry) void navigate(-1)
    },
  }
}

/**
 * For multi-step dialogs: lets the browser / phone Back button go one step back. `goBack` returns
 * true when it went back a step, false on the first step (then Back closes the dialog).
 */
export function useDialogBack(dialog: HistoryDialog, goBack: () => boolean) {
  const latest = useRef(goBack)
  useEffect(() => {
    latest.current = goBack
  })
  const { backHandler } = dialog
  useEffect(() => {
    backHandler.current = () => latest.current()
    return () => {
      backHandler.current = null
    }
  }, [backHandler])
}
