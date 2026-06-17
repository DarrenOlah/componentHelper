// Pure helpers driving componentHelper's Card Helper input → output contract.
// Kept free of React/DOM so they can be unit-tested with literal inputs (mirrors
// drawer.ts). The visual source of truth for the card CSS is demo/cards/cards.html.

import { HELPER_URL } from './config'
import { escapeHtmlAttr, escapeHtmlText, safeHref, safeColor, safeImageSrc } from './sanitize'
import { previewFontFaceCss } from './previewFonts'
import {
  iconCardCss,
  calloutCardCss,
  hoverCardCss,
  cardGridCss,
  PREVIEW_BOOTSTRAP_GRID_CSS,
  PREVIEW_SIM_CSS,
  type CardCssVars,
} from '../templates/cardsCss'

export type CardType = 'icon' | 'callout' | 'hover'

// One card's editable content. Each markup builder reads only the fields its type
// uses (callout ignores heading/body; only hover/icon use them).
export interface CardContent {
  imageSrc: string // icon: the square icon; callout/hover: the cover photo
  imageAlt: string
  heading: string // icon __title only (omitted when blank)
  body: string // icon __text, hover __desc (omitted when blank)
  buttonText: string // icon/callout __btn, hover __title (gold band)
  ctaText: string // hover __cta only (the revealed link)
  buttonHref: string
}

// One color scheme for the whole row, mapped to the demo's --au-* custom props.
export interface CardColors {
  accent: string // --au-gold     (band / button background)
  accentText: string // --au-ink      (text on the gold band)
  surface: string // --au-surface  (card background / image fallback)
  text: string // --au-text      (heading + body color)
  // --au-gold-hover is derived (darkened accent), not user-supplied.
}

// Row alignment when a line isn't full (too few cards, or the last wrapped line).
// 'left' is Bootstrap's default; 'center' adds .justify-content-center so an
// under-filled line is centered instead of flush-left. Full lines are unaffected.
export type CardAlign = 'left' | 'center'

export interface GenerateCardsInput {
  type: CardType
  cardsPerRow: 2 | 3 | 4
  colors: CardColors
  cards: CardContent[]
  align?: CardAlign // defaults to 'left'
  instanceId?: string // override the derived scope id (testing / manual)
}

// Which host-page sidebar layout the preview simulates, so the cards render in a
// content pane of the real width: full container, 3-of-4 (left sidebar), or
// 2-of-4 (both sidebars). Preview only — never affects the copy output.
export type PreviewContext = 'none' | 'left' | 'both'

// Rendering tweaks that apply to the preview but never the copy output.
export interface RenderOptions {
  // Render the hover card in its revealed (open) state, so it previews open.
  revealHover?: boolean
  // Sidebar layout to simulate around the cards in the preview.
  context?: PreviewContext
}

// ---- Defaults -------------------------------------------------------------
// Hard cap on cards in one row/block (UI add-button + persisted-array clamp).
export const MAX_CARDS = 12

export const DEFAULT_CARD_COLORS: CardColors = {
  accent: '#FFCC33', // Army Gold
  accentText: '#000000',
  surface: '#000000',
  text: '#FFFFFF',
}

export function makeDefaultCard(): CardContent {
  return {
    imageSrc: '',
    imageAlt: '',
    heading: '',
    body: '',
    buttonText: '',
    ctaText: '',
    buttonHref: '',
  }
}

// ---- Color resolution -----------------------------------------------------
// Darken a sanitized hex (3- or 6-digit) per channel for the button hover shade.
// Generalizes the demo's hand-picked #FFCC33 → #e6b800 to any accent.
function darken(hex: string, factor = 0.88): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const num = parseInt(full, 16)
  const ch = (shift: number) => Math.round(((num >> shift) & 0xff) * factor)
  const to2 = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0')
  return `#${to2(ch(16))}${to2(ch(8))}${to2(ch(0))}`
}

function resolveColors(c: CardColors): CardCssVars {
  const accent = safeColor(c.accent, DEFAULT_CARD_COLORS.accent)
  return {
    accent,
    accentHover: darken(accent),
    accentText: safeColor(c.accentText, DEFAULT_CARD_COLORS.accentText),
    surface: safeColor(c.surface, DEFAULT_CARD_COLORS.surface),
    text: safeColor(c.text, DEFAULT_CARD_COLORS.text),
  }
}

// ---- Scope id: keeps differently-colored blocks from colliding ------------
// Pure FNV-1a (32-bit) → base36 over the *sanitized* type + colors. Identical
// look → same id (two pasted blocks dedupe); any color/type change → different id
// (full isolation). Independent of card *content* — only the look is hashed.
export function scopeId(type: CardType, colors: CardColors): string {
  const v = resolveColors(colors)
  // accentHover is derived from accent, so it's redundant in the key.
  const key = `${type}|${v.accent}|${v.accentText}|${v.surface}|${v.text}`.toLowerCase()
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

// ---- Bootstrap column class for the chosen cards-per-row -------------------
const COLUMN_CLASSES: Record<2 | 3 | 4, string> = {
  2: 'col-12 col-sm-6 col-md-6',
  3: 'col-12 col-sm-6 col-md-4',
  4: 'col-12 col-sm-6 col-md-3',
}
export function columnClass(cardsPerRow: 2 | 3 | 4): string {
  return COLUMN_CLASSES[cardsPerRow] ?? COLUMN_CLASSES[3]
}

// ---- Per-type markup builders (return the inner card HTML) -----------------
// Discipline mirrors drawer's buildLinksHtml: safeImageSrc/safeHref then escape;
// self-closed <img/> for XHTML; optional <h3>/<p> omitted when blank.
function commonFields(card: CardContent) {
  return {
    src: escapeHtmlAttr(safeImageSrc(card.imageSrc)),
    alt: escapeHtmlAttr(card.imageAlt),
    href: escapeHtmlAttr(safeHref(card.buttonHref)),
    heading: card.heading.trim(),
    body: card.body.trim(),
    // Never emit an empty (a11y-invalid) link label on a whole-card click target.
    label: escapeHtmlText(card.buttonText.trim() || 'Learn more'),
  }
}

function iconCardMarkup(inst: string, card: CardContent): string {
  const { src, alt, href, heading, body, label } = commonFields(card)
  return [
    `          <img class="${inst}__icon" src="${src}" alt="${alt}" />`,
    ...(heading ? [`          <h3 class="${inst}__title">${escapeHtmlText(heading)}</h3>`] : []),
    ...(body ? [`          <p class="${inst}__text">${escapeHtmlText(body)}</p>`] : []),
    `          <a class="${inst}__btn" href="${href}">${label}</a>`,
  ].join('\n')
}

function calloutCardMarkup(inst: string, card: CardContent): string {
  const { src, alt, href, label } = commonFields(card)
  return [
    `          <img class="${inst}__img" src="${src}" alt="${alt}" />`,
    `          <a class="${inst}__btn" href="${href}">${label}</a>`,
  ].join('\n')
}

function hoverCardMarkup(inst: string, card: CardContent): string {
  const { src, alt, href, body, label } = commonFields(card)
  // The gold band (button text) is the card's single stretched link: it's required,
  // so the <a> is never empty (DNN strips empty elements). The CTA is optional and
  // simply omitted when blank — it's no longer the click target, just non-anchor
  // text inside the card-wide clickable overlay.
  const cta = card.ctaText.trim()
  return [
    `          <img class="${inst}__img" src="${src}" alt="${alt}" />`,
    `          <div class="${inst}__box">`,
    `            <h3 class="${inst}__title"><a class="${inst}__title-link" href="${href}">${label}</a></h3>`,
    ...(body ? [`            <span class="${inst}__desc">${escapeHtmlText(body)}</span>`] : []),
    ...(cta ? [`            <span class="${inst}__cta">${escapeHtmlText(cta)}</span>`] : []),
    `          </div>`,
  ].join('\n')
}

const CSS_BUILDERS: Record<CardType, (inst: string, v: CardCssVars, opts?: { revealable?: boolean }) => string> = {
  icon: iconCardCss,
  callout: calloutCardCss,
  hover: hoverCardCss,
}
const MARKUP: Record<CardType, (inst: string, card: CardContent) => string> = {
  icon: iconCardMarkup,
  callout: calloutCardMarkup,
  hover: hoverCardMarkup,
}

// Full <style> + Bootstrap-grid markup to paste into a DNN Text/HTML module.
export function generateCardsHtml(input: GenerateCardsInput, opts: RenderOptions = {}): string {
  const v = resolveColors(input.colors)
  const id = input.instanceId ?? scopeId(input.type, input.colors)
  const base = `au-${input.type}-card`
  const inst = `${base}--${id}`
  // Grid wrapper class scopes the flush, gap-based layout override to this block's
  // container/row only, never the host page's other Bootstrap rows.
  const gridClass = `${inst}-grid`
  const css = `${CSS_BUILDERS[input.type](inst, v, { revealable: !!opts.revealHover })}
  ${cardGridCss(gridClass, input.cardsPerRow)}`
  const cols = columnClass(input.cardsPerRow)
  const rowClass = input.align === 'center' ? 'row justify-content-center' : 'row'
  // Preview-only open state for the hover card (never on the copy path).
  const openClass = opts.revealHover && input.type === 'hover' ? ` ${inst}--open` : ''

  const cards = input.cards
    .map(
      c => `      <div class="${cols} d-flex">
        <div class="${base} ${inst}${openClass}">
${MARKUP[input.type](inst, c)}
        </div>
      </div>`,
    )
    .join('\n')

  return `<!-- Generated by componentHelper v${__APP_VERSION__} — ${HELPER_URL} -->
<style>
${css}
</style>

<div class="container-fluid ${gridClass}">
  <div class="${rowClass}">
${cards}
  </div>
</div>`
}

// Wrap the snippet in a full document for the sandboxed iframe preview. Injects
// the brand fonts, a minimal Bootstrap-4 grid, and a sidebar simulation (all preview
// only) so the live render matches the host theme; the copy output ships none of it.
// The doc is meant to render at a desktop canvas width and be scaled to fit — the
// content pane uses the real col-md fraction so a narrow pane stays cramped (not
// collapsed), matching Bootstrap's viewport-based breakpoints on the live page.
export function generateCardsPreviewHtml(input: GenerateCardsInput, opts: RenderOptions = {}): string {
  const ctx: PreviewContext = opts.context ?? 'none'
  const contentCol = ctx === 'both' ? 'col-12 col-md-6' : ctx === 'left' ? 'col-12 col-md-9' : 'col-12 col-md-12'
  const leftSide = ctx === 'left' || ctx === 'both' ? '      <div class="col-12 col-md-3 sim-side">Sidebar</div>\n' : ''
  const rightSide = ctx === 'both' ? '\n      <div class="col-12 col-md-3 sim-side">Sidebar</div>' : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  ${previewFontFaceCss()}
  ${PREVIEW_BOOTSTRAP_GRID_CSS}
  ${PREVIEW_SIM_CSS}
  html, body { margin: 0; background: #f1f5f9; font-family: system-ui, sans-serif; }
  body { padding: 16px 0; box-sizing: border-box; }
</style>
</head>
<body>
  <div class="sim-page">
    <div class="row">
${leftSide}      <div class="${contentCol}">
${generateCardsHtml(input, { revealHover: opts.revealHover })}
      </div>${rightSide}
    </div>
  </div>
</body>
</html>`
}

// ---- Persistence: validation / coercion -----------------------------------
// localStorage I/O lives in the component (keeps this module DOM-free); these pure
// helpers validate whatever was parsed out of it, so a hand-edited or stale blob can
// never crash the tool — every field falls back to a safe default.

// The editable card state minus the component's render-only `id`s: the unit both the
// autosave draft and a saved collection store. Mirrors CardsState in CardsTool.
export interface CardsSnapshot {
  type: CardType
  cardsPerRow: 2 | 3 | 4
  align: CardAlign
  accent: string
  accentText: string
  surface: string
  text: string
  cards: CardContent[]
}

const CARD_TYPES: readonly CardType[] = ['icon', 'callout', 'hover']
const CARD_ALIGNS: readonly CardAlign[] = ['left', 'center']
const PREVIEW_CONTEXTS: readonly PreviewContext[] = ['none', 'left', 'both']
const PER_ROW_VALUES: readonly (2 | 3 | 4)[] = [2, 3, 4]

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}
function str(x: unknown, fallback = ''): string {
  return typeof x === 'string' ? x : fallback
}
function oneOf<T>(x: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(x as T) ? (x as T) : fallback
}

// Normalize one card's content: keep string fields, drop anything else (incl. a
// stored `id` — the component re-keys cards on load), fill gaps from the default.
function coerceCardContent(raw: unknown): CardContent {
  const d = makeDefaultCard()
  if (!isObj(raw)) return d
  return {
    imageSrc: str(raw.imageSrc, d.imageSrc),
    imageAlt: str(raw.imageAlt, d.imageAlt),
    heading: str(raw.heading, d.heading),
    body: str(raw.body, d.body),
    buttonText: str(raw.buttonText, d.buttonText),
    ctaText: str(raw.ctaText, d.ctaText),
    buttonHref: str(raw.buttonHref, d.buttonHref),
  }
}

// Validate a settings+cards snapshot. Returns null only when `cards` is absent/not an
// array (i.e. not a recognizable snapshot); otherwise every field is coerced. Colors
// pass through as strings — resolveColors/safeColor sanitize them at generation time.
export function coerceSnapshot(raw: unknown): CardsSnapshot | null {
  if (!isObj(raw) || !Array.isArray(raw.cards)) return null
  return {
    type: oneOf(raw.type, CARD_TYPES, 'icon'),
    cardsPerRow: oneOf(raw.cardsPerRow, PER_ROW_VALUES, 3),
    align: oneOf(raw.align, CARD_ALIGNS, 'left'),
    accent: str(raw.accent, DEFAULT_CARD_COLORS.accent),
    accentText: str(raw.accentText, DEFAULT_CARD_COLORS.accentText),
    surface: str(raw.surface, DEFAULT_CARD_COLORS.surface),
    text: str(raw.text, DEFAULT_CARD_COLORS.text),
    cards: raw.cards.slice(0, MAX_CARDS).map(coerceCardContent),
  }
}

// The autosave draft envelope: the editable snapshot plus the two preview-only view
// toggles. Returns null when the snapshot is unrecognizable (caller uses defaults).
export interface PersistedCardsDraft {
  snapshot: CardsSnapshot
  revealHover: boolean
  previewContext: PreviewContext
  // The id of the open collection (if any), so a tool switch / reload restores the
  // open-file link, not just the cards. Null when editing an untitled draft.
  loadedId: string | null
}
export function coercePersistedCards(raw: unknown): PersistedCardsDraft | null {
  if (!isObj(raw)) return null
  const snapshot = coerceSnapshot(raw.state)
  if (!snapshot) return null
  return {
    snapshot,
    revealHover: typeof raw.revealHover === 'boolean' ? raw.revealHover : true,
    previewContext: oneOf(raw.previewContext, PREVIEW_CONTEXTS, 'left'),
    loadedId: typeof raw.loadedId === 'string' ? raw.loadedId : null,
  }
}

// A named, saved set of cards (browser-local library). `snapshot` is the editable
// state; `savedAt` is an epoch-ms stamp for display/sort. `url`/`description` are
// optional site metadata — a reminder of where the collection is used on the live
// site. They describe the collection, not the cards, so they're outside `snapshot`
// and never affect generated HTML. `previewContext` is the page layout the cards
// were designed for, so the collection reopens in the width it was built against.
export interface CardsCollection {
  id: string
  name: string
  savedAt: number
  snapshot: CardsSnapshot
  previewContext: PreviewContext
  url?: string
  description?: string
}
// Validate the stored collections array, dropping any entry that isn't a usable
// snapshot or is missing an id (app always writes one).
export function coerceCollections(raw: unknown): CardsCollection[] {
  if (!Array.isArray(raw)) return []
  const out: CardsCollection[] = []
  for (const item of raw) {
    if (!isObj(item)) continue
    const id = str(item.id)
    const snapshot = coerceSnapshot(item.snapshot)
    if (!id || !snapshot) continue
    out.push({
      id,
      name: str(item.name, 'Untitled'),
      savedAt: typeof item.savedAt === 'number' ? item.savedAt : 0,
      snapshot,
      previewContext: oneOf(item.previewContext, PREVIEW_CONTEXTS, 'left'),
      url: str(item.url),
      description: str(item.description),
    })
  }
  return out
}

// ---- Snapshot helpers (preview + unsaved-changes detection) ---------------

// Map a stored snapshot to generator input, so a saved collection can be previewed
// with generateCardsPreviewHtml without first loading it into the editor.
export function snapshotToGenInput(snap: CardsSnapshot): GenerateCardsInput {
  return {
    type: snap.type,
    cardsPerRow: snap.cardsPerRow,
    align: snap.align,
    colors: { accent: snap.accent, accentText: snap.accentText, surface: snap.surface, text: snap.text },
    cards: snap.cards.map(c => ({ ...c })),
  }
}

// Value-equality of two snapshots (settings + every card field), independent of key
// order. Powers the open-file `*` indicator: editor snapshot vs the open collection's.
export function snapshotsEqual(a: CardsSnapshot, b: CardsSnapshot): boolean {
  if (
    a.type !== b.type ||
    a.cardsPerRow !== b.cardsPerRow ||
    a.align !== b.align ||
    a.accent !== b.accent ||
    a.accentText !== b.accentText ||
    a.surface !== b.surface ||
    a.text !== b.text ||
    a.cards.length !== b.cards.length
  ) {
    return false
  }
  return a.cards.every((c, i) => {
    const o = b.cards[i]
    return (
      c.imageSrc === o.imageSrc &&
      c.imageAlt === o.imageAlt &&
      c.heading === o.heading &&
      c.body === o.body &&
      c.buttonText === o.buttonText &&
      c.ctaText === o.ctaText &&
      c.buttonHref === o.buttonHref
    )
  })
}
