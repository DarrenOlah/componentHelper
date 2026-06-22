// Pure helpers driving componentHelper's Drawer input → output contract.
// Kept free of React/DOM so they can be unit-tested with literal inputs.

import { DRAWER_STATIC_CSS } from '../templates/drawerCss'
import { HELPER_URL } from './config'
import { escapeHtmlAttr, escapeHtmlText, safeHref, safeColor } from './sanitize'
import { previewFontFaceCss } from './previewFonts'

// Re-exported so existing importers (and drawer.test.ts) keep importing these
// from './drawer'. The definitions now live in './sanitize', shared with cards.
export { escapeHtmlAttr, escapeHtmlText, safeHref } from './sanitize'

export type PanelWidthMode = 'auto' | 'fixed'

export interface DrawerLinkInput {
  href: string
  text: string
}

export interface GenerateDrawerInput {
  label: string
  links: DrawerLinkInput[]
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

// Optional rendering tweaks that apply to the preview but never the copy output.
export interface RenderOptions {
  // Render the toggle checkbox as checked, so the panel previews open.
  forceOpen?: boolean
}

// ---- Defaults (mirror the original demo) ----------------------------------
export const DEFAULT_TAB_COLOR = '#FFCC33' // Army Gold background
export const DEFAULT_TAB_TEXT_COLOR = '#000000' // contrast ink on the gold tab
export const DEFAULT_BORDER_COLOR = '#000000'
export const DEFAULT_PANEL_COLOR = '#000000'
export const DEFAULT_LINK_COLOR = '#FFFFFF'
export const DEFAULT_TAB_WIDTH_REM = 2.5
export const DEFAULT_PANEL_WIDTH_REM = 16
export const DEFAULT_VPOS_PERCENT = 50

// ---- CSS value clamping (rem widths / percentages) ------------------------
function clampRem(n: number, min: number, max: number, fallback: number): string {
  const v = Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
  // Trim trailing zeros for tidy output (2.5 stays 2.5, 16 stays 16).
  return `${parseFloat(v.toFixed(3))}rem`
}

// Vertical position as a percentage of the viewport height (0–100). The flyout
// is centered on that point via a -50% Y offset, so 50% = middle, 33% = upper
// third, etc. We deliberately never pin flush to the exact top/bottom edge.
function clampPercent(n: number, fallback: number): number {
  const v = Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : fallback
  return parseFloat(v.toFixed(2))
}

// How the flyout is anchored to the chosen vertical point. In the middle band we
// center it (-50% Y). Within EDGE_BAND% of either edge we switch the anchor so
// the tab grows *inward* instead of being centered — that way it can never be
// clipped off the top or bottom of the viewport, on any screen size, with no JS
// and no need to know the tab's height. 'top' pins the flyout's top edge to the
// point; 'bottom' pins its bottom edge. See vposTranslateY for the Y offsets.
export const VPOS_EDGE_BAND = 19
export type VposAnchor = 'top' | 'center' | 'bottom'
export function vposAnchor(vposPercent: number): VposAnchor {
  const pct = clampPercent(vposPercent, DEFAULT_VPOS_PERCENT)
  if (pct <= VPOS_EDGE_BAND) return 'top'
  if (pct >= 100 - VPOS_EDGE_BAND) return 'bottom'
  return 'center'
}

// Y component of the flyout transform for each anchor. top → 0 (top edge at the
// point, grows down), center → -50% (centered), bottom → -100% (bottom edge at
// the point, grows up). The X component is unchanged across all three.
function vposTranslateY(anchor: VposAnchor): string {
  return anchor === 'top' ? '0' : anchor === 'bottom' ? '-100%' : '-50%'
}

// Left-pointing chevron carat as an SVG data URI, stroked in the given color.
// Lives in the dynamic block (not the static CSS) so it follows the tab text
// color — otherwise a black carat vanishes on a dark tab (e.g. Army Black).
function caratDataUri(strokeHex: string): string {
  const stroke = `%23${strokeHex.slice(1)}` // '#000' -> '%23000'
  return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='${stroke}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='10,3 5,8 10,13'/></svg>")`
}

// Generated CSS that depends on user input, appended after the static rules.
function buildDynamicCss(input: GenerateDrawerInput): string {
  const tab = safeColor(input.tabColor, DEFAULT_TAB_COLOR)
  const tabText = safeColor(input.tabTextColor, DEFAULT_TAB_TEXT_COLOR)
  const border = safeColor(input.borderColor, DEFAULT_BORDER_COLOR)
  const panel = safeColor(input.panelColor, DEFAULT_PANEL_COLOR)
  const link = safeColor(input.linkColor, DEFAULT_LINK_COLOR)
  const tabW = clampRem(input.tabWidthRem, 1, 10, DEFAULT_TAB_WIDTH_REM)
  const pct = clampPercent(input.vposPercent, DEFAULT_VPOS_PERCENT)
  // The X slide moves the flyout right by (its own width − tab width), leaving
  // exactly the tab visible — independent of panel width, which is what lets the
  // panel auto-fit its content. The Y component centers (-50%) the flyout on the
  // chosen percentage in the middle band, and edge-anchors it (0 / -100%) near
  // the top/bottom so the tab can't be clipped off-screen on short viewports.
  const tY = vposTranslateY(vposAnchor(input.vposPercent))
  const closed = `translate(calc(100% - var(--au-tab-w)), ${tY})`
  const open = `translate(0, ${tY})`

  const isFixed = input.panelWidthMode === 'fixed'
  const panelVar = isFixed
    ? `\n  --au-panel-w: ${clampRem(input.panelWidthRem, 4, 40, DEFAULT_PANEL_WIDTH_REM)};`
    : ''
  const panelWidth = isFixed ? 'var(--au-panel-w)' : 'max-content'
  const maxWidthDecl =
    input.panelMaxWidthRem != null
      ? `\n  max-width: ${clampRem(input.panelMaxWidthRem, 4, 60, 30)};`
      : ''

  return `.au-drawer {
  --au-tab: ${tab};
  --au-tab-ink: ${tabText};
  --au-border: ${border};
  --au-panel: ${panel};
  --au-link: ${link};
  --au-tab-w: ${tabW};${panelVar}
}
.au-drawer__cb { top: ${pct}%; }
.au-drawer__flyout {
  top: ${pct}%;
  transform: ${closed};
}
.au-drawer__tab::before {
  background-image: ${caratDataUri(tabText)};
}
.au-drawer__panel {
  width: ${panelWidth};${maxWidthDecl}
}
#au-drawer-cb:checked ~ #au-drawer-flyout {
  transform: ${open};
}`
}

function buildLinksHtml(links: DrawerLinkInput[]): string {
  return links
    .filter(l => l.href.trim() !== '' && l.text.trim() !== '')
    .map(l => `        <li><a href="${escapeHtmlAttr(safeHref(l.href))}">${escapeHtmlText(l.text.trim())}</a></li>`)
    .join('\n')
}

// Full <style> + markup snippet to paste into a DNN Text/HTML module.
export function generateDrawerHtml(input: GenerateDrawerInput, opts: RenderOptions = {}): string {
  const label = input.label.trim()
  const linksHtml = buildLinksHtml(input.links)
  // Preview-only: pre-check the toggle so the panel renders open. Never emitted
  // on the copy path (opts defaults to {}), keeping the pasted markup closed.
  const checkedAttr = opts.forceOpen ? ' checked="checked"' : ''

  return `<!-- Generated by componentHelper v${__APP_VERSION__} — ${HELPER_URL}#/drawer -->
<style>
${DRAWER_STATIC_CSS.trim()}

${buildDynamicCss(input)}
</style>

<div class="au-drawer" id="au-drawer">
  <input class="au-drawer__cb normalCheckBox" type="checkbox" id="au-drawer-cb"${checkedAttr} />
  <div class="au-drawer__flyout" id="au-drawer-flyout">
    <label class="au-drawer__tab" for="au-drawer-cb" aria-label="${escapeHtmlAttr(label)} menu">
      <span class="au-drawer__text">${escapeHtmlText(label)}</span>
    </label>
    <div class="au-drawer__panel">
      <ul class="au-drawer__list">
${linksHtml}
      </ul>
    </div>
  </div>
</div>`
}

// Wrap the snippet in a minimal full document for the sandboxed iframe preview.
// The drawer is position:fixed, so it must be contained in its own viewport.
export function generateDrawerPreviewHtml(input: GenerateDrawerInput, opts: RenderOptions = {}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  ${previewFontFaceCss()}
  html, body { margin: 0; height: 100%; background: #f1f5f9; font-family: system-ui, sans-serif; }
  .demo-hint { padding: 1rem; color: #64748b; font-size: 14px; max-width: 28rem; }
</style>
</head>
<body>
<p class="demo-hint">Click the tab on the right edge to open the drawer.</p>
${generateDrawerHtml(input, opts)}
</body>
</html>`
}
