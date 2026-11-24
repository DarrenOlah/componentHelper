import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Shared "paste generated HTML back into the editor" control: a toolbar button that
// opens a modal, plus a brief "Imported …" confirmation next to the button.
//
// Flow: paste (or type + Import) → parse →
//   • error      → message shown, the paste stays in the box for a retry
//   • clean      → applied immediately, modal closes, button flashes the summary
//   • otherwise  → a review step (what was found, what fell back to defaults, and
//                  what will be replaced) before anything is applied
// So nothing in the editor changes until the user has seen every caveat, and a
// clean import into an untouched editor stays a single paste.
//
// The tool owns parsing and state; this component owns only the modal UI.
// Shared with heroHelper (src/components/ImportButton.tsx) — keep the two copies in sync.

export type ImportParseResult<T> =
  | {
      ok: true
      value: T
      // One-line description of what was recognized, e.g. "Found 4 icon cards."
      summary: string
      // Anything that fell back to a default or was skipped. Non-empty → review step.
      notes: string[]
    }
  | { ok: false; error: string }

interface ImportButtonProps<T> {
  // Modal heading.
  title: string
  // Help text above the paste box.
  intro: ReactNode
  parse: (text: string) => ImportParseResult<T>
  // Set when importing would replace work in the editor (e.g. "This replaces the 3
  // cards currently in the editor."). Forces the review step so it can't happen silently.
  replaceWarning?: string | null
  onApply: (value: T) => void
}

const FLASH_MS = 3000

export function ImportButton<T>({ title, intro, parse, replaceWarning, onApply }: ImportButtonProps<T>) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  // A parsed-but-not-yet-applied result, shown on the review step.
  const [pending, setPending] = useState<Extract<ImportParseResult<T>, { ok: true }> | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<number | undefined>(undefined)

  const close = () => {
    setOpen(false)
    setPending(null)
    setError(null)
  }

  const apply = (result: Extract<ImportParseResult<T>, { ok: true }>) => {
    onApply(result.value)
    setOpen(false)
    setPending(null)
    setError(null)
    setText('')
    setFlash(result.summary)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), FLASH_MS)
  }

  const attempt = (raw: string) => {
    const result = parse(raw)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    if (result.notes.length === 0 && !replaceWarning) apply(result)
    else setPending(result)
  }

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  // Escape: step back from review to the paste box, else close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (pending) setPending(null)
      else close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pending])

  const btnPrimary =
    'px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed'
  const btnSecondary =
    'px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50'

  return (
    <>
      {flash && (
        <span role="status" className="text-xs font-medium text-green-700">
          ✓ {flash}
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setError(null)
          setPending(null)
          setOpen(true)
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
      >
        ⤵ Import
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-auto"
            onClick={close}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-12"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-800">{title}</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="text-sm px-2 py-0.5 rounded text-gray-500 hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              {pending ? (
                // Review step: everything the user should know before the editor changes.
                <div className="px-4 py-3 space-y-3">
                  <p className="text-sm text-gray-800">{pending.summary}</p>
                  {pending.notes.length > 0 && (
                    <ul className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 space-y-1 text-xs text-amber-800 list-disc list-inside">
                      {pending.notes.map(n => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {replaceWarning && <p className="text-xs text-gray-600">{replaceWarning}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setPending(null)} className={btnSecondary}>
                      Back
                    </button>
                    <button type="button" autoFocus onClick={() => apply(pending)} className={btnPrimary}>
                      {replaceWarning ? 'Replace' : 'Import'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 space-y-2">
                  <div className="text-xs text-gray-500">{intro}</div>
                  <textarea
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onPaste={e => {
                      const pasted = e.clipboardData.getData('text')
                      if (!pasted.trim()) return
                      e.preventDefault()
                      setText(pasted) // box reflects the paste (useful if it fails to parse)
                      attempt(pasted)
                    }}
                    placeholder="Paste the generated HTML here…"
                    rows={8}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setText('')
                        setError(null)
                      }}
                      className={btnSecondary}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => attempt(text)}
                      disabled={!text.trim()}
                      className={btnPrimary}
                    >
                      Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
