import { describe, it, expect } from 'vitest'
import {
  generateDrawerHtml,
  safeHref,
  escapeHtmlAttr,
  escapeHtmlText,
  vposAnchor,
  type GenerateDrawerInput,
} from './drawer'

const baseInput: GenerateDrawerInput = {
  label: 'Audiences',
  links: [
    { href: 'https://example.com/a', text: 'Alpha' },
    { href: 'https://example.com/b', text: 'Beta' },
  ],
  tabColor: '#FFCC33',
  tabTextColor: '#000000',
  borderColor: '#000000',
  panelColor: '#000000',
  linkColor: '#FFFFFF',
  vposPercent: 50,
  tabWidthRem: 2.5,
  panelWidthMode: 'auto',
  panelWidthRem: 16,
  panelMaxWidthRem: null,
}

function gen(overrides: Partial<GenerateDrawerInput> = {}): string {
  return generateDrawerHtml({ ...baseInput, ...overrides })
}

describe('escape helpers', () => {
  it('escapeHtmlAttr escapes & < > "', () => {
    expect(escapeHtmlAttr('a&b"c<d>e')).toBe('a&amp;b&quot;c&lt;d&gt;e')
  })

  it('escapeHtmlText escapes & < > but not "', () => {
    expect(escapeHtmlText('a&b"c<d>e')).toBe('a&amp;b"c&lt;d&gt;e')
  })

  it('replaces & first (no double-escaping)', () => {
    expect(escapeHtmlText('&amp;')).toBe('&amp;amp;')
  })
})

describe('safeHref', () => {
  it('passes http/https/mailto/tel', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com')
    expect(safeHref('http://example.com')).toBe('http://example.com')
    expect(safeHref('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeHref('tel:+15551234')).toBe('tel:+15551234')
  })

  it('passes scheme-less paths and anchors', () => {
    expect(safeHref('/Portals/0/page')).toBe('/Portals/0/page')
    expect(safeHref('#section')).toBe('#section')
    expect(safeHref('relative/path')).toBe('relative/path')
  })

  it('preserves hyphens in paths', () => {
    expect(safeHref('/homepage/298/current-students')).toBe('/homepage/298/current-students')
  })

  it('neutralizes javascript: and other schemes to #', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#')
    expect(safeHref('JaVaScRiPt:alert(1)')).toBe('#')
    expect(safeHref('data:text/html,<script>')).toBe('#')
    expect(safeHref('vbscript:msgbox')).toBe('#')
  })

  it('neutralizes schemes smuggled with control chars', () => {
    expect(safeHref('java\tscript:alert(1)')).toBe('#')
    expect(safeHref('java\nscript:alert(1)')).toBe('#')
  })
})

describe('generateDrawerHtml — escaping in output', () => {
  it('escapes special chars in href attribute', () => {
    const out = gen({ links: [{ href: 'https://x.com/?a=1&b=2', text: 'Q' }] })
    expect(out).toContain('href="https://x.com/?a=1&amp;b=2"')
  })

  it('escapes special chars in link text', () => {
    const out = gen({ links: [{ href: '/x', text: '<script>&"' }] })
    expect(out).toContain('&lt;script&gt;&amp;"')
    expect(out).not.toContain('<script>')
  })

  it('escapes the label in both text and aria-label', () => {
    const out = gen({ label: 'A & B' })
    expect(out).toContain('aria-label="A &amp; B menu"')
    expect(out).toContain('<span class="au-drawer__text">A &amp; B</span>')
  })

  it('drops a javascript: href to #', () => {
    const out = gen({ links: [{ href: 'javascript:alert(1)', text: 'Bad' }] })
    expect(out).toContain('href="#"')
    expect(out).not.toContain('javascript:')
  })
})

describe('generateDrawerHtml — link list', () => {
  it('renders one <li> per valid link, in order', () => {
    const out = gen()
    const items = out.match(/<li>/g) ?? []
    expect(items).toHaveLength(2)
    expect(out.indexOf('Alpha')).toBeLessThan(out.indexOf('Beta'))
  })

  it('filters out links missing href or text', () => {
    const out = gen({
      links: [
        { href: 'https://a.com', text: 'A' },
        { href: '', text: 'no href' },
        { href: 'https://b.com', text: '' },
        { href: '   ', text: '   ' },
      ],
    })
    const items = out.match(/<li>/g) ?? []
    expect(items).toHaveLength(1)
    expect(out).toContain('>A</a>')
  })
})

describe('generateDrawerHtml — panel width', () => {
  it('auto mode uses max-content and emits no --au-panel-w', () => {
    const out = gen({ panelWidthMode: 'auto' })
    expect(out).toContain('width: max-content;')
    expect(out).not.toContain('--au-panel-w')
  })

  it('fixed mode emits --au-panel-w and references it', () => {
    const out = gen({ panelWidthMode: 'fixed', panelWidthRem: 20 })
    expect(out).toContain('--au-panel-w: 20rem;')
    expect(out).toContain('width: var(--au-panel-w);')
  })

  it('max-width present when set, absent when null', () => {
    expect(gen({ panelMaxWidthRem: 30 })).toContain('max-width: 30rem;')
    expect(gen({ panelMaxWidthRem: null })).not.toContain('max-width:')
  })

  it('clamps out-of-range widths', () => {
    expect(gen({ panelWidthMode: 'fixed', panelWidthRem: 999 })).toContain('--au-panel-w: 40rem;')
    expect(gen({ tabWidthRem: 0 })).toContain('--au-tab-w: 1rem;')
  })
})

describe('generateDrawerHtml — vertical position', () => {
  it('centers the flyout on the percentage with -50% Y transforms', () => {
    const out = gen({ vposPercent: 50 })
    expect(out).toContain('top: 50%;')
    expect(out).toContain('transform: translate(calc(100% - var(--au-tab-w)), -50%);')
    expect(out).toContain('transform: translate(0, -50%);')
  })

  it('applies a custom percentage to both the checkbox and flyout', () => {
    const out = gen({ vposPercent: 33.33 })
    expect(out).toContain('.au-drawer__cb { top: 33.33%; }')
    expect(out).toContain('top: 33.33%;')
  })

  it('clamps the percentage to 0–100', () => {
    expect(gen({ vposPercent: 150 })).toContain('top: 100%;')
    expect(gen({ vposPercent: -10 })).toContain('top: 0%;')
  })

  it('edge-anchors to the top (Y 0) near the top edge', () => {
    const out = gen({ vposPercent: 5 })
    expect(out).toContain('top: 5%;')
    expect(out).toContain('transform: translate(calc(100% - var(--au-tab-w)), 0);')
    expect(out).toContain('transform: translate(0, 0);')
  })

  it('edge-anchors to the bottom (Y -100%) near the bottom edge', () => {
    const out = gen({ vposPercent: 95 })
    expect(out).toContain('top: 95%;')
    expect(out).toContain('transform: translate(calc(100% - var(--au-tab-w)), -100%);')
    expect(out).toContain('transform: translate(0, -100%);')
  })

  it('keeps centering (Y -50%) through the middle band', () => {
    expect(gen({ vposPercent: 33.33 })).toContain('transform: translate(0, -50%);')
    expect(gen({ vposPercent: 66.67 })).toContain('transform: translate(0, -50%);')
  })
})

describe('vposAnchor', () => {
  it('reports top / center / bottom by band', () => {
    expect(vposAnchor(0)).toBe('top')
    expect(vposAnchor(19)).toBe('top')
    expect(vposAnchor(19.5)).toBe('center')
    expect(vposAnchor(50)).toBe('center')
    expect(vposAnchor(80.5)).toBe('center')
    expect(vposAnchor(81)).toBe('bottom')
    expect(vposAnchor(100)).toBe('bottom')
  })

  it('treats out-of-range values as their clamped edge', () => {
    expect(vposAnchor(-10)).toBe('top')
    expect(vposAnchor(150)).toBe('bottom')
  })
})

describe('generateDrawerHtml — forceOpen (preview only)', () => {
  it('checks the toggle when forceOpen is set', () => {
    const out = generateDrawerHtml(baseInput, { forceOpen: true })
    expect(out).toContain('id="au-drawer-cb" checked="checked"')
  })

  it('leaves the toggle unchecked by default (copy output)', () => {
    expect(gen()).toContain('id="au-drawer-cb" />')
    expect(gen()).not.toContain('checked="checked"')
  })
})

describe('generateDrawerHtml — colors', () => {
  it('substitutes valid hex colors into decoupled vars', () => {
    const out = gen({
      tabColor: '#123abc',
      tabTextColor: '#fff',
      borderColor: '#111',
      panelColor: '#222',
      linkColor: '#abcdef',
    })
    expect(out).toContain('--au-tab: #123abc;')
    expect(out).toContain('--au-tab-ink: #fff;')
    expect(out).toContain('--au-border: #111;')
    expect(out).toContain('--au-panel: #222;')
    expect(out).toContain('--au-link: #abcdef;')
  })

  it('colors the carat to match the tab text color', () => {
    const out = gen({ tabTextColor: '#ffffff' })
    expect(out).toContain("stroke='%23ffffff'")
  })

  it('falls back on invalid color and does not inject raw value', () => {
    const out = gen({ tabColor: 'red; } body { display:none' })
    expect(out).toContain('--au-tab: #FFCC33;')
    expect(out).not.toContain('display:none')
  })
})

describe('generateDrawerHtml — DNN constraints & header', () => {
  it('omits the demo-only @font-face rules', () => {
    expect(gen()).not.toContain('@font-face')
  })

  it('keeps DNN survival markers', () => {
    const out = gen()
    expect(out).toContain('normalCheckBox')
    expect(out).toContain('id="au-drawer-cb"')
    expect(out).toContain('#au-drawer-cb:checked ~ #au-drawer-flyout')
    expect(out).toContain('data:image/svg+xml;utf8,')
    expect(out).toContain('<input class="au-drawer__cb normalCheckBox" type="checkbox" id="au-drawer-cb" />')
  })

  it('starts with the generated-by comment', () => {
    expect(gen().startsWith('<!-- Generated by componentHelper v')).toBe(true)
  })
})
