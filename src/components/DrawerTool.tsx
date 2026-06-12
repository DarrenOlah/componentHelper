import { useState, useMemo, useEffect, type SyntheticEvent } from 'react'
import {
  generateDrawerHtml,
  generateDrawerPreviewHtml,
  DEFAULT_TAB_COLOR,
  DEFAULT_TAB_TEXT_COLOR,
  DEFAULT_BORDER_COLOR,
  DEFAULT_PANEL_COLOR,
  DEFAULT_LINK_COLOR,
  DEFAULT_TAB_WIDTH_REM,
  DEFAULT_PANEL_WIDTH_REM,
  DEFAULT_VPOS_PERCENT,
  type PanelWidthMode,
  type GenerateDrawerInput,
} from '../lib/drawer'
import { SectionLabel } from './SectionLabel'
import { ColorField, tabTextFor } from './ColorField'

const LABEL_STORAGE_KEY = 'componentHelper-drawer-label'

interface DrawerLink {
  id: number
  href: string
  text: string
}

interface DrawerState {
  label: string
  links: DrawerLink[]
  tabColor: string
  tabTextColor: string
  borderColor: string
  panelColor: string
  linkColor: string
  vposPercent: number
  tabWidthRem: number
  panelWidthMode: PanelWidthMode
  panelWidthRem: number
  panelMaxWidthRem: number | null
}

// Stable, render-safe ids for the links list (avoids index-as-key on reorder).
let nextLinkId = 0
function makeLink(href = '', text = ''): DrawerLink {
  return { id: nextLinkId++, href, text }
}

function initialState(): DrawerState {
  return {
    label: localStorage.getItem(LABEL_STORAGE_KEY) ?? 'Audiences',
    links: [makeLink(), makeLink(), makeLink()],
    tabColor: DEFAULT_TAB_COLOR,
    tabTextColor: DEFAULT_TAB_TEXT_COLOR,
    borderColor: DEFAULT_BORDER_COLOR,
    panelColor: DEFAULT_PANEL_COLOR,
    linkColor: DEFAULT_LINK_COLOR,
    vposPercent: DEFAULT_VPOS_PERCENT,
    tabWidthRem: DEFAULT_TAB_WIDTH_REM,
    panelWidthMode: 'auto',
    panelWidthRem: DEFAULT_PANEL_WIDTH_REM,
    panelMaxWidthRem: null,
  }
}

const inputCls =
  'w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'

const VPOS_PRESETS: { label: string; value: number }[] = [
  { label: '1/3', value: 33.33 },
  { label: '1/2', value: 50 },
  { label: '2/3', value: 66.67 },
]

const PANEL_WIDTH_MODES: { id: PanelWidthMode; label: string }[] = [
  { id: 'auto', label: 'Fit content' },
  { id: 'fixed', label: 'Fixed' },
]

export function DrawerTool() {
  const [state, setState] = useState<DrawerState>(initialState)
  const [copied, setCopied] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tabOverflow, setTabOverflow] = useState(false)

  const { label, links, tabColor, tabTextColor, borderColor, panelColor, linkColor, vposPercent, tabWidthRem, panelWidthMode, panelWidthRem, panelMaxWidthRem } = state

  const hasLabel = label.trim() !== ''
  const validLinks = links.filter(l => l.href.trim() !== '' && l.text.trim() !== '')
  const hasLink = validLinks.length > 0
  const isComplete = hasLabel && hasLink
  const isCustomVpos = !VPOS_PRESETS.some(p => p.value === vposPercent)

  // Shared input for both generators. Links with empty fields are filtered by
  // the pure generator, so the preview updates as the user types.
  const genInput: GenerateDrawerInput = useMemo(
    () => ({
      label: label.trim() || 'Audiences',
      links: links.map(l => ({ href: l.href, text: l.text })),
      tabColor,
      tabTextColor,
      borderColor,
      panelColor,
      linkColor,
      vposPercent,
      tabWidthRem,
      panelWidthMode,
      panelWidthRem,
      panelMaxWidthRem,
    }),
    [label, links, tabColor, tabTextColor, borderColor, panelColor, linkColor, vposPercent, tabWidthRem, panelWidthMode, panelWidthRem, panelMaxWidthRem],
  )

  const previewHtml = useMemo(
    () => generateDrawerPreviewHtml(genInput, { forceOpen: previewOpen }),
    [genInput, previewOpen],
  )
  const html = useMemo(() => (isComplete ? generateDrawerHtml(genInput) : ''), [isComplete, genInput])

  // Close the fullscreen overlay on Escape.
  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  // ---- handlers ----
  const handleLabel = (val: string) => {
    localStorage.setItem(LABEL_STORAGE_KEY, val)
    setState(s => ({ ...s, label: val }))
  }

  const updateLink = (id: number, patch: Partial<Pick<DrawerLink, 'href' | 'text'>>) => {
    setState(s => ({ ...s, links: s.links.map(l => (l.id === id ? { ...l, ...patch } : l)) }))
  }

  const addLink = () => setState(s => ({ ...s, links: [...s.links, makeLink()] }))

  const removeLink = (id: number) =>
    setState(s => ({ ...s, links: s.links.filter(l => l.id !== id) }))

  const moveLink = (index: number, dir: -1 | 1) => {
    setState(s => {
      const target = index + dir
      if (target < 0 || target >= s.links.length) return s
      const next = [...s.links]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...s, links: next }
    })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleReset = () => {
    setState(initialState())
    setCopied(false)
  }

  const setMaxWidthEnabled = (enabled: boolean) =>
    setState(s => ({ ...s, panelMaxWidthRem: enabled ? 24 : null }))

  // Picking a tab background also sets its brand-paired text color (for contrast).
  // A custom (non-preset) value leaves the current text color untouched.
  const setTabColor = (v: string) => {
    const paired = tabTextFor(v)
    setState(s => ({ ...s, tabColor: v, ...(paired ? { tabTextColor: paired } : {}) }))
  }

  const setColor = (key: 'tabTextColor' | 'borderColor' | 'panelColor' | 'linkColor') => (v: string) =>
    setState(s => ({ ...s, [key]: v }))

  // Measure the rendered preview (same-origin iframe) and flag when the rotated
  // tab is taller than the panel content, so it will stick out past the panel.
  const handlePreviewLoad = (e: SyntheticEvent<HTMLIFrameElement>) => {
    const doc = e.currentTarget.contentDocument
    if (!doc) return
    const measure = () => {
      const tab = doc.querySelector<HTMLElement>('.au-drawer__tab')
      const panel = doc.querySelector<HTMLElement>('.au-drawer__panel')
      if (!tab || !panel) {
        setTabOverflow(false)
        return
      }
      setTabOverflow(tab.getBoundingClientRect().height > panel.getBoundingClientRect().height + 1)
    }
    // Wait for the web fonts to load — they change the rotated tab's height.
    if (doc.fonts?.ready) doc.fonts.ready.then(measure).catch(measure)
    else measure()
  }

  const showOverflowWarning = hasLink && tabOverflow

  // The iframe is reused inline and in the fullscreen overlay.
  const previewIframe = (className: string, title: string) => (
    <iframe
      key={previewHtml}
      srcDoc={previewHtml}
      onLoad={handlePreviewLoad}
      className={`border-0 ${className}`}
      sandbox="allow-same-origin"
      title={title}
    />
  )

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start">

      {/* ── COLUMN 1: Tab label + Links ── */}
      <div className="w-full xl:w-80 shrink-0 space-y-4">

        {/* Section 1: Label */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={1} title="Tab label" done={hasLabel} />
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Vertical tab text <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={e => handleLabel(e.target.value)}
            placeholder="Audiences"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">Shown rotated down the tab. Rendered uppercase.</p>
        </div>

        {/* Section 2: Links */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={2} title="Links" done={hasLink} />
          <div className="space-y-3">
            {links.map((link, i) => (
              <div key={link.id} className="rounded-lg border border-gray-200 p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400">Link {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveLink(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move link ${i + 1} up`}
                      className="px-1.5 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLink(i, 1)}
                      disabled={i === links.length - 1}
                      aria-label={`Move link ${i + 1} down`}
                      className="px-1.5 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink(link.id)}
                      aria-label={`Remove link ${i + 1}`}
                      className="px-1.5 py-0.5 text-xs rounded border border-red-200 text-red-500 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={link.text}
                  onChange={e => updateLink(link.id, { text: e.target.value })}
                  placeholder="Link text (e.g. Current Students)"
                  className={`${inputCls} mb-1.5`}
                />
                <input
                  type="text"
                  value={link.href}
                  onChange={e => updateLink(link.id, { href: e.target.value })}
                  placeholder="https://… or /Portals/…"
                  className={`${inputCls} font-mono`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLink}
            className="mt-3 w-full px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + Add link
          </button>
        </div>

      </div>{/* ── END COLUMN 1 ── */}

      {/* ── COLUMN 2: Colors + Vertical position + Widths ── */}
      <div className="w-full xl:w-80 shrink-0 space-y-4">

        {/* Section 3: Colors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={3} title="Colors" done={true} />
          <ColorField label="Tab / background" value={tabColor} onChange={setTabColor} defaultValue={DEFAULT_TAB_COLOR} />
          <ColorField label="Tab text" value={tabTextColor} onChange={setColor('tabTextColor')} defaultValue={DEFAULT_TAB_TEXT_COLOR} />

          {/* Border / panel / link colors collapse by default — most users keep
              the brand defaults. No box, so the fields align with the others. */}
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-medium text-gray-600 select-none mb-3">
              Advanced colors
            </summary>
            <ColorField label="Border" value={borderColor} onChange={setColor('borderColor')} defaultValue={DEFAULT_BORDER_COLOR} />
            <ColorField label="Panel background" value={panelColor} onChange={setColor('panelColor')} defaultValue={DEFAULT_PANEL_COLOR} />
            <ColorField label="Link text" value={linkColor} onChange={setColor('linkColor')} defaultValue={DEFAULT_LINK_COLOR} />
          </details>
        </div>

        {/* Section 4: Vertical position */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={4} title="Vertical position" done={true} />
          <div className="flex gap-2">
            {VPOS_PRESETS.map(({ label: lbl, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setState(s => ({ ...s, vposPercent: value }))}
                className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors
                  ${vposPercent === value
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <label className="block text-xs font-medium text-gray-700 mb-1 mt-3">
            Custom position (% from top)
            {isCustomVpos && <span className="ml-1 text-blue-600 font-normal">— active</span>}
          </label>
          <input
            type="number"
            step="1"
            min="0"
            max="100"
            value={vposPercent}
            onChange={e => setState(s => ({ ...s, vposPercent: parseFloat(e.target.value) }))}
            className={inputCls}
            aria-label="Custom vertical position percentage"
          />
          <p className="mt-2 text-xs text-gray-400">Centers the tab on this point. Never flush to the top or bottom edge.</p>
        </div>

        {/* Section 5: Widths */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={5} title="Widths" done={true} />

          <label className="block text-xs font-medium text-gray-700 mb-1">Tab width (rem)</label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="10"
            value={tabWidthRem}
            onChange={e => setState(s => ({ ...s, tabWidthRem: parseFloat(e.target.value) }))}
            className={inputCls}
          />

          <label className="block text-xs font-medium text-gray-700 mb-1 mt-4">Panel width</label>
          <div className="flex gap-2">
            {PANEL_WIDTH_MODES.map(({ id, label: lbl }) => (
              <button
                key={id}
                type="button"
                onClick={() => setState(s => ({ ...s, panelWidthMode: id }))}
                className={`flex-1 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors
                  ${panelWidthMode === id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {panelWidthMode === 'auto'
              ? 'Panel grows to fit the longest link.'
              : 'Panel uses a fixed width.'}
          </p>

          {panelWidthMode === 'fixed' && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Fixed width (rem)</label>
              <input
                type="number"
                step="0.5"
                min="4"
                max="40"
                value={panelWidthRem}
                onChange={e => setState(s => ({ ...s, panelWidthRem: parseFloat(e.target.value) }))}
                className={inputCls}
              />
            </div>
          )}

          <div className="mt-3">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={panelMaxWidthRem != null}
                onChange={e => setMaxWidthEnabled(e.target.checked)}
              />
              Cap maximum width
            </label>
            {panelMaxWidthRem != null && (
              <input
                type="number"
                step="0.5"
                min="4"
                max="60"
                value={panelMaxWidthRem}
                onChange={e => setState(s => ({ ...s, panelMaxWidthRem: parseFloat(e.target.value) }))}
                className={`${inputCls} mt-1`}
                aria-label="Maximum panel width (rem)"
              />
            )}
            <p className="mt-1 text-xs text-gray-400">Long links wrap instead of widening past the cap.</p>
          </div>
        </div>

      </div>{/* ── END COLUMN 2 ── */}

      {/* ── COLUMN 3: Live preview ── */}
      <div className="w-full xl:flex-1 min-w-0">
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Live preview</span>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <input
                type="checkbox"
                checked={previewOpen}
                onChange={e => setPreviewOpen(e.target.checked)}
              />
              Always expanded
            </label>
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-white"
            >
              ⛶ Fullscreen
            </button>
          </div>
          {previewIframe(
            'block w-full h-[420px] max-h-[70vh] bg-slate-100',
            'Drawer live preview',
          )}
          {showOverflowWarning && (
            <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 flex items-center gap-1.5">
              <span>⚠</span>
              <span>The tab label is taller than the drawer's links — the tab will stick out past the panel. Add links or shorten the label.</span>
            </div>
          )}
        </div>
      </div>{/* ── END COLUMN 3 ── */}

      {/* ── COLUMN 4: HTML output ── */}
      <div className="w-full xl:w-96 shrink-0">
        <div className={`bg-white rounded-xl shadow-sm border p-4 transition-opacity
          ${isComplete ? 'border-gray-100 opacity-100' : 'border-gray-100 opacity-50 pointer-events-none'}`}>
          <SectionLabel number={6} title="Your HTML code" done={false} />

          {isComplete ? (
            <>
              <p className="text-xs text-gray-500 mb-3">Copy and paste into your DNN Text/HTML module.</p>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-400 font-medium">HTML</span>
                  <button
                    onClick={handleCopy}
                    className={`text-xs font-medium px-3 py-1 rounded-md transition-colors
                      ${copied ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                  >
                    {copied ? '✓ Copied!' : 'Copy to clipboard'}
                  </button>
                </div>
                <pre className="p-3 text-xs text-green-300 overflow-x-auto overflow-y-auto whitespace-pre font-mono leading-relaxed" style={{ maxHeight: '500px' }}>
                  {html}
                </pre>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleReset}
                  className="px-4 py-1.5 bg-gray-800 text-white rounded-lg font-medium text-xs hover:bg-gray-700 transition-colors"
                >
                  Start over
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">
              Enter a tab label and at least one link (text + URL) to generate the code.
            </p>
          )}
        </div>
      </div>{/* ── END COLUMN 4 ── */}

      {/* ── Fullscreen preview overlay ── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex flex-col p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="text-sm font-medium px-3 py-1 rounded bg-white text-gray-800 hover:bg-gray-100"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-slate-100" onClick={e => e.stopPropagation()}>
            {previewIframe('block w-full h-full bg-slate-100', 'Drawer fullscreen preview')}
          </div>
        </div>
      )}

    </div>
  )
}
