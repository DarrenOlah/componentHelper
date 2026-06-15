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
  heading: string // icon __title, hover __title (omitted when blank)
  body: string // icon __text, hover __desc (omitted when blank)
  buttonText: string // icon/callout __btn, hover __cta
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

export interface GenerateCardsInput {
  type: CardType
  cardsPerRow: 2 | 3 | 4
  colors: CardColors
  cards: CardContent[]
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
    heading: 'Program name',
    body: 'A short supporting line of body copy goes here to describe this program or feature.',
    buttonText: 'Learn more',
    buttonHref: '#',
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
  const { src, alt, href, heading, body, label } = commonFields(card)
  return [
    `          <img class="${inst}__img" src="${src}" alt="${alt}" />`,
    `          <div class="${inst}__box">`,
    ...(heading ? [`            <h3 class="${inst}__title">${escapeHtmlText(heading)}</h3>`] : []),
    ...(body ? [`            <span class="${inst}__desc">${escapeHtmlText(body)}</span>`] : []),
    `            <a class="${inst}__cta" href="${href}">${label}</a>`,
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
  <div class="row">
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
