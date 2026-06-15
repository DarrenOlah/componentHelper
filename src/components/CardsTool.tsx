import { useState, useMemo, useEffect, useRef, type SyntheticEvent } from 'react'
import {
  generateCardsHtml,
  generateCardsPreviewHtml,
  makeDefaultCard,
  DEFAULT_CARD_COLORS,
  type CardType,
  type CardContent,
  type CardAlign,
  type PreviewContext,
  type GenerateCardsInput,
} from '../lib/cards'
import { SectionLabel } from './SectionLabel'
import { ColorField, tabTextFor } from './ColorField'

interface CardItem extends CardContent {
  id: number
}

interface CardsState {
  type: CardType
  cardsPerRow: 2 | 3 | 4
  align: CardAlign
  accent: string
  accentText: string
  surface: string
  text: string
  cards: CardItem[]
}

const MAX_CARDS = 12

// The preview renders a desktop-width canvas (the host theme's container) and is
// scaled to fit the box, so Bootstrap's viewport-based breakpoints behave as they
// do on the live page. Matches the live army.edu container (1440px, 15px gutters);
// the sidebar layouts give content panes of 1440 / 1080 / 720. Retune here if the
// real site changes.
const SIM_CANVAS_WIDTH = 1440

// Stable, render-safe ids for the cards list (avoids index-as-key on reorder).
let nextCardId = 0
function makeCard(): CardItem {
  return { id: nextCardId++, ...makeDefaultCard() }
}

function initialState(): CardsState {
  return {
    type: 'icon',
    cardsPerRow: 3,
    align: 'left',
    accent: DEFAULT_CARD_COLORS.accent,
    accentText: DEFAULT_CARD_COLORS.accentText,
    surface: DEFAULT_CARD_COLORS.surface,
    text: DEFAULT_CARD_COLORS.text,
    cards: [makeCard(), makeCard(), makeCard()],
  }
}

const inputCls =
  'w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'

const segBtn = (active: boolean) =>
  `flex-1 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors ${
    active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
  }`

const TYPES: { id: CardType; label: string; blurb: string }[] = [
  { id: 'icon', label: 'Icon', blurb: 'Overhanging square icon, heading, body, button.' },
  { id: 'callout', label: 'Callout', blurb: 'Full-cover image with a full-width button band.' },
  { id: 'hover', label: 'Hover', blurb: 'Image with a panel that slides up on hover/focus.' },
]

const PER_ROW: (2 | 3 | 4)[] = [2, 3, 4]

const ALIGNS: { id: CardAlign; label: string }[] = [
  { id: 'left', label: 'Left' },
  { id: 'center', label: 'Centered' },
]

const CONTEXTS: { id: PreviewContext; label: string }[] = [
  { id: 'none', label: 'Full width' },
  { id: 'left', label: 'Left sidebar (¾)' },
  { id: 'both', label: 'Both sidebars (½)' },
]

// A sandboxed iframe rendered at SIM_CANVAS_WIDTH and CSS-scaled to fit its box, so
// the desktop layout/breakpoints are faithful even inside a narrow preview column.
function ScaledPreview({ srcDoc, title, boxClass }: { srcDoc: string; title: string; boxClass: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  const [offsetX, setOffsetX] = useState(0)
  const [contentH, setContentH] = useState(600)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    // Scale the 1440px canvas to fit; when the box is wider than the canvas the
    // scale caps at 1, so center the leftover space (matches a real centered page
    // container) instead of pinning the canvas to the left.
    const update = () => {
      const w = el.clientWidth
      const s = Math.min(1, w / SIM_CANVAS_WIDTH)
      setScale(s)
      setOffsetX(Math.max(0, (w - SIM_CANVAS_WIDTH * s) / 2))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Body height is content-driven (not the iframe element), so scrollHeight is the
  // true canvas height regardless of the element's current height.
  const handleLoad = (e: SyntheticEvent<HTMLIFrameElement>) => {
    const doc = e.currentTarget.contentDocument
    if (doc?.body) {
      const h = Math.max(200, doc.body.scrollHeight)
      setContentH(prev => (prev === h ? prev : h))
    }
  }

  return (
    <div ref={boxRef} className={boxClass} style={{ height: contentH * scale, overflow: 'hidden' }}>
      <iframe
        key={srcDoc}
        srcDoc={srcDoc}
        onLoad={handleLoad}
        title={title}
        sandbox="allow-same-origin"
        style={{
          width: SIM_CANVAS_WIDTH,
          height: contentH,
          marginLeft: offsetX,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          border: 0,
          display: 'block',
          background: '#f1f5f9',
        }}
      />
    </div>
  )
}

export function CardsTool() {
  const [state, setState] = useState<CardsState>(initialState)
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [revealHover, setRevealHover] = useState(true)
  const [previewContext, setPreviewContext] = useState<PreviewContext>('left')

  const { type, cardsPerRow, align, accent, accentText, surface, text, cards } = state

  const showHeadingBody = type !== 'callout'
  const validCards = cards.filter(c => c.buttonText.trim() !== '' && c.buttonHref.trim() !== '')
  const isComplete = cards.length > 0 && validCards.length === cards.length

  const genInput: GenerateCardsInput = useMemo(
    () => ({
      type,
      cardsPerRow,
      align,
      colors: { accent, accentText, surface, text },
      cards: cards.map(({ imageSrc, imageAlt, heading, body, buttonText, buttonHref }) => ({
        imageSrc,
        imageAlt,
        heading,
        body,
        buttonText,
        buttonHref,
      })),
    }),
    [type, cardsPerRow, align, accent, accentText, surface, text, cards],
  )

  const previewHtml = useMemo(
    () => generateCardsPreviewHtml(genInput, { revealHover, context: previewContext }),
    [genInput, revealHover, previewContext],
  )
  const html = useMemo(() => (isComplete ? generateCardsHtml(genInput) : ''), [isComplete, genInput])

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
  const updateCard = (id: number, patch: Partial<CardContent>) =>
    setState(s => ({ ...s, cards: s.cards.map(c => (c.id === id ? { ...c, ...patch } : c)) }))

  const addCard = () =>
    setState(s => (s.cards.length >= MAX_CARDS ? s : { ...s, cards: [...s.cards, makeCard()] }))

  const removeCard = (id: number) =>
    setState(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }))

  const moveCard = (index: number, dir: -1 | 1) => {
    setState(s => {
      const target = index + dir
      if (target < 0 || target >= s.cards.length) return s
      const next = [...s.cards]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...s, cards: next }
    })
  }

  // Picking the accent also sets its brand-paired ink color (for legibility on the
  // band). A custom (non-preset) accent leaves the current ink untouched.
  const setAccent = (v: string) => {
    const paired = tabTextFor(v)
    setState(s => ({ ...s, accent: v, ...(paired ? { accentText: paired } : {}) }))
  }
  const setColor = (key: 'accentText' | 'surface' | 'text') => (v: string) =>
    setState(s => ({ ...s, [key]: v }))

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

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start">

      {/* ── COLUMN 1: Type & layout + Colors ── */}
      <div className="w-full xl:w-80 shrink-0 space-y-4">

        {/* Section 1: Type & layout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={1} title="Type & layout" done={true} />

          <label className="block text-xs font-medium text-gray-700 mb-1">Card type</label>
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setState(s => ({ ...s, type: t.id }))} className={segBtn(type === t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">{TYPES.find(t => t.id === type)?.blurb}</p>

          <label className="block text-xs font-medium text-gray-700 mb-1 mt-4">Cards per row (desktop)</label>
          <div className="flex gap-2">
            {PER_ROW.map(n => (
              <button key={n} type="button" onClick={() => setState(s => ({ ...s, cardsPerRow: n }))} className={segBtn(cardsPerRow === n)}>
                {n}-up
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Extra cards wrap to the next line, and the row collapses to 2-up then 1-up on smaller screens.
          </p>

          <label className="block text-xs font-medium text-gray-700 mb-1 mt-4">Row alignment</label>
          <div className="flex gap-2">
            {ALIGNS.map(a => (
              <button key={a.id} type="button" onClick={() => setState(s => ({ ...s, align: a.id }))} className={segBtn(align === a.id)}>
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Affects only lines that aren’t full (too few cards, or the last wrapped row). Full rows look the same either way.
          </p>
        </div>

        {/* Section 2: Colors */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={2} title="Colors" done={true} />
          <p className="text-xs text-gray-400 mb-3">One scheme for the whole row.</p>
          <ColorField label="Accent / band" value={accent} onChange={setAccent} defaultValue={DEFAULT_CARD_COLORS.accent} />
          <ColorField label="Card surface" value={surface} onChange={setColor('surface')} defaultValue={DEFAULT_CARD_COLORS.surface} />
          <ColorField label="Text" value={text} onChange={setColor('text')} defaultValue={DEFAULT_CARD_COLORS.text} />

          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-medium text-gray-600 select-none mb-3">
              Advanced colors
            </summary>
            <ColorField label="Band text (ink)" value={accentText} onChange={setColor('accentText')} defaultValue={DEFAULT_CARD_COLORS.accentText} />
          </details>
        </div>

      </div>{/* ── END COLUMN 1 ── */}

      {/* ── COLUMN 2: Card content ── */}
      <div className="w-full xl:w-80 shrink-0 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <SectionLabel number={3} title={`Cards (${cards.length})`} done={isComplete} />
          <div className="space-y-3">
            {cards.map((card, i) => (
              <div key={card.id} className="rounded-lg border border-gray-200 p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400">Card {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveCard(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move card ${i + 1} up`}
                      className="px-1.5 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCard(i, 1)}
                      disabled={i === cards.length - 1}
                      aria-label={`Move card ${i + 1} down`}
                      className="px-1.5 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      disabled={cards.length === 1}
                      aria-label={`Remove card ${i + 1}`}
                      className="px-1.5 py-0.5 text-xs rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  {type === 'icon' ? 'Icon URL' : 'Image URL'}
                </label>
                <input
                  type="text"
                  value={card.imageSrc}
                  onChange={e => updateCard(card.id, { imageSrc: e.target.value })}
                  placeholder="/Portals/0/… or https://…"
                  className={`${inputCls} font-mono mb-1.5`}
                />
                <input
                  type="text"
                  value={card.imageAlt}
                  onChange={e => updateCard(card.id, { imageAlt: e.target.value })}
                  placeholder="Image alt text (describe the image)"
                  className={`${inputCls} mb-1.5`}
                />

                {showHeadingBody && (
                  <>
                    <input
                      type="text"
                      value={card.heading}
                      onChange={e => updateCard(card.id, { heading: e.target.value })}
                      placeholder="Heading (optional)"
                      className={`${inputCls} mb-1.5`}
                    />
                    <textarea
                      value={card.body}
                      onChange={e => updateCard(card.id, { body: e.target.value })}
                      placeholder="Body text (optional)"
                      rows={2}
                      className={`${inputCls} mb-1.5 resize-y`}
                    />
                  </>
                )}

                <input
                  type="text"
                  value={card.buttonText}
                  onChange={e => updateCard(card.id, { buttonText: e.target.value })}
                  placeholder={type === 'hover' ? 'CTA text *' : 'Button text *'}
                  className={`${inputCls} mb-1.5`}
                />
                <input
                  type="text"
                  value={card.buttonHref}
                  onChange={e => updateCard(card.id, { buttonHref: e.target.value })}
                  placeholder="Button URL * (https://… or /Portals/…)"
                  className={`${inputCls} font-mono`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addCard}
            disabled={cards.length >= MAX_CARDS}
            className="mt-3 w-full px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-500"
          >
            + Add card {cards.length >= MAX_CARDS && `(max ${MAX_CARDS})`}
          </button>
          <p className="mt-2 text-xs text-gray-400">
            Each card needs button text and a URL. Image is optional — a placeholder shows until you add one.
          </p>
        </div>
      </div>{/* ── END COLUMN 2 ── */}

      {/* ── COLUMN 3: Live preview (top) + generated HTML (below) ── */}
      <div className="w-full xl:flex-1 min-w-0 space-y-4">

        {/* Preview */}
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Live preview</span>
            {type === 'hover' && (
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <input type="checkbox" checked={revealHover} onChange={e => setRevealHover(e.target.checked)} />
                Show revealed state
              </label>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-white"
            >
              ⛶ Fullscreen
            </button>
          </div>

          {/* Content-width simulation (sidebars on the host page) */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium text-gray-500 shrink-0">Content width:</span>
            <div className="flex gap-2 flex-1 min-w-0">
              {CONTEXTS.map(c => (
                <button key={c.id} type="button" onClick={() => setPreviewContext(c.id)} className={segBtn(previewContext === c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <ScaledPreview srcDoc={previewHtml} title="Cards live preview" boxClass="w-full bg-slate-100" />
          <p className="px-3 py-1.5 text-[11px] text-gray-400 border-t border-gray-100">
            Preview shows a {SIM_CANVAS_WIDTH}px desktop container, scaled to fit — sidebars are placeholders, not part of the copied code.
          </p>
        </div>

        {/* Generated HTML */}
        <div className={`bg-white rounded-xl shadow-sm border p-4 transition-opacity
          ${isComplete ? 'border-gray-100 opacity-100' : 'border-gray-100 opacity-50 pointer-events-none'}`}>
          <SectionLabel number={4} title="Your HTML code" done={false} />

          {isComplete ? (
            <>
              <p className="text-xs text-gray-500 mb-3">Copy and paste a whole row into one DNN Text/HTML module.</p>
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
              Give every card button text and a URL to generate the code.
            </p>
          )}
        </div>

      </div>{/* ── END COLUMN 3 ── */}

      {/* ── Fullscreen preview overlay ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col p-4" onClick={() => setIsFullscreen(false)}>
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="text-sm font-medium px-3 py-1 rounded bg-white text-gray-800 hover:bg-gray-100"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg bg-slate-100" onClick={e => e.stopPropagation()}>
            <ScaledPreview srcDoc={previewHtml} title="Cards fullscreen preview" boxClass="w-full bg-slate-100" />
          </div>
        </div>
      )}

    </div>
  )
}
