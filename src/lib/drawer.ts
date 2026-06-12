// Pure helpers driving componentHelper's Drawer input → output contract.
// Kept free of React/DOM so they can be unit-tested with literal inputs.

import { DRAWER_STATIC_CSS } from '../templates/drawerCss'
import { HELPER_URL } from './config'

export type VPos = 'top' | 'middle' | 'bottom'
export type PanelWidthMode = 'auto' | 'fixed'

export interface DrawerLinkInput {
  href: string
  text: string
}

export interface GenerateDrawerInput {
  label: string
  links: DrawerLinkInput[]
  tabColor: string
  inkColor: string
  vpos: VPos
  tabWidthRem: number
  panelWidthMode: PanelWidthMode
  panelWidthRem: number
  panelMaxWidthRem: number | null
}

// ---- Defaults (mirror the original demo) ----------------------------------
export const DEFAULT_TAB_COLOR = '#FFCC33'
export const DEFAULT_INK_COLOR = '#000000'
export const DEFAULT_TAB_WIDTH_REM = 2.5
export const DEFAULT_PANEL_WIDTH_REM = 16

// ---- HTML escaping (HTML context, NOT JS-string context) ------------------
// `&` must be replaced first so the entities we introduce aren't double-escaped.

// Attribute context: also escape the quote we wrap attributes in.
export function escapeHtmlAttr(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Text node context.
export function escapeHtmlText(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Allow only safe URL schemes; neutralize javascript:/data:/etc. to '#'.
// Scheme-less values (root-relative, anchors, relative paths) pass through.
const SAFE_SCHEMES = ['http', 'https', 'mailto', 'tel']
// Control chars (incl. tab/newline) can smuggle a scheme past the check below.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')
export function safeHref(raw: string): string {
  const stripped = raw.trim().replace(CONTROL_CHARS, '')
  if (!stripped) return ''
  const scheme = stripped.toLowerCase().match(/^([a-z][a-z0-9+.-]*):/)
  if (scheme) {
    return SAFE_SCHEMES.includes(scheme[1]) ? stripped : '#'
  }
  return stripped
}

// ---- CSS value sanitization (prevents injection into the <style> block) ---
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
function safeColor(raw: string, fallback: string): string {
  return HEX_COLOR.test(raw.trim()) ? raw.trim() : fallback
}

function clampRem(n: number, min: number, max: number, fallback: number): string {
  const v = Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback
  // Trim trailing zeros for tidy output (2.5 stays 2.5, 16 stays 16).
  return `${parseFloat(v.toFixed(3))}rem`
}

interface VPosCss {
  anchor: string
  closed: string
  open: string
}

// Top/bottom anchor to an edge and slide on X only; middle also keeps a -50%
// Y to stay centered. The X slide moves the flyout right by (its own width −
// tab width), leaving exactly the tab visible — independent of panel width,
// which is what lets the panel auto-fit its content.
const X_TRANSFORMS = {
  closed: 'translateX(calc(100% - var(--au-tab-w)))',
  open: 'translateX(0)',
}

function vposCss(vpos: VPos): VPosCss {
  switch (vpos) {
    case 'top':
      return { anchor: 'top: 0;', ...X_TRANSFORMS }
    case 'bottom':
      return { anchor: 'bottom: 0;', ...X_TRANSFORMS }
    case 'middle':
    default:
      return {
        anchor: 'top: 50%;',
        closed: 'translate(calc(100% - var(--au-tab-w)), -50%)',
        open: 'translate(0, -50%)',
      }
  }
}

// Generated CSS that depends on user input, appended after the static rules.
function buildDynamicCss(input: GenerateDrawerInput): string {
  const tab = safeColor(input.tabColor, DEFAULT_TAB_COLOR)
  const ink = safeColor(input.inkColor, DEFAULT_INK_COLOR)
  const tabW = clampRem(input.tabWidthRem, 1, 10, DEFAULT_TAB_WIDTH_REM)
  const { anchor, closed, open } = vposCss(input.vpos)

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
  --au-ink: ${ink};
  --au-tab-w: ${tabW};${panelVar}
}
.au-drawer__cb { ${anchor} }
.au-drawer__flyout {
  ${anchor}
  transform: ${closed};
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
export function generateDrawerHtml(input: GenerateDrawerInput): string {
  const label = input.label.trim()
  const linksHtml = buildLinksHtml(input.links)

  return `<!-- Generated by componentHelper v${__APP_VERSION__} — ${HELPER_URL} -->
<style>
${DRAWER_STATIC_CSS.trim()}

${buildDynamicCss(input)}
</style>

<div class="au-drawer" id="au-drawer">
  <input class="au-drawer__cb normalCheckBox" type="checkbox" id="au-drawer-cb" />
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
export function generateDrawerPreviewHtml(input: GenerateDrawerInput): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; height: 100%; background: #f1f5f9; font-family: system-ui, sans-serif; }
  .demo-hint { padding: 1rem; color: #64748b; font-size: 14px; max-width: 28rem; }
</style>
</head>
<body>
<p class="demo-hint">Click the tab on the right edge to open the drawer.</p>
${generateDrawerHtml(input)}
</body>
</html>`
}
