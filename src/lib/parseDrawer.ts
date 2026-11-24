// Best-effort importer for the Drawer: recover the editable fields from a block this
// tool generated — or a partial paste (just the markup, no <style>), or markup copied
// from a rendered page. DOM-aware (DOMParser), so it lives apart from the pure
// drawer.ts, mirroring parseCards.ts.
//
// Only the current generator's output is targeted. Every setting degrades to its
// default independently; null means no drawer markup was recognizable at all.

import {
  DEFAULT_TAB_COLOR,
  DEFAULT_TAB_TEXT_COLOR,
  DEFAULT_BORDER_COLOR,
  DEFAULT_PANEL_COLOR,
  DEFAULT_LINK_COLOR,
  DEFAULT_TAB_WIDTH_REM,
  DEFAULT_PANEL_WIDTH_REM,
  DEFAULT_VPOS_PERCENT,
  type GenerateDrawerInput,
} from './drawer'
import { safeColor } from './sanitize'

export interface DrawerImport {
  input: GenerateDrawerInput
  // Whether the paste carried the generated <style> block. Without it, colors,
  // vertical position, and widths fell back to defaults.
  hasStyle: boolean
}

// A CSS custom property's value. Anchored on the `:` so `--au-tab` never matches
// `--au-tab-ink` / `--au-tab-w`.
function cssVar(css: string, name: string): string | undefined {
  const m = css.match(new RegExp('--' + name + '\\s*:\\s*([^;}]+)'))
  return m ? m[1].trim() : undefined
}

function num(v: string | undefined): number | undefined {
  if (v == null) return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

// The body of the first rule whose selector is exactly `selector` (dynamic rules are
// emitted after the static ones, but each selector below only appears once in a
// generated block with the property we look for).
function ruleBody(css: string, selector: string): string | undefined {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('(?:^|[}\\s])' + esc + '\\s*\\{([^}]*)\\}', 'g')
  // Prefer the last match: the dynamic block comes after the static CSS.
  let body: string | undefined
  for (const m of css.matchAll(re)) body = m[1]
  return body
}

export function parseDrawerHtml(html: string): DrawerImport | null {
  if (typeof DOMParser === 'undefined') return null
  if (!/au-drawer/.test(html)) return null

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tab = doc.querySelector('.au-drawer__tab')
  const list = doc.querySelector('.au-drawer__list')
  if (!tab && !list) return null

  // Label: the tab's text span, else the aria-label minus its " menu" suffix.
  const labelEl = doc.querySelector('.au-drawer__text')
  let label = (labelEl?.textContent ?? '').trim()
  if (!label) label = (tab?.getAttribute('aria-label') ?? '').replace(/\s*menu$/i, '').trim()

  const links = Array.from(doc.querySelectorAll('.au-drawer__list a'))
    .map(a => ({ href: (a.getAttribute('href') ?? '').trim(), text: (a.textContent ?? '').trim() }))
    .filter(l => l.href !== '' || l.text !== '')

  const styles = Array.from(doc.querySelectorAll('style'))
  const hasStyle = styles.length > 0
  const css = styles.map(s => s.textContent ?? '').join('\n')

  const color = (name: string, fallback: string) => safeColor(cssVar(css, name) ?? '', fallback)

  // Vertical position: the dynamic `.au-drawer__cb { top: X%; }` rule.
  const cbRule = ruleBody(css, '.au-drawer__cb') ?? ''
  const vpos = num((cbRule.match(/top:\s*([\d.]+)%/) || [])[1])

  // Panel width: fixed mode emits --au-panel-w; auto uses max-content. An optional
  // max-width lives in the dynamic `.au-drawer__panel { … }` rule.
  const panelW = num(cssVar(css, 'au-panel-w'))
  const panelRule = ruleBody(css, '.au-drawer__panel') ?? ''
  const maxW = num((panelRule.match(/max-width:\s*([\d.]+)rem/) || [])[1])

  return {
    hasStyle,
    input: {
      label,
      links,
      tabColor: color('au-tab', DEFAULT_TAB_COLOR),
      tabTextColor: color('au-tab-ink', DEFAULT_TAB_TEXT_COLOR),
      borderColor: color('au-border', DEFAULT_BORDER_COLOR),
      panelColor: color('au-panel', DEFAULT_PANEL_COLOR),
      linkColor: color('au-link', DEFAULT_LINK_COLOR),
      vposPercent: vpos ?? DEFAULT_VPOS_PERCENT,
      tabWidthRem: num(cssVar(css, 'au-tab-w')) ?? DEFAULT_TAB_WIDTH_REM,
      panelWidthMode: panelW != null ? 'fixed' : 'auto',
      panelWidthRem: panelW ?? DEFAULT_PANEL_WIDTH_REM,
      panelMaxWidthRem: maxW ?? null,
    },
  }
}
