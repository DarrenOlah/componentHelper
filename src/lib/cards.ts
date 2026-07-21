// Pure helpers driving componentHelper's Card Helper input → output contract.
// Kept free of React/DOM so they can be unit-tested with literal inputs (mirrors
// drawer.ts). The visual source of truth for the card CSS is demo/cards/cards.html.

import { HELPER_URL } from './config'
import { escapeHtmlAttr, escapeHtmlText, safeHref, safeColor, safeImageSrc, sanitizeIconClass } from './sanitize'
import { previewFontFaceCss } from './previewFonts'
import {
  iconCardCss,
  calloutCardCss,
  hoverCardCss,
  logoCardCss,
  lockupCardCss,
  cardGridCss,
  PREVIEW_BOOTSTRAP_GRID_CSS,
  PREVIEW_SIM_CSS,
  type CardCssVars,
} from '../templates/cardsCss'

export type CardType = 'icon' | 'callout' | 'hover' | 'logo' | 'lockup'

// Icon source for the icon/logo cards: a Font Awesome glyph or an image. The live
// site already loads FA Free 6.4.2, so FA mode emits only class-based <i> markup
// (no FA CSS / @font-face ships in the output). Other card types ignore this.
export const ICON_MODES = ['image', 'fa'] as const
export type CardIconMode = (typeof ICON_MODES)[number]

// One card's editable content. Each markup builder reads only the fields its type
// uses (callout ignores heading/body; only hover/icon use them).
export interface CardContent {
  imageSrc: string // icon: the square icon; callout/hover: the cover photo
  imageAlt: string
  // icon/logo only: 'fa' renders a Font Awesome <i> from iconClass instead of the
  // image; 'image' renders <img> from imageSrc. Both values are retained across
  // toggles so switching modes never discards what the user typed.
  iconMode: CardIconMode
  iconClass: string // FA classes when iconMode==='fa', e.g. "fa-solid fa-house"
  heading: string // icon __title only (omitted when blank)
  body: string // icon __text, hover __desc (omitted when blank)
  buttonText: string // icon/callout __btn, hover __title (gold band)
  ctaText: string // hover __cta only (the revealed link)
  buttonHref: string
  // external → emit target="_blank" rel="noopener"; also suppresses the UI's
  // make-root-relative hint (a deliberate external link keeps its full origin).
  external: boolean
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
// under-filled line is centered instead of flush-left; 'stretch' grows the cards on
// an under-filled line (via flex-grow in cardGridCss) so they fill the full width.
// Full lines are unaffected in every mode.
export type CardAlign = 'left' | 'center' | 'stretch'

// Cards per row at the widest (desktop) breakpoint. 1-up is a single column at
// every width; 5-up graduates 1 → 2 → 5 like 3-up/4-up do.
export type CardsPerRow = 1 | 2 | 3 | 4 | 5

// Optional fixed aspect ratio for the cover-photo cards (callout/hover). 'auto'
// keeps the legacy fixed-height crop (min-height: 250px + object-fit: cover); any
// other preset gives the card an `aspect-ratio` so its height tracks its width —
// so a full-width 1-up landscape photo can show whole instead of being cropped.
// Icon cards ignore it (their image is a fixed 90px square, not a cover photo).
export const IMAGE_ASPECTS = ['auto', '1:1', '5:4', '4:3', '3:2', '16:9', '21:9'] as const
export type CardImageAspect = (typeof IMAGE_ASPECTS)[number]
// Fixed allowlist → fixed CSS values: safe to interpolate into <style> (the value
// is never user free-text, only one of these keys chosen in the UI). 21:9 is the
// ultrawide "cinematic" banner — wider/shorter than 16:9 — kept as an integer pair
// so the importer's `w / h` round-trip regex still recovers it.
const ASPECT_CSS: Record<CardImageAspect, string> = {
  auto: '',
  '1:1': '1 / 1',
  '5:4': '5 / 4',
  '4:3': '4 / 3',
  '3:2': '3 / 2',
  '16:9': '16 / 9',
  '21:9': '21 / 9',
}

// How the logo card's icon fills its tile. 'contain' shows the whole logo (with
// padding, on the surface color — best for transparent/varied logos); 'cover' fills
// and crops to the tile's Image-shape box (best for square art / photos). Only the
// logo card reads it; the other types ignore it.
export const ICON_FITS = ['contain', 'cover'] as const
export type CardIconFit = (typeof ICON_FITS)[number]

// The background of the logo card's slide-up reveal panel. 'gradient' is the
// default dark-to-transparent overlay (the icon shows through behind the text);
// 'solid' fills the panel with the surface color (hides the icon, maximizing text
// contrast — best when an icon would make the revealed text hard to read). Only the
// logo card reads it; the other types ignore it.
export const REVEAL_FILLS = ['gradient', 'solid'] as const
export type CardRevealBg = (typeof REVEAL_FILLS)[number]

export interface GenerateCardsInput {
  type: CardType
  cardsPerRow: CardsPerRow
  // Defaults to 'auto' when omitted.
  imageAspect?: CardImageAspect
  // Defaults to 'contain' when omitted. Only the logo card reads it.
  iconFit?: CardIconFit
  // Defaults to 'gradient' when omitted. Only the logo card reads it.
  revealBg?: CardRevealBg
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
    iconMode: 'image',
    iconClass: '',
    heading: '',
    body: '',
    buttonText: '',
    ctaText: '',
    buttonHref: '',
    external: false,
  }
}

// Detect a fully-qualified http(s) URL and split it into its origin (for the UI
// hint) and a root-relative remainder (the rewrite the hint applies). Returns null
// for relative ('/Portals/…'), protocol-relative ('//cdn/…'), mailto:/tel:, or
// empty values — nothing to strip. Pure so the UI can call it per keystroke.
export function splitAbsoluteHref(raw: string): { origin: string; rootRelative: string } | null {
  const m = raw.trim().match(/^(https?:)\/\/([^/?#]+)(.*)$/i)
  if (!m) return null
  const [, scheme, host, rest] = m
  return {
    origin: `${scheme}//${host}`,
    rootRelative: rest.startsWith('/') ? rest : `/${rest}`,
  }
}

// True when href is a same-site (relative) link with no origin of its own:
// '/path', 'path', '#anchor', '?q'. Used to warn that marking such a link
// "external" (open in a new tab) is almost always a mistake — that only suits a
// full URL to another site. Scheme'd values (http:, mailto:, tel:, …) and
// protocol-relative '//host' point off-site, so they are NOT relative.
export function isRelativeHref(raw: string): boolean {
  const s = raw.trim()
  if (!s) return false // nothing entered yet — nothing to warn about
  if (s.startsWith('//')) return false // protocol-relative → cross-origin capable
  return !/^[a-z][a-z0-9+.-]*:/i.test(s) // no scheme → same-site
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

// The layout fields that feed scopeId — every input that changes the emitted CSS.
export interface ScopeLayout {
  cardsPerRow?: CardsPerRow
  imageAspect?: CardImageAspect
  iconFit?: CardIconFit
  revealBg?: CardRevealBg
  align?: CardAlign
}

// ---- Scope id: keeps blocks with different generated CSS from colliding ----
// Pure FNV-1a (32-bit) → base36 over the *sanitized* type + colors + every layout
// field that changes the emitted <style> (cardsPerRow, aspect, logo fit/bg, and the
// stretch row mode). Identical look AND layout → same id (two pasted blocks dedupe);
// any difference that alters the CSS → different id, so two blocks on one page can't
// clobber each other's scoped rules. Independent of card *content* (text/images).
// align left vs center is excluded: it only swaps a markup row class, not the CSS.
export function scopeId(type: CardType, colors: CardColors, layout?: ScopeLayout): string {
  const v = resolveColors(colors)
  // accentHover is derived from accent, so it's redundant in the key.
  const l = layout ?? {}
  const layoutKey = `${l.cardsPerRow ?? 3}|${l.imageAspect ?? 'auto'}|${l.iconFit ?? 'contain'}|${l.revealBg ?? 'gradient'}|${l.align === 'stretch' ? 's' : ''}`
  const key = `${type}|${v.accent}|${v.accentText}|${v.surface}|${v.text}|${layoutKey}`.toLowerCase()
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

// ---- Bootstrap column class for the chosen cards-per-row -------------------
// Graduated breakpoints: 1 col < md (768), 2 cols at md, full count at lg (992).
// 1-up stays a single column at every width (col-12 only). 2-up reaches its final
// count at md, so it has no col-lg-* class. 3/4-up carry their full count on a real
// col-lg-* class (12/3, 12/4 are integers, so the class is also a correct fallback).
// 5-up has no exact Bootstrap class, so it uses a custom au-col-5 hook sized by the
// scoped calc() override in cardGridCss (see LG_COL there).
const COLUMN_CLASSES: Record<CardsPerRow, string> = {
  1: 'col-12',
  2: 'col-12 col-md-6',
  3: 'col-12 col-md-6 col-lg-4',
  4: 'col-12 col-md-6 col-lg-3',
  5: 'col-12 col-md-6 au-col-5',
}
export function columnClass(cardsPerRow: CardsPerRow): string {
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
    // External links open in a new tab; rel="noopener" severs window.opener access.
    linkAttrs: card.external ? ' target="_blank" rel="noopener"' : '',
  }
}

// The icon box for the icon/logo cards: an FA <i> (decorative, aria-hidden — the
// card's accessible name comes from its button/title link) or the <img>. The FA
// glyph lives in a <span> that keeps the instance __icon class, so the shared box
// CSS still applies and the importer's [class*="__icon"] selector still matches.
// Branches on iconMode (not emptiness); the && guard falls back to the image if FA
// mode somehow has no valid class. No FA CSS ships — the live site provides it.
// Escape a multi-line string to HTML, turning newlines into XHTML <br /> so the
// lockup name keeps its hand-authored line breaks (e.g. "Army\nUniversity\nPress").
// Each line is escaped as text; only the line breaks become markup.
function escapeMultiline(text: string): string {
  return text.split(/\r?\n/).map(escapeHtmlText).join('<br />')
}

function cardIconMarkup(inst: string, card: CardContent, src: string, alt: string): string {
  const fa = sanitizeIconClass(card.iconClass)
  if (card.iconMode === 'fa' && fa) {
    return `          <span class="${inst}__icon ${inst}__icon--fa"><i class="${fa}" aria-hidden="true"></i></span>`
  }
  return `          <img class="${inst}__icon" src="${src}" alt="${alt}" />`
}

function iconCardMarkup(inst: string, card: CardContent): string {
  const { src, alt, href, heading, body, label, linkAttrs } = commonFields(card)
  return [
    cardIconMarkup(inst, card, src, alt),
    ...(heading ? [`          <h3 class="${inst}__title">${escapeHtmlText(heading)}</h3>`] : []),
    ...(body ? [`          <p class="${inst}__text">${escapeHtmlText(body)}</p>`] : []),
    `          <a class="${inst}__btn" href="${href}"${linkAttrs}>${label}</a>`,
  ].join('\n')
}

function calloutCardMarkup(inst: string, card: CardContent): string {
  const { src, alt, href, label, linkAttrs } = commonFields(card)
  return [
    `          <img class="${inst}__img" src="${src}" alt="${alt}" />`,
    `          <a class="${inst}__btn" href="${href}"${linkAttrs}>${label}</a>`,
  ].join('\n')
}

function hoverCardMarkup(inst: string, card: CardContent): string {
  const { src, alt, href, body, label, linkAttrs } = commonFields(card)
  // The gold band (button text) is the card's single stretched link: it's required,
  // so the <a> is never empty (DNN strips empty elements). The CTA is optional and
  // simply omitted when blank — it's no longer the click target, just non-anchor
  // text inside the card-wide clickable overlay.
  const cta = card.ctaText.trim()
  return [
    `          <img class="${inst}__img" src="${src}" alt="${alt}" />`,
    `          <div class="${inst}__box">`,
    `            <h3 class="${inst}__title"><a class="${inst}__title-link" href="${href}"${linkAttrs}>${label}</a></h3>`,
    ...(body ? [`            <span class="${inst}__desc">${escapeHtmlText(body)}</span>`] : []),
    ...(cta ? [`            <span class="${inst}__cta">${escapeHtmlText(cta)}</span>`] : []),
    `          </div>`,
  ].join('\n')
}

function logoCardMarkup(inst: string, card: CardContent): string {
  const { src, alt, href, body, label, linkAttrs } = commonFields(card)
  // The icon sits in a __media layer that reserves the band's height (CSS), so it
  // centers above the band. The gold band (__title-link) is the required stretched
  // link. A tile reveals on hover only when it has body or CTA content: the markup
  // tags the box with __box--reveal so the (shared) slide rules apply to it alone —
  // a plain icon tile keeps a static band.
  const cta = card.ctaText.trim()
  const revealable = !!(body || cta)
  const boxCls = revealable ? `${inst}__box ${inst}__box--reveal` : `${inst}__box`
  return [
    `          <div class="${inst}__media">${cardIconMarkup(inst, card, src, alt).trimStart()}</div>`,
    `          <div class="${boxCls}">`,
    `            <h3 class="${inst}__title"><a class="${inst}__title-link" href="${href}"${linkAttrs}>${label}</a></h3>`,
    ...(body ? [`            <span class="${inst}__desc">${escapeHtmlText(body)}</span>`] : []),
    ...(cta ? [`            <span class="${inst}__cta">${escapeHtmlText(cta)}</span>`] : []),
    `          </div>`,
  ].join('\n')
}

// Lockup: a horizontal logo · divider · multi-line name, all one link. Reuses the
// shared icon box (image or FA glyph). The name's <a> is the stretched link (its
// ::after overlay covers the whole card), and its text is the card's accessible name —
// so the name is required (no "Learn more" fallback; the UI enforces it). Body, button
// text, and CTA are unused by this type.
function lockupCardMarkup(inst: string, card: CardContent): string {
  const { src, alt, href, heading, linkAttrs } = commonFields(card)
  return [
    cardIconMarkup(inst, card, src, alt),
    `          <span class="${inst}__divider" aria-hidden="true"></span>`,
    `          <a class="${inst}__title-link" href="${href}"${linkAttrs}><span class="${inst}__title">${escapeMultiline(heading)}</span></a>`,
  ].join('\n')
}

const CSS_BUILDERS: Record<
  CardType,
  (inst: string, v: CardCssVars, opts?: { revealable?: boolean; fit?: CardIconFit; bg?: CardRevealBg }) => string
> = {
  icon: iconCardCss,
  callout: calloutCardCss,
  hover: hoverCardCss,
  logo: logoCardCss,
  lockup: lockupCardCss,
}
const MARKUP: Record<CardType, (inst: string, card: CardContent) => string> = {
  icon: iconCardMarkup,
  callout: calloutCardMarkup,
  hover: hoverCardMarkup,
  logo: logoCardMarkup,
  lockup: lockupCardMarkup,
}

// Full <style> + Bootstrap-grid markup to paste into a DNN Text/HTML module.
export function generateCardsHtml(input: GenerateCardsInput, opts: RenderOptions = {}): string {
  const v = resolveColors(input.colors)
  const id =
    input.instanceId ??
    scopeId(input.type, input.colors, {
      cardsPerRow: input.cardsPerRow,
      imageAspect: input.imageAspect,
      iconFit: input.iconFit,
      revealBg: input.revealBg,
      align: input.align,
    })
  const base = `au-${input.type}-card`
  const inst = `${base}--${id}`
  // Grid wrapper class scopes the flush, gap-based layout override to this block's
  // container/row only, never the host page's other Bootstrap rows.
  const gridClass = `${inst}-grid`
  // Optional fixed aspect ratio for the cover-photo cards: a later, same-specificity
  // rule that only adds `aspect-ratio`, so the card's height tracks its width while
  // min-height stays a small-width floor. Never emitted for icon cards or 'auto'.
  const hasCoverPhoto = input.type === 'callout' || input.type === 'hover' || input.type === 'logo'
  const ar = hasCoverPhoto ? ASPECT_CSS[input.imageAspect ?? 'auto'] : ''
  const aspectRule = ar ? `\n  .${inst} { aspect-ratio: ${ar}; }` : ''
  const css = `${CSS_BUILDERS[input.type](inst, v, { revealable: !!opts.revealHover, fit: input.iconFit ?? 'contain', bg: input.revealBg ?? 'gradient' })}
  ${cardGridCss(gridClass, input.cardsPerRow, input.align === 'stretch')}${aspectRule}`
  const cols = columnClass(input.cardsPerRow)
  // center adds .justify-content-center; left and stretch both use a plain row (stretch
  // fills the last line via flex-grow in cardGridCss, not a row-class change).
  const rowClass = input.align === 'center' ? 'row justify-content-center' : 'row'
  // Preview-only open state for the reveal cards (hover/logo) (never on the copy path).
  const openClass = opts.revealHover && (input.type === 'hover' || input.type === 'logo') ? ` ${inst}--open` : ''

  const cards = input.cards
    .map(
      c => `      <div class="${cols} d-flex">
        <div class="${base} ${inst}${openClass}">
${MARKUP[input.type](inst, c)}
        </div>
      </div>`,
    )
    .join('\n')

  return `<!-- Generated by componentHelper v${__APP_VERSION__} — ${HELPER_URL}#/cards -->
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
<link rel="stylesheet" href="${import.meta.env.BASE_URL}fontawesome/css/all.min.css" />
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
  cardsPerRow: CardsPerRow
  imageAspect: CardImageAspect
  iconFit: CardIconFit
  revealBg: CardRevealBg
  align: CardAlign
  accent: string
  accentText: string
  surface: string
  text: string
  cards: CardContent[]
}

const CARD_TYPES: readonly CardType[] = ['icon', 'callout', 'hover', 'logo', 'lockup']
const CARD_ALIGNS: readonly CardAlign[] = ['left', 'center', 'stretch']
const PREVIEW_CONTEXTS: readonly PreviewContext[] = ['none', 'left', 'both']
const PER_ROW_VALUES: readonly CardsPerRow[] = [1, 2, 3, 4, 5]

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
    iconMode: oneOf(raw.iconMode, ICON_MODES, d.iconMode),
    // Sanitize at coerce time too, so a hand-edited/stale blob can't carry a junk
    // class through to generation (defense in depth alongside the markup builder).
    iconClass: sanitizeIconClass(str(raw.iconClass, d.iconClass)),
    heading: str(raw.heading, d.heading),
    body: str(raw.body, d.body),
    buttonText: str(raw.buttonText, d.buttonText),
    ctaText: str(raw.ctaText, d.ctaText),
    buttonHref: str(raw.buttonHref, d.buttonHref),
    external: typeof raw.external === 'boolean' ? raw.external : d.external,
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
    imageAspect: oneOf(raw.imageAspect, IMAGE_ASPECTS, 'auto'),
    iconFit: oneOf(raw.iconFit, ICON_FITS, 'contain'),
    revealBg: oneOf(raw.revealBg, REVEAL_FILLS, 'gradient'),
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
    imageAspect: snap.imageAspect,
    iconFit: snap.iconFit,
    revealBg: snap.revealBg,
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
    a.imageAspect !== b.imageAspect ||
    a.iconFit !== b.iconFit ||
    a.revealBg !== b.revealBg ||
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
      c.iconMode === o.iconMode &&
      c.iconClass === o.iconClass &&
      c.heading === o.heading &&
      c.body === o.body &&
      c.buttonText === o.buttonText &&
      c.ctaText === o.ctaText &&
      c.buttonHref === o.buttonHref &&
      c.external === o.external
    )
  })
}
