import { useState, useMemo, useEffect, useRef, type SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  generateCardsHtml,
  generateCardsPreviewHtml,
  makeDefaultCard,
  coercePersistedCards,
  coerceCollections,
  snapshotToGenInput,
  snapshotsEqual,
  splitAbsoluteHref,
  isRelativeHref,
  DEFAULT_CARD_COLORS,
  MAX_CARDS,
  IMAGE_ASPECTS,
  type CardType,
  type CardContent,
  type CardAlign,
  type CardsPerRow,
  type CardImageAspect,
  type CardIconFit,
  type CardRevealBg,
  type PreviewContext,
  type GenerateCardsInput,
  type CardsSnapshot,
  type CardsCollection,
} from '../lib/cards'
import { parseCardsHtml } from '../lib/parseCards'
import { SectionLabel } from './SectionLabel'
import { ColorField, tabTextFor } from './ColorField'

interface CardItem extends CardContent {
  id: number
}

interface CardsState {
  type: CardType
  cardsPerRow: CardsPerRow
  imageAspect: CardImageAspect
  iconFit: CardIconFit
  revealBg: CardRevealBg
  align: CardAlign
  accent: string
  accentText: string
  surface: string
  text: string
  cards: CardItem[]
}

// Autosave: the working draft survives refreshes and Drawer↔Cards navigation (the
// router unmounts this component on tool switch). Written debounced so typing doesn't
// thrash localStorage.
const DRAFT_KEY = 'componentHelper-cards-draft'
const SAVE_DEBOUNCE_MS = 400

// Saved card collections: a named, browser-local library the user explicitly manages
// (separate from the autosave draft above).
const COLLECTIONS_KEY = 'componentHelper-cards-collections'

function loadCollections(): CardsCollection[] {
  try {
    const raw = localStorage.getItem(COLLECTIONS_KEY)
    return raw ? coerceCollections(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

// Unique id for a saved collection (crypto.randomUUID where available).
function newCollectionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `c-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

// The preview renders a desktop-width canvas (the host theme's container) and is
// scaled to fit the box, so Bootstrap's viewport-based breakpoints behave as they
// do on the live page. Matches the live army.edu container (1440px, 15px gutters);
// the sidebar layouts give content panes of 1440 / 1080 / 720. Retune here if the
// real site changes.
const SIM_CANVAS_WIDTH = 1440

// Stable, render-safe ids for the cards list (avoids index-as-key on reorder).
let nextCardId = 0
function makeCard(content: CardContent = makeDefaultCard()): CardItem {
  return { id: nextCardId++, ...content }
}

// The look-settings half of the state (everything but `cards`). Shared by initialState
// and the "Reset settings" action so defaults can't drift between them.
function defaultSettings() {
  return {
    type: 'icon' as CardType,
    cardsPerRow: 3 as CardsPerRow,
    imageAspect: 'auto' as CardImageAspect,
    iconFit: 'contain' as CardIconFit,
    revealBg: 'gradient' as CardRevealBg,
    align: 'left' as CardAlign,
    accent: DEFAULT_CARD_COLORS.accent,
    accentText: DEFAULT_CARD_COLORS.accentText,
    surface: DEFAULT_CARD_COLORS.surface,
    text: DEFAULT_CARD_COLORS.text,
  }
}

function initialState(): CardsState {
  return { ...defaultSettings(), cards: [makeCard(), makeCard(), makeCard()] }
}

// Build a CardsState from a coerced snapshot, assigning fresh render ids so the
// module's id counter stays ahead of restored cards (no key collisions on add).
function stateFromSnapshot(snap: CardsSnapshot): CardsState {
  const { cards, ...settings } = snap
  return { ...settings, cards: cards.map(c => makeCard(c)) }
}

// The editable snapshot of a CardsState (cards stripped of their render ids): the
// unit stored by the autosave draft and saved collections, and compared for the
// open-file unsaved-changes (`*`) indicator.
function toSnapshot(state: CardsState): CardsSnapshot {
  return {
    type: state.type,
    cardsPerRow: state.cardsPerRow,
    imageAspect: state.imageAspect,
    iconFit: state.iconFit,
    revealBg: state.revealBg,
    align: state.align,
    accent: state.accent,
    accentText: state.accentText,
    surface: state.surface,
    text: state.text,
    cards: state.cards.map(c => ({
      imageSrc: c.imageSrc,
      imageAlt: c.imageAlt,
      heading: c.heading,
      body: c.body,
      buttonText: c.buttonText,
      ctaText: c.ctaText,
      buttonHref: c.buttonHref,
      external: c.external,
    })),
  }
}

// The pristine default snapshot — the "unsaved changes" baseline when no collection
// is open (so a freshly-started editor reads as clean, but any edit reads as dirty).
const DEFAULT_SNAPSHOT = toSnapshot(initialState())

interface LoadedDraft {
  state: CardsState
  revealHover: boolean
  previewContext: PreviewContext
  loadedId: string | null
}
// Seed the editor from the autosave draft, falling back to defaults on missing/corrupt
// storage. Parses exactly once (called from a lazy useState initializer). `loadedId` is
// the open-file link; it's validated against the loaded library before use, so a stale
// id (collection since deleted) safely reads as an untitled draft.
function loadDraft(knownCollectionIds: ReadonlySet<string>): LoadedDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    const draft = raw ? coercePersistedCards(JSON.parse(raw)) : null
    if (draft) {
      return {
        state: stateFromSnapshot(draft.snapshot),
        revealHover: draft.revealHover,
        previewContext: draft.previewContext,
        loadedId: draft.loadedId && knownCollectionIds.has(draft.loadedId) ? draft.loadedId : null,
      }
    }
  } catch {
    // fall through to defaults on parse/storage error
  }
  return { state: initialState(), revealHover: false, previewContext: 'left', loadedId: null }
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
  { id: 'logo', label: 'Logo', blurb: 'Centered icon/logo with a label band; optional hover reveal.' },
]

const PER_ROW: CardsPerRow[] = [1, 2, 3, 4, 5]

// Friendly labels for the cover-photo "Image shape" presets (IMAGE_ASPECTS order).
const ASPECT_LABELS: Record<CardImageAspect, string> = {
  auto: 'Auto (fixed-height crop)',
  '1:1': 'Square (1:1)',
  '5:4': '5:4',
  '4:3': '4:3',
  '3:2': '3:2',
  '16:9': '16:9 (Widescreen)',
  '21:9': '21:9 (Cinematic)',
}

// Logo-card icon fit: whole logo (contain) vs fill-and-crop to the tile (cover).
const ICON_FIT_OPTS: { id: CardIconFit; label: string; blurb: string }[] = [
  { id: 'contain', label: 'Whole logo', blurb: 'Show the entire icon (best for transparent logos).' },
  { id: 'cover', label: 'Fill & crop', blurb: 'Fill the tile and crop overflow to the Image shape.' },
]

// Logo-card reveal-panel background: gradient overlay (icon shows through) vs an
// opaque surface fill (icon hidden, text most readable).
const REVEAL_BG_OPTS: { id: CardRevealBg; label: string; blurb: string }[] = [
  { id: 'gradient', label: 'Gradient', blurb: 'Dark overlay — the icon stays visible behind the text.' },
  { id: 'solid', label: 'Solid', blurb: 'Opaque surface color — hides the icon for the clearest text.' },
]

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
  // Saved collections (browser-local library). Loaded first so the draft can validate
  // its open-file link against the known ids. `loadedId` is the *open file*;
  // `selectedId` is the row highlighted in the library modal (drives its preview).
  const [collections, setCollections] = useState<CardsCollection[]>(loadCollections)
  // Seed every persisted field from the autosave draft, parsing storage exactly once.
  const [draft] = useState(() => loadDraft(new Set(collections.map(c => c.id))))
  const [state, setState] = useState<CardsState>(draft.state)
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [revealHover, setRevealHover] = useState(draft.revealHover)
  const [previewContext, setPreviewContext] = useState<PreviewContext>(draft.previewContext)
  // Mirrors the OS/browser "Prefers reduced motion" setting — the same signal the
  // generated CSS keys off, so we can warn that the reveal won't animate in preview.
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const [loadedId, setLoadedId] = useState<string | null>(draft.loadedId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Inline rename of the open file's name from the nav row.
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [sortMode, setSortMode] = useState<'recent' | 'name'>('recent')
  // Editing buffer for the selected collection's metadata (synced on select).
  const [detailName, setDetailName] = useState('')
  const [detailUrl, setDetailUrl] = useState('')
  const [detailDesc, setDetailDesc] = useState('')
  // Save As dialog (name + optional site metadata) → creates a new collection.
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [saveAsUrl, setSaveAsUrl] = useState('')
  const [saveAsDesc, setSaveAsDesc] = useState('')
  // Import: paste generated HTML back to recover the editable fields.
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  // When set, the modal swaps from the paste form to a confirmation screen carrying
  // note-worthy info about the import (e.g. colors fell back to defaults).
  const [importSummary, setImportSummary] = useState<string | null>(null)
  // The App nav-row portal targets; resolved after mount (App.tsx renders them).
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null)
  const [navCenter, setNavCenter] = useState<HTMLElement | null>(null)
  // Transient receipt after auto-stripping an absolute origin off an internal link
  // (on blur). Holds the pre-strip URL so Undo / "Make external" can restore it.
  // One at a time — editing another field's URL just moves the receipt.
  const [stripped, setStripped] = useState<{ cardId: number; original: string; origin: string } | null>(null)

  const { type, cardsPerRow, imageAspect, iconFit, revealBg, align, accent, accentText, surface, text, cards } = state

  const showHeading = type === 'icon' // hover's gold band is button text, not a heading
  const showBody = type !== 'callout' // icon __text + hover __desc
  const validCards = cards.filter(c => c.buttonText.trim() !== '' && c.buttonHref.trim() !== '')
  const isComplete = cards.length > 0 && validCards.length === cards.length

  // Whether the look-settings (type/layout/colors) are already at their defaults —
  // used to hide the "Reset settings" affordance when there's nothing to reset
  // (mirrors ColorField's per-swatch reset behavior).
  const d = defaultSettings()
  const eqHex = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  const settingsAreDefault =
    type === d.type &&
    cardsPerRow === d.cardsPerRow &&
    imageAspect === d.imageAspect &&
    iconFit === d.iconFit &&
    revealBg === d.revealBg &&
    align === d.align &&
    eqHex(accent, d.accent) &&
    eqHex(accentText, d.accentText) &&
    eqHex(surface, d.surface) &&
    eqHex(text, d.text)

  const genInput: GenerateCardsInput = useMemo(
    () => ({
      type,
      cardsPerRow,
      imageAspect,
      iconFit,
      revealBg,
      align,
      colors: { accent, accentText, surface, text },
      cards: cards.map(({ imageSrc, imageAlt, heading, body, buttonText, ctaText, buttonHref, external }) => ({
        imageSrc,
        imageAlt,
        heading,
        body,
        buttonText,
        ctaText,
        buttonHref,
        external,
      })),
    }),
    [type, cardsPerRow, imageAspect, iconFit, revealBg, align, accent, accentText, surface, text, cards],
  )

  const previewHtml = useMemo(
    () => generateCardsPreviewHtml(genInput, { revealHover, context: previewContext }),
    [genInput, revealHover, previewContext],
  )
  const html = useMemo(() => (isComplete ? generateCardsHtml(genInput) : ''), [isComplete, genInput])

  // ---- open-file model ----
  // The editor's current snapshot vs the "saved" baseline: the open collection's
  // snapshot if one is loaded, otherwise the pristine defaults. Drives the `*`.
  const currentSnapshot = useMemo(() => toSnapshot(state), [state])
  const loadedColl = collections.find(c => c.id === loadedId) ?? null
  const loadedName = loadedColl?.name ?? null
  const referenceSnapshot = loadedColl ? loadedColl.snapshot : DEFAULT_SNAPSHOT
  // The preview Content Width is part of the file: the open collection's saved width,
  // or the editor default ('left') when untitled. Changing it counts as a change.
  const referenceContext: PreviewContext = loadedColl?.previewContext ?? 'left'
  const isDirty = !snapshotsEqual(currentSnapshot, referenceSnapshot) || previewContext !== referenceContext

  // The collection highlighted in the library modal + its live preview.
  const selectedColl = collections.find(c => c.id === selectedId) ?? null
  const sortedCollections = useMemo(() => {
    const arr = [...collections]
    if (sortMode === 'name') arr.sort((a, b) => a.name.localeCompare(b.name))
    else arr.sort((a, b) => b.savedAt - a.savedAt)
    return arr
  }, [collections, sortMode])
  // Preview a selected collection in the Content Width it was designed for (its own
  // saved context), not the editor's current width.
  const selectedPreviewHtml = useMemo(
    () =>
      selectedColl
        ? generateCardsPreviewHtml(snapshotToGenInput(selectedColl.snapshot), {
            revealHover,
            context: selectedColl.previewContext ?? 'left',
          })
        : '',
    [selectedColl, revealHover],
  )

  // Resolve the App nav-row portal target after mount (App.tsx renders it as a sibling,
  // so it's in the DOM by the time this runs) — the documented "attach to an external
  // node" use of an effect.
  useEffect(() => {
    const slot = document.getElementById('cards-nav-slot')
    const center = document.getElementById('cards-nav-center')
    /* eslint-disable react-hooks/set-state-in-effect */
    if (slot) setNavSlot(slot)
    if (center) setNavCenter(center)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  // Close the fullscreen overlay / collections / import / save-as modals on Escape.
  useEffect(() => {
    if (!isFullscreen && !collectionsOpen && !importOpen && !saveAsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Escape the Save As dialog first (it stacks above the library modal).
      if (saveAsOpen) {
        setSaveAsOpen(false)
        return
      }
      setIsFullscreen(false)
      setCollectionsOpen(false)
      setImportOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen, collectionsOpen, importOpen, saveAsOpen])

  // Autosave the working draft (debounced) so a refresh or tool switch restores it,
  // including the open-file link so a later Save targets the right collection.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, state, revealHover, previewContext, loadedId }))
      } catch {
        // ignore quota / disabled-storage errors
      }
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [state, revealHover, previewContext, loadedId])

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

  // Wipe the saved draft and reset everything (incl. preview toggles and the open-file
  // link) to a blank untitled editor. The autosave effect then re-persists the defaults.
  const resetEditor = () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore disabled-storage errors
    }
    setState(initialState())
    setRevealHover(false)
    setPreviewContext('left')
    setLoadedId(null)
    setCopied(false)
  }

  // Start over: reset to a blank untitled editor.
  const handleReset = resetEditor

  // Reset only the look-settings (type, layout, colors) to defaults, keeping the
  // cards the user has built. (Start over wipes everything; this is the lighter touch.)
  const handleResetSettings = () => setState(s => ({ ...s, ...defaultSettings() }))

  // ---- collections (saved, browser-local library) ----
  const persistCollections = (next: CardsCollection[]) => {
    setCollections(next)
    try {
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(next))
    } catch {
      // ignore quota / disabled-storage errors
    }
  }

  // Highlight a collection in the library modal and load its metadata into the edit
  // buffer (so the details fields are ready without an effect).
  const selectCollection = (coll: CardsCollection) => {
    setSelectedId(coll.id)
    setDetailName(coll.name)
    setDetailUrl(coll.url ?? '')
    setDetailDesc(coll.description ?? '')
  }

  // Open the Save As dialog, seeding the name (for an open file, suggest a "copy").
  const openSaveAs = () => {
    setSaveAsName(loadedName ? `${loadedName} copy` : '')
    setSaveAsUrl('')
    setSaveAsDesc('')
    setSaveAsOpen(true)
  }

  // Save As: snapshot the editor into a brand-new collection and open it. The current
  // preview Content Width is saved with it, so it reopens in the layout it was built for.
  const handleSaveAs = (name: string, url: string, description: string) => {
    const coll: CardsCollection = {
      id: newCollectionId(),
      name: name.trim() || 'Untitled',
      savedAt: Date.now(),
      snapshot: toSnapshot(state),
      previewContext,
      url: url.trim(),
      description: description.trim(),
    }
    persistCollections([coll, ...collections])
    setLoadedId(coll.id)
    selectCollection(coll)
  }

  const submitSaveAs = () => {
    handleSaveAs(saveAsName, saveAsUrl, saveAsDesc)
    setSaveAsOpen(false)
  }

  // Inline rename of the open file from the nav row (metadata-only, like Save details).
  const startRename = () => {
    if (!loadedId) return
    setRenameValue(loadedName ?? '')
    setRenaming(true)
  }
  const commitRename = () => {
    setRenaming(false)
    if (!loadedId) return
    const name = renameValue.trim() || 'Untitled'
    persistCollections(collections.map(c => (c.id === loadedId ? { ...c, name } : c)))
  }

  // Save: overwrite the open collection in place (cards + preview Content Width). Only
  // reachable with a file open — untitled drafts use Save As (see the nav controls).
  const handleSave = () => {
    if (!loadedId) return
    persistCollections(
      collections.map(c =>
        c.id === loadedId ? { ...c, snapshot: toSnapshot(state), previewContext, savedAt: Date.now() } : c,
      ),
    )
  }

  // Close the open file: wipe back to a blank untitled editor (confirm if there are
  // unsaved changes that would be lost).
  const handleCloseFile = () => {
    if (isDirty && !window.confirm('Close this collection and discard unsaved changes?')) return
    resetEditor()
  }

  // Open (load) a collection: its cards and the preview Content Width it was designed
  // for. Warn only when there are unsaved changes (per the open-file model).
  const handleOpen = (coll: CardsCollection) => {
    if (isDirty && !window.confirm(`You have unsaved changes that aren’t saved to a collection. Open “${coll.name}” and discard them?`)) return
    setState(stateFromSnapshot(coll.snapshot))
    setPreviewContext(coll.previewContext ?? 'left')
    setLoadedId(coll.id)
    selectCollection(coll)
    setCollectionsOpen(false)
  }

  // Save the selected collection's metadata only (name / URL / description) — never
  // touches its card snapshot or savedAt.
  const handleSaveDetails = (coll: CardsCollection) => {
    persistCollections(
      collections.map(c =>
        c.id === coll.id ? { ...c, name: detailName.trim() || 'Untitled', url: detailUrl.trim(), description: detailDesc.trim() } : c,
      ),
    )
  }

  const handleCloneCollection = (coll: CardsCollection) => {
    const copy: CardsCollection = {
      ...coll,
      id: newCollectionId(),
      name: `${coll.name} (copy)`,
      savedAt: Date.now(),
    }
    persistCollections([copy, ...collections])
    selectCollection(copy)
  }

  const handleDeleteCollection = (coll: CardsCollection) => {
    if (!window.confirm(`Delete "${coll.name}"? This can't be undone.`)) return
    persistCollections(collections.filter(c => c.id !== coll.id))
    if (loadedId === coll.id) setLoadedId(null)
    if (selectedId === coll.id) setSelectedId(null)
  }

  // ---- import (parse pasted HTML back into the editor) ----
  // Parse `text` and load it into the editor. Called on paste (clipboard string) and from
  // the "Load cards" button (the textarea value, for hand-edited HTML or a failed retry).
  const attemptImport = (text: string) => {
    const parsed = parseCardsHtml(text)
    if (!parsed) {
      setImportError("Couldn't recognize any cards in that HTML. Paste the code this tool generated (the whole block, or at least the card markup).")
      return
    }
    // Only guard against overwriting unsaved work; a fresh or saved-and-unmodified editor
    // (isDirty === false) is safe to replace silently.
    if (isDirty && !window.confirm('Replace the cards currently in the editor with the imported ones?')) return
    setState({
      type: parsed.type,
      cardsPerRow: parsed.cardsPerRow,
      imageAspect: parsed.imageAspect ?? 'auto',
      iconFit: parsed.iconFit ?? 'contain',
      revealBg: parsed.revealBg ?? 'gradient',
      align: parsed.align ?? 'left',
      accent: parsed.colors.accent,
      accentText: parsed.colors.accentText,
      surface: parsed.colors.surface,
      text: parsed.colors.text,
      cards: parsed.cards.map(c => makeCard(c)),
    })
    setLoadedId(null) // imported content isn't tied to a saved collection
    setImportError(null)
    const n = parsed.cards.length
    const colorsDefaulted = !/--au-gold/.test(text)
    if (colorsDefaulted) {
      // Note-worthy: switch to the confirmation screen so the caveat is read before leaving.
      setImportSummary(
        `Imported ${n} card${n === 1 ? '' : 's'}. Colors weren’t found in the paste, so defaults were applied.`,
      )
    } else {
      // Clean import: nothing to flag — apply and close immediately.
      setImportOpen(false)
      setImportText('')
      setImportSummary(null)
    }
  }

  // ---- keyboard + unload guards ----
  // Ctrl/Cmd-S saves the open file (or opens Save As when untitled). A ref keeps the
  // listener registered once while always running against the latest handlers/state.
  const saveShortcutRef = useRef<() => void>(() => {})
  useEffect(() => {
    saveShortcutRef.current = () => {
      if (loadedId) handleSave()
      else openSaveAs()
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        saveShortcutRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Warn before closing/reloading the tab with unsaved edits to an open collection.
  useEffect(() => {
    if (!loadedId || !isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [loadedId, isDirty])

  return (
    <>

      {/* ── Open-file controls, portaled into the nav row's centered slot ── */}
      {navCenter &&
        createPortal(
          <>
            {renaming ? (
              <input
                type="text"
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename()
                  else if (e.key === 'Escape') setRenaming(false)
                }}
                className="text-sm font-medium text-gray-800 max-w-[16rem] px-1.5 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : loadedId ? (
              <button
                type="button"
                onClick={startRename}
                title="Click to rename this collection"
                className="text-sm font-medium text-gray-800 max-w-[16rem] truncate hover:underline decoration-dotted"
              >
                {loadedName ?? 'Untitled'}
                {isDirty && <span className="text-blue-600 font-bold" title="Unsaved changes"> *</span>}
              </button>
            ) : (
              <span className="text-sm font-medium text-gray-800 max-w-[16rem] truncate" title="Untitled (not saved to a collection)">
                Untitled
                {isDirty && <span className="text-blue-600 font-bold" title="Unsaved changes"> *</span>}
              </span>
            )}
            {loadedId && (
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty}
                title="Save changes to the open collection"
                className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
            )}
            <button
              type="button"
              onClick={openSaveAs}
              title="Save the current cards as a new collection"
              className="px-2.5 py-1 rounded-md border border-gray-300 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50"
            >
              Save As…
            </button>
            {loadedId && (
              <button
                type="button"
                onClick={handleCloseFile}
                title="Close the open collection and clear the editor"
                className="px-2.5 py-1 rounded-md border border-gray-300 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50"
              >
                Close
              </button>
            )}
          </>,
          navCenter,
        )}

      <div className="flex flex-col xl:flex-row gap-4 items-start">

      {/* ── COLUMN 1: Type & layout + Colors ── */}
      <div className="w-full xl:w-80 shrink-0 space-y-4">

        {/* Section 1: Type & layout */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel number={1} title="Type & layout" done={true} />
            {!settingsAreDefault && (
              <button
                type="button"
                onClick={handleResetSettings}
                title="Reset type, layout, and colors to defaults (keeps your cards)"
                className="mb-3 shrink-0 text-xs font-medium text-gray-500 hover:text-blue-600 hover:underline"
              >
                ↺ Reset settings
              </button>
            )}
          </div>

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
                {n}
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

          {(type === 'callout' || type === 'hover' || type === 'logo') && (
            <>
              <label className="block text-xs font-medium text-gray-700 mb-1 mt-4">Image shape</label>
              <select
                value={imageAspect}
                onChange={e => setState(s => ({ ...s, imageAspect: e.target.value as CardImageAspect }))}
                className={inputCls}
              >
                {IMAGE_ASPECTS.map(a => (
                  <option key={a} value={a}>
                    {ASPECT_LABELS[a]}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-400">
                {type === 'logo' && 'Tip: Square (1:1) suits logos and icons.'}
              </p>
            </>
          )}

          {type === 'logo' && (
            <>
              <label className="block text-xs font-medium text-gray-700 mb-1 mt-4">Icon fit</label>
              <div className="flex gap-2">
                {ICON_FIT_OPTS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setState(s => ({ ...s, iconFit: f.id }))}
                    className={segBtn(iconFit === f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">{ICON_FIT_OPTS.find(f => f.id === iconFit)?.blurb}</p>

              <label className="block text-xs font-medium text-gray-700 mb-1 mt-4">Reveal background</label>
              <div className="flex gap-2">
                {REVEAL_BG_OPTS.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setState(s => ({ ...s, revealBg: b.id }))}
                    className={segBtn(revealBg === b.id)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">{REVEAL_BG_OPTS.find(b => b.id === revealBg)?.blurb}</p>
            </>
          )}
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
                  {type === 'icon' || type === 'logo' ? 'Icon URL' : 'Image URL'}
                </label>
                <input
                  type="text"
                  value={card.imageSrc}
                  onChange={e => updateCard(card.id, { imageSrc: e.target.value })}
                  placeholder="/Portals/0/… or https://…"
                  className={`${inputCls} font-mono mb-1.5`}
                />
                {type === 'logo' && (
                  <p className="-mt-1 mb-1.5 text-[11px] text-gray-400">
                    A square logo works best — transparent PNGs show the card surface color. Add Body/CTA text to reveal a panel on hover.
                  </p>
                )}
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Image alt text
                </label>
                <input
                  type="text"
                  value={card.imageAlt}
                  onChange={e => updateCard(card.id, { imageAlt: e.target.value })}
                  placeholder="Describe the image"
                  className={`${inputCls} mb-1.5`}
                />

                {showHeading && (
                  <>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Heading (optional)
                    </label>
                    <input
                      type="text"
                      value={card.heading}
                      onChange={e => updateCard(card.id, { heading: e.target.value })}
                      placeholder="Heading (optional)"
                      className={`${inputCls} mb-1.5`}
                    />
                  </>
                )}
                {showBody && (
                  <>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Body text (optional)
                    </label>
                    <textarea
                      value={card.body}
                      onChange={e => updateCard(card.id, { body: e.target.value })}
                      placeholder="Body text (optional)"
                      rows={2}
                      className={`${inputCls} mb-1.5 resize-y`}
                    />
                  </>
                )}

                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Button text *
                </label>
                <input
                  type="text"
                  value={card.buttonText}
                  onChange={e => updateCard(card.id, { buttonText: e.target.value })}
                  placeholder="Button text *"
                  className={`${inputCls} mb-1.5`}
                />
                {(type === 'hover' || type === 'logo') && (
                  <>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      CTA text (optional)
                    </label>
                    <input
                      type="text"
                      value={card.ctaText}
                      onChange={e => updateCard(card.id, { ctaText: e.target.value })}
                      placeholder="CTA text (optional)"
                      className={`${inputCls} mb-1.5`}
                    />
                  </>
                )}
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Button URL *
                </label>
                <input
                  type="text"
                  value={card.buttonHref}
                  onChange={e => {
                    updateCard(card.id, { buttonHref: e.target.value })
                    if (stripped?.cardId === card.id) setStripped(null) // a manual edit dismisses the receipt
                  }}
                  onBlur={() => {
                    // Internal links should be root-relative so they survive site moves
                    // (staging↔prod, www↔non-www). On blur, auto-strip an absolute origin
                    // and offer to undo / reclassify as external. Skip when already external.
                    if (card.external) return
                    const split = splitAbsoluteHref(card.buttonHref)
                    if (!split) return
                    updateCard(card.id, { buttonHref: split.rootRelative })
                    setStripped({ cardId: card.id, original: card.buttonHref, origin: split.origin })
                  }}
                  placeholder="Button URL * (https://… or /Portals/…)"
                  className={`${inputCls} font-mono`}
                />
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-1.5">
                  <input
                    type="checkbox"
                    checked={card.external}
                    onChange={e => {
                      // Re-marking a just-stripped link as external means its origin
                      // belonged after all — restore the full URL in the same move.
                      if (e.target.checked && stripped?.cardId === card.id) {
                        updateCard(card.id, { buttonHref: stripped.original, external: true })
                        setStripped(null)
                      } else {
                        updateCard(card.id, { external: e.target.checked })
                      }
                    }}
                  />
                  External link (opens in a new tab)
                </label>
                {stripped?.cardId === card.id && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                    <span>
                      Removed <span className="font-mono">{stripped.origin}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        updateCard(card.id, { buttonHref: stripped.original })
                        setStripped(null)
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateCard(card.id, { buttonHref: stripped.original, external: true })
                        setStripped(null)
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Make external
                    </button>
                  </div>
                )}
                {card.external && isRelativeHref(card.buttonHref) && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    ⚠ This is a relative link. "External link" is best for links to another site or links to files.
                  </p>
                )}
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
            {(type === 'hover' || type === 'logo') && (
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <input type="checkbox" checked={revealHover} onChange={e => setRevealHover(e.target.checked)} />
                Show revealed state
                {reducedMotion && (
                  <span className="text-gray-400">(This computer has "prefers reduced motion" on. The sliding reveal won't animate.)</span>
                )}
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

      {/* ── Card Helper toolbar buttons, portaled into the App nav row ── */}
      {navSlot &&
        createPortal(
          <>
            <button
              type="button"
              onClick={() => {
                setImportError(null)
                setImportSummary(null)
                setImportOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              ⤵ Import
            </button>
            <button
              type="button"
              onClick={() => {
                // Auto-select the open collection so its preview shows on open.
                const open = collections.find(c => c.id === loadedId)
                if (open) selectCollection(open)
                setCollectionsOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              💾 Saved Card Collections
              {collections.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                  {collections.length}
                </span>
              )}
            </button>
          </>,
          navSlot,
        )}

      {/* ── Collections modal (two-pane: list + live preview of the selected one) ── */}
      {collectionsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-auto"
          onClick={() => setCollectionsOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl mt-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">Saved card collections</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openSaveAs}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                >
                  ＋ Save current as new…
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionsOpen(false)}
                  aria-label="Close"
                  className="text-sm px-2 py-0.5 rounded text-gray-500 hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>

            {collections.length === 0 ? (
              <p className="text-xs text-gray-400 py-12 text-center">
                No saved collections yet. Use <span className="font-medium">Save current as new…</span> above to start a library.
              </p>
            ) : (
              <div className="flex min-h-[20rem]">
                {/* Left: the library list */}
                <div className="w-64 shrink-0 border-r border-gray-200 flex flex-col">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2 text-[11px] text-gray-500">
                    <span>Sort:</span>
                    <select
                      value={sortMode}
                      onChange={e => setSortMode(e.target.value as 'recent' | 'name')}
                      className="border border-gray-300 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="recent">Recently saved</option>
                      <option value="name">Name (A–Z)</option>
                    </select>
                  </div>
                  <div className="overflow-auto max-h-[60vh] p-2 space-y-1">
                    {sortedCollections.map(coll => (
                      <button
                        key={coll.id}
                        type="button"
                        onClick={() => selectCollection(coll)}
                        onDoubleClick={() => handleOpen(coll)}
                        title="Click to preview · double-click to open"
                        className={`w-full text-left rounded-lg border p-2 ${
                          coll.id === selectedId ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800 truncate">{coll.name}</span>
                          {coll.id === loadedId && (
                            <span className="shrink-0 px-1 rounded bg-green-100 text-green-700 text-[9px] font-semibold uppercase tracking-wide">
                              Open
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {coll.snapshot.cards.length} card{coll.snapshot.cards.length === 1 ? '' : 's'} · {coll.snapshot.type} ·{' '}
                          {new Date(coll.savedAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: preview + details + actions for the selected collection */}
                <div className="flex-1 min-w-0 p-4 overflow-auto max-h-[70vh]">
                  {selectedColl ? (
                    <>
                      <div className="mb-3">
                        <ScaledPreview
                          srcDoc={selectedPreviewHtml}
                          title={`Preview of ${selectedColl.name}`}
                          boxClass="w-full bg-slate-100 rounded-lg border border-gray-200"
                        />
                      </div>

                      {/* Editable details (name / where it's used / notes) */}
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Name</label>
                          <input
                            type="text"
                            value={detailName}
                            onChange={e => setDetailName(e.target.value)}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Used at (URL){' '}
                            {detailUrl.trim() && (
                              <a
                                href={detailUrl.trim()}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1 text-blue-600 hover:underline font-normal"
                              >
                                open ↗
                              </a>
                            )}
                          </label>
                          <input
                            type="text"
                            value={detailUrl}
                            onChange={e => setDetailUrl(e.target.value)}
                            placeholder="https://www.army.edu/the-page-using-these-cards"
                            className={`${inputCls} font-mono`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">Description / notes</label>
                          <textarea
                            value={detailDesc}
                            onChange={e => setDetailDesc(e.target.value)}
                            placeholder="Where/why this collection is used (optional)"
                            rows={2}
                            className={`${inputCls} resize-y`}
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSaveDetails(selectedColl)}
                            className="px-2.5 py-1 rounded border border-gray-300 text-gray-600 text-[11px] font-medium hover:bg-gray-50"
                          >
                            Save details
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpen(selectedColl)}
                          className="px-2.5 py-1 rounded border border-blue-300 text-blue-700 text-[11px] font-medium hover:bg-blue-100"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloneCollection(selectedColl)}
                          className="px-2.5 py-1 rounded border border-gray-300 text-gray-600 text-[11px] font-medium hover:bg-gray-50"
                        >
                          Clone
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCollection(selectedColl)}
                          className="ml-auto px-2.5 py-1 rounded border border-red-200 text-red-500 text-[11px] font-medium hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 py-12 text-center">
                      Select a collection on the left to preview it. Double-click to open.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Save As dialog (name + optional site metadata → new collection) ── */}
      {saveAsOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-start justify-center p-4 overflow-auto"
          onClick={() => setSaveAsOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mt-16" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">Save As a new collection</h2>
              <button
                type="button"
                onClick={() => setSaveAsOpen(false)}
                aria-label="Close"
                className="text-sm px-2 py-0.5 rounded text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  autoFocus
                  value={saveAsName}
                  onChange={e => setSaveAsName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitSaveAs()
                  }}
                  placeholder="Collection name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Used at (URL) — optional</label>
                <input
                  type="text"
                  value={saveAsUrl}
                  onChange={e => setSaveAsUrl(e.target.value)}
                  placeholder="https://www.army.edu/the-page-using-these-cards"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Description / notes — optional</label>
                <textarea
                  value={saveAsDesc}
                  onChange={e => setSaveAsDesc(e.target.value)}
                  placeholder="Where/why this collection is used"
                  rows={2}
                  className={`${inputCls} resize-y`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSaveAsOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitSaveAs}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Import modal ── */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-auto"
          onClick={() => setImportOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mt-12" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">Import from generated HTML</h2>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                aria-label="Close"
                className="text-sm px-2 py-0.5 rounded text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {importSummary ? (
              // Confirmation screen: shown after a note-worthy import (e.g. colors defaulted).
              <div className="px-4 py-3 space-y-3">
                <p className="text-sm text-gray-700">{importSummary}</p>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setImportOpen(false)
                      setImportText('')
                      setImportSummary(null)
                      setImportError(null)
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs text-gray-500">
                  Paste a card block this tool generated to recover its editable fields. A partial paste (just the
                  markup, no <code className="text-[11px]">&lt;style&gt;</code>) works too — colors then fall back to defaults.
                </p>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  onPaste={e => {
                    const text = e.clipboardData.getData('text')
                    if (!text.trim()) return
                    e.preventDefault()
                    setImportText(text) // box reflects the paste (useful if it fails to parse)
                    attemptImport(text)
                  }}
                  placeholder="Paste the generated HTML here…"
                  rows={8}
                  className={`${inputCls} font-mono resize-y`}
                />
                {importError && <p className="text-xs text-red-600">{importError}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setImportText('')
                      setImportError(null)
                    }}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => attemptImport(importText)}
                    disabled={!importText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Load cards
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>{/* ── END editor row ── */}
    </>
  )
}
