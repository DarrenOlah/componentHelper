import { describe, it, expect } from 'vitest'
import {
  generateCardsHtml,
  generateCardsPreviewHtml,
  scopeId,
  columnClass,
  type GenerateCardsInput,
} from './cards'
import { safeImageSrc, IMAGE_PLACEHOLDER } from './sanitize'

const baseInput: GenerateCardsInput = {
  type: 'icon',
  cardsPerRow: 3,
  colors: { accent: '#FFCC33', accentText: '#000000', surface: '#000000', text: '#FFFFFF' },
  cards: [
    { imageSrc: '/Portals/0/a.png', imageAlt: 'A', heading: 'Alpha', body: 'Body A', buttonText: 'Go A', buttonHref: 'https://example.com/a' },
    { imageSrc: '/Portals/0/b.png', imageAlt: 'B', heading: 'Beta', body: 'Body B', buttonText: 'Go B', buttonHref: 'https://example.com/b' },
  ],
}

function gen(overrides: Partial<GenerateCardsInput> = {}): string {
  return generateCardsHtml({ ...baseInput, ...overrides })
}

describe('safeImageSrc', () => {
  it('passes http/https and scheme-less/relative/portals/protocol-relative paths', () => {
    expect(safeImageSrc('https://cdn.x/y.png')).toBe('https://cdn.x/y.png')
    expect(safeImageSrc('http://cdn.x/y.png')).toBe('http://cdn.x/y.png')
    expect(safeImageSrc('/Portals/0/x.png')).toBe('/Portals/0/x.png')
    expect(safeImageSrc('relative/x.png')).toBe('relative/x.png')
    expect(safeImageSrc('//cdn.x/y.png')).toBe('//cdn.x/y.png')
  })

  it('passes data: URIs that are an image type', () => {
    expect(safeImageSrc("data:image/svg+xml,%3Csvg/%3E")).toBe("data:image/svg+xml,%3Csvg/%3E")
    expect(safeImageSrc('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=')
  })

  it('falls back to the placeholder for unsafe or empty values', () => {
    expect(safeImageSrc('')).toBe(IMAGE_PLACEHOLDER)
    expect(safeImageSrc('   ')).toBe(IMAGE_PLACEHOLDER)
    expect(safeImageSrc('javascript:alert(1)')).toBe(IMAGE_PLACEHOLDER)
    expect(safeImageSrc('data:text/html,<script>')).toBe(IMAGE_PLACEHOLDER)
    expect(safeImageSrc('vbscript:msgbox')).toBe(IMAGE_PLACEHOLDER)
    expect(safeImageSrc('file:///etc/passwd')).toBe(IMAGE_PLACEHOLDER)
    expect(safeImageSrc('java\tscript:alert(1)')).toBe(IMAGE_PLACEHOLDER)
  })
})

describe('generateCardsHtml — escaping in output', () => {
  it('escapes special chars in the button href', () => {
    const out = gen({ cards: [{ ...baseInput.cards[0], buttonHref: 'https://x.com/?a=1&b=2' }] })
    expect(out).toContain('href="https://x.com/?a=1&amp;b=2"')
  })

  it('escapes heading and body text', () => {
    const out = gen({ cards: [{ ...baseInput.cards[0], heading: '<script>', body: 'a & b' }] })
    expect(out).toContain('&lt;script&gt;')
    expect(out).toContain('a &amp; b')
    expect(out).not.toContain('<script>')
  })

  it('escapes the image alt (attribute context)', () => {
    const out = gen({ cards: [{ ...baseInput.cards[0], imageAlt: 'say "hi"' }] })
    expect(out).toContain('alt="say &quot;hi&quot;"')
  })

  it('drops a javascript: button href to #', () => {
    const out = gen({ cards: [{ ...baseInput.cards[0], buttonHref: 'javascript:alert(1)' }] })
    expect(out).toContain('href="#"')
    expect(out).not.toContain('javascript:')
  })

  it('defaults an empty button label to "Learn more"', () => {
    const out = gen({ cards: [{ ...baseInput.cards[0], buttonText: '   ' }] })
    expect(out).toContain('>Learn more</a>')
  })
})

describe('generateCardsHtml — colors', () => {
  it('substitutes valid hex into the scoped vars', () => {
    const out = gen({ colors: { accent: '#123abc', accentText: '#fff', surface: '#222', text: '#abcdef' } })
    expect(out).toContain('--au-gold: #123abc;')
    expect(out).toContain('--au-ink: #fff;')
    expect(out).toContain('--au-surface: #222;')
    expect(out).toContain('--au-text: #abcdef;')
  })

  it('derives --au-gold-hover by darkening the accent', () => {
    expect(gen()).toContain('--au-gold-hover: #e0b42d;') // #FFCC33 * 0.88/channel
  })

  it('falls back on invalid color and does not inject raw value', () => {
    const out = gen({ colors: { ...baseInput.colors, accent: 'red; } body { display:none' } })
    expect(out).toContain('--au-gold: #FFCC33;')
    expect(out).not.toContain('display:none')
  })
})

describe('scopeId — determinism & isolation', () => {
  it('is deterministic and id-safe', () => {
    expect(scopeId('icon', baseInput.colors)).toBe(scopeId('icon', baseInput.colors))
    expect(scopeId('icon', baseInput.colors)).toMatch(/^[0-9a-z]+$/)
  })

  it('produces byte-identical output for identical input', () => {
    expect(gen()).toBe(gen())
  })

  it('changes with any color change or type change', () => {
    const a = scopeId('icon', baseInput.colors)
    expect(scopeId('icon', { ...baseInput.colors, accent: '#00427E' })).not.toBe(a)
    expect(scopeId('callout', baseInput.colors)).not.toBe(a)
  })

  it('scopes every selector to the instance class (no bare base-class rule)', () => {
    const id = scopeId('icon', baseInput.colors)
    const out = gen()
    expect(out).toContain(`.au-icon-card--${id} {`)
    expect(out).toContain(`.au-icon-card--${id}__btn`)
    expect(out).not.toContain('.au-icon-card {')
    expect(out).not.toContain('.au-icon-card:focus-within')
  })

  it('two differently-colored blocks do not share a scope id', () => {
    const goldId = scopeId('icon', baseInput.colors)
    const blue = gen({ colors: { ...baseInput.colors, accent: '#00427E' } })
    expect(blue).not.toContain(`au-icon-card--${goldId}`)
  })

  it('honors an instanceId override', () => {
    expect(gen({ instanceId: 'fixed1' })).toContain('.au-icon-card--fixed1 {')
  })
})

describe('columnClass + layout', () => {
  it('maps cards-per-row to Bootstrap columns', () => {
    expect(columnClass(2)).toBe('col-12 col-sm-6 col-md-6')
    expect(columnClass(3)).toBe('col-12 col-sm-6 col-md-4')
    expect(columnClass(4)).toBe('col-12 col-sm-6 col-md-3')
  })

  it('emits one column div per card, in order, with d-flex', () => {
    const out = gen({ cardsPerRow: 4 })
    const cols = out.match(/class="col-12 col-sm-6 col-md-3 d-flex"/g) ?? []
    expect(cols).toHaveLength(2)
    expect(out.indexOf('Alpha')).toBeLessThan(out.indexOf('Beta'))
  })

  it('defaults to a left-aligned row (no justify-content-center)', () => {
    expect(gen()).toContain('<div class="row">')
    expect(gen()).not.toContain('justify-content-center')
    expect(gen({ align: 'left' })).toContain('<div class="row">')
  })

  it('centers an under-filled row when align is center', () => {
    expect(gen({ align: 'center' })).toContain('<div class="row justify-content-center">')
  })
})

describe('inter-card gap (uniform 15px, flush with text edges)', () => {
  it('uses a flush, gap-based layout scoped to the grid wrapper (no negative gutters)', () => {
    const id = scopeId('icon', baseInput.colors)
    const g = `au-icon-card--${id}-grid`
    const out = gen() // icon, 3-up
    expect(out).toContain(`<div class="container-fluid ${g}">`)
    // container padding zeroed → block lines up with the surrounding text.
    // Compound selector + !important beats the host theme's `.container-fluid`.
    expect(out).toContain(`.container-fluid.${g} { padding-right: 0 !important; padding-left: 0 !important; }`)
    // row negative margins gone; gap drives spacing on both axes
    expect(out).toContain(`.${g} > .row { margin-right: 0; margin-left: 0; gap: 15px; }`)
    // column gutters gone; gap (not padding) separates the cards
    expect(out).toContain(`.${g} > .row > [class*="col-"] { padding-right: 0; padding-left: 0; }`)
    // 3 columns + 2 gaps sum to exactly 100% (no overflow, outer cards flush)
    expect(out).toContain(`.${g} > .row > .col-md-4 { flex: 0 0 calc((100% - 30px) / 3); max-width: calc((100% - 30px) / 3); }`)
  })

  it('sizes the desktop columns for the chosen cards-per-row', () => {
    const id = scopeId('icon', baseInput.colors) // scopeId ignores cardsPerRow
    expect(gen({ cardsPerRow: 4 })).toContain(
      `.au-icon-card--${id}-grid > .row > .col-md-3 { flex: 0 0 calc((100% - 45px) / 4); max-width: calc((100% - 45px) / 4); }`,
    )
    expect(gen({ cardsPerRow: 2 })).toContain(
      `.au-icon-card--${id}-grid > .row > .col-md-6 { flex: 0 0 calc((100% - 15px) / 2); max-width: calc((100% - 15px) / 2); }`,
    )
  })

  it('callout and hover cards no longer carry top/bottom margins', () => {
    expect(gen({ type: 'callout' })).toContain('margin: 0;')
    expect(gen({ type: 'callout' })).not.toContain('margin: 15px 0;')
    expect(gen({ type: 'hover' })).toContain('margin: 0;')
    expect(gen({ type: 'hover' })).not.toContain('margin: 15px 0;')
  })

  it('icon cards keep their margin-top overhang (room for the square), not a spacing margin', () => {
    const out = gen({ type: 'icon' })
    expect(out).toContain('margin-top: 60px;')
    expect(out).not.toContain('margin: 15px 0;')
  })
})

describe('per-type structure', () => {
  it('icon card: square, optional title/text, full-bleed button, inset stretched link', () => {
    const id = scopeId('icon', baseInput.colors)
    const out = gen()
    expect(out).toContain(`<img class="au-icon-card--${id}__icon"`)
    expect(out).toContain(`<h3 class="au-icon-card--${id}__title">Alpha</h3>`)
    expect(out).toContain(`<p class="au-icon-card--${id}__text">Body A</p>`)
    expect(out).toContain(`<a class="au-icon-card--${id}__btn"`)
    expect(out).toContain(`.au-icon-card--${id}__btn::after { content: ""; position: absolute; inset: 0; }`)
  })

  it('callout card: cover image + full-width button, raised stretched link', () => {
    const out = gen({ type: 'callout' })
    const id = scopeId('callout', baseInput.colors)
    expect(out).toContain(`<img class="au-callout-card--${id}__img"`)
    expect(out).toContain(`<a class="au-callout-card--${id}__btn"`)
    expect(out).toContain('top: -1000px;')
  })

  it('hover card: image, sliding box, title/desc/cta, hover rules', () => {
    const out = gen({ type: 'hover' })
    const id = scopeId('hover', baseInput.colors)
    expect(out).toContain(`<div class="au-hover-card--${id}__box">`)
    expect(out).toContain(`<h3 class="au-hover-card--${id}__title">Alpha</h3>`)
    expect(out).toContain(`<span class="au-hover-card--${id}__desc">Body A</span>`)
    expect(out).toContain(`<a class="au-hover-card--${id}__cta"`)
    expect(out).toContain(`.au-hover-card--${id}:hover .au-hover-card--${id}__box`)
  })

  // The __box must be a <div>, never a <span>: it wraps the block-level <h3>
  // title, and an inline element illegally containing a block makes DNN's
  // CKEditor split the box on save, scattering the heading. See cards.ts.
  it('hover card: box wraps the h3 in a block-level <div>, not a <span>', () => {
    const out = gen({ type: 'hover' })
    const id = scopeId('hover', baseInput.colors)
    expect(out).not.toContain(`<span class="au-hover-card--${id}__box">`)
    expect(out).toMatch(
      new RegExp(`<div class="au-hover-card--${id}__box">[\\s\\S]*?<h3`)
    )
  })

  it('omits the heading/body elements when blank (markup, not the CSS rules)', () => {
    const out = gen({ cards: [{ ...baseInput.cards[0], heading: '', body: '   ' }] })
    expect(out).not.toContain('<h3 class=')
    expect(out).not.toContain('<p class=')
  })
})

describe('revealHover (preview only)', () => {
  it('preview reveals the hover card; copy never does', () => {
    const preview = generateCardsPreviewHtml({ ...baseInput, type: 'hover' }, { revealHover: true })
    expect(preview).toContain('--open')
    expect(generateCardsHtml({ ...baseInput, type: 'hover' })).not.toContain('--open')
  })
})

describe('preview sidebar context (preview only)', () => {
  it('no sidebars: full-width content column, no placeholders', () => {
    const out = generateCardsPreviewHtml(baseInput, { context: 'none' })
    expect(out).toContain('class="col-12 col-md-12"')
    expect(out).not.toContain('col-md-3 sim-side') // the placeholder element, not the CSS rule
  })

  it('left sidebar: 3-of-4 content column + one placeholder', () => {
    const out = generateCardsPreviewHtml(baseInput, { context: 'left' })
    expect(out).toContain('class="col-12 col-md-9"')
    expect((out.match(/sim-side/g) ?? []).length).toBeGreaterThanOrEqual(1)
  })

  it('both sidebars: 2-of-4 content column + two placeholders', () => {
    const out = generateCardsPreviewHtml(baseInput, { context: 'both' })
    expect(out).toContain('class="col-12 col-md-6"')
    const sides = out.match(/col-md-3 sim-side/g) ?? []
    expect(sides).toHaveLength(2)
  })

  it('the copy output never contains the sidebar simulation', () => {
    expect(gen()).not.toContain('sim-side')
    expect(gen()).not.toContain('sim-page')
  })
})

describe('DNN / copy constraints', () => {
  it('copy output ships no @font-face and lets the host theme drive row wrapping', () => {
    const out = gen()
    expect(out).not.toContain('@font-face')
    // We ship scoped column-WIDTH overrides but never the grid engine itself —
    // the host theme's Bootstrap provides display:flex / flex-wrap on .row.
    expect(out).not.toContain('flex-wrap')
  })

  it('preview output DOES inject fonts and the grid (proves the split)', () => {
    const preview = generateCardsPreviewHtml(baseInput)
    expect(preview).toContain('@font-face')
    expect(preview).toContain('flex-wrap')
  })

  it('uses self-closed <img/> and starts with the generated-by comment', () => {
    const out = gen()
    expect(out).toContain('/>')
    expect(out.startsWith('<!-- Generated by componentHelper v')).toBe(true)
  })
})
