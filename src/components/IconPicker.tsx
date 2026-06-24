// Font Awesome icon picker — a large, information-dense modal for choosing a glyph
// for the icon/logo cards. Renders the full FA Free 6.4.2 catalog (lazy-loaded from
// the committed src/data/faCatalog.ts) in a virtualized grid so thousands of tiles
// scroll smoothly without flooding the DOM. Returns the class string the card stores
// in `iconClass` (e.g. "fa-solid fa-house"). FA's CSS is loaded app-wide via
// index.html, so the <i> tiles render real glyphs here.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FaIcon, FaStyle } from '../data/faCatalog'

interface IconPickerProps {
  open: boolean
  value: string // current iconClass, for highlight
  onPick: (iconClass: string) => void
  onClose: () => void
}

// One renderable tile = an icon in one of its available styles.
interface Tile {
  cls: string // "fa-solid fa-house"
  name: string
  styleLabel: string
}

const STYLE_LABEL: Record<FaStyle, string> = { s: 'Solid', r: 'Regular', b: 'Brands' }
const STYLE_PREFIX: Record<FaStyle, string> = { s: 'fa-solid', r: 'fa-regular', b: 'fa-brands' }
const ALL_STYLES: FaStyle[] = ['s', 'r', 'b']

const TILE_MIN = 84 // px: target tile width → column count
const ROW_H = 88 // px: fixed row height for virtualization
const OVERSCAN = 3 // rows rendered above/below the viewport

export default function IconPicker({ open, value, onPick, onClose }: IconPickerProps) {
  const [catalog, setCatalog] = useState<FaIcon[] | null>(null)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [styles, setStyles] = useState<Record<FaStyle, boolean>>({ s: true, r: true, b: true })

  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // Lazy-load the catalog on first open (keeps it a separate chunk).
  useEffect(() => {
    if (!open || catalog) return
    let alive = true
    import('../data/faCatalog').then(m => {
      if (alive) setCatalog(m.FA_CATALOG)
    })
    return () => {
      alive = false
    }
  }, [open, catalog])

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 150)
    return () => clearTimeout(t)
  }, [query])

  // Esc to close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Track the scroll container's size for column count + viewport windowing.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!open || !el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [open])

  // Reset scroll to top when the filter changes (called from the input/toggle
  // handlers rather than an effect, so we don't setState during render sync).
  const resetScroll = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setScrollTop(0)
  }

  // Build the flat tile list: filter by search, then expand to one tile per active
  // style the icon ships. useMemo so it only recomputes on input changes.
  const tiles = useMemo<Tile[]>(() => {
    if (!catalog) return []
    const active = ALL_STYLES.filter(s => styles[s])
    const q = debounced
    const out: Tile[] = []
    for (const ic of catalog) {
      if (q && !ic.n.includes(q) && !ic.t.some(t => t.includes(q))) continue
      for (const s of ic.s) {
        if (!active.includes(s)) continue
        out.push({ cls: `${STYLE_PREFIX[s]} fa-${ic.n}`, name: ic.n, styleLabel: STYLE_LABEL[s] })
      }
    }
    return out
  }, [catalog, debounced, styles])

  if (!open) return null

  const cols = Math.max(1, Math.floor((size.w || TILE_MIN) / TILE_MIN))
  const totalRows = Math.ceil(tiles.length / cols)
  const totalHeight = totalRows * ROW_H
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + (size.h || 0)) / ROW_H) + OVERSCAN)
  const visible = tiles.slice(startRow * cols, endRow * cols)

  const toggleStyle = (s: FaStyle) => {
    setStyles(p => ({ ...p, [s]: !p[s] }))
    resetScroll()
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky toolbar */}
        <div className="flex items-center gap-3 p-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-800 whitespace-nowrap">Choose an icon</h2>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              resetScroll()
            }}
            placeholder="Search icons (e.g. house, arrow, youtube)…"
            className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-1">
            {ALL_STYLES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStyle(s)}
                className={`px-2.5 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors ${
                  styles[s]
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                {STYLE_LABEL[s]}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">
            {catalog ? `${tiles.length.toLocaleString()} icons` : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-gray-400 hover:text-gray-700 text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Virtualized grid */}
        <div
          ref={scrollRef}
          onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto p-2"
        >
          {!catalog ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading icons…</div>
          ) : tiles.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              No icons match “{debounced}”.
            </div>
          ) : (
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: startRow * ROW_H,
                  left: 0,
                  right: 0,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                }}
              >
                {visible.map(t => {
                  const selected = t.cls === value
                  return (
                    <button
                      key={t.cls}
                      type="button"
                      onClick={() => {
                        onPick(t.cls)
                        onClose()
                      }}
                      title={`${t.name} · ${t.styleLabel}`}
                      aria-label={`${t.name} ${t.styleLabel}`}
                      style={{ height: ROW_H }}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-1 transition-colors ${
                        selected
                          ? 'border-blue-500 ring-2 ring-blue-400 bg-blue-50'
                          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <i className={`${t.cls} text-2xl text-gray-700`} aria-hidden="true" />
                      <span className="w-full truncate text-center text-[10px] leading-tight text-gray-500">
                        {t.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
