// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { generateDrawerHtml, DEFAULT_TAB_COLOR, DEFAULT_VPOS_PERCENT, type GenerateDrawerInput } from './drawer'
import { parseDrawerHtml } from './parseDrawer'

const base: GenerateDrawerInput = {
  label: 'Audiences',
  links: [
    { href: 'https://example.com/a', text: 'Alpha' },
    { href: '/Portals/0/b.pdf', text: 'Beta & Co' },
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

const roundTrip = (overrides: Partial<GenerateDrawerInput> = {}) => {
  const input = { ...base, ...overrides }
  return { input, out: parseDrawerHtml(generateDrawerHtml(input)) }
}

describe('parseDrawerHtml — round-trips generated HTML', () => {
  it('recovers every field with default settings', () => {
    const { input, out } = roundTrip()
    expect(out).not.toBeNull()
    expect(out!.hasStyle).toBe(true)
    expect(out!.input).toEqual(input)
  })

  it('recovers custom colors, position, tab width, fixed panel + max width', () => {
    const { input, out } = roundTrip({
      label: 'Quick <Links>',
      tabColor: '#221F20',
      tabTextColor: '#FFFFFF',
      borderColor: '#676C4A',
      panelColor: '#123456',
      linkColor: '#ABCDEF',
      vposPercent: 33.33,
      tabWidthRem: 3.25,
      panelWidthMode: 'fixed',
      panelWidthRem: 20,
      panelMaxWidthRem: 24,
    })
    expect(out!.input).toEqual(input)
  })

  it('recovers edge-anchored positions', () => {
    expect(roundTrip({ vposPercent: 10 }).out!.input.vposPercent).toBe(10)
    expect(roundTrip({ vposPercent: 90 }).out!.input.vposPercent).toBe(90)
  })

  it('reproduces identical output when regenerated', () => {
    const html = generateDrawerHtml({ ...base, panelWidthMode: 'fixed', panelWidthRem: 18, vposPercent: 66.67 })
    expect(generateDrawerHtml(parseDrawerHtml(html)!.input)).toBe(html)
  })
})

describe('parseDrawerHtml — best-effort degradation', () => {
  it('markup-only paste: label + links recovered, settings default', () => {
    const html = generateDrawerHtml({ ...base, tabColor: '#221F20', vposPercent: 20 })
    const markup = html.slice(html.indexOf('<div class="au-drawer"'))
    const out = parseDrawerHtml(markup)!
    expect(out.hasStyle).toBe(false)
    expect(out.input.label).toBe('Audiences')
    expect(out.input.links).toEqual(base.links)
    expect(out.input.tabColor).toBe(DEFAULT_TAB_COLOR)
    expect(out.input.vposPercent).toBe(DEFAULT_VPOS_PERCENT)
  })

  it('falls back to the aria-label when the text span is missing', () => {
    const out = parseDrawerHtml(
      '<label class="au-drawer__tab" aria-label="Resources menu"></label><ul class="au-drawer__list"></ul>',
    )!
    expect(out.input.label).toBe('Resources')
    expect(out.input.links).toEqual([])
  })

  it('rejects unsafe colors in a hand-edited style block', () => {
    const html = generateDrawerHtml(base).replace('--au-tab: #FFCC33;', '--au-tab: red;}body{x:1;')
    expect(parseDrawerHtml(html)!.input.tabColor).toBe(DEFAULT_TAB_COLOR)
  })

  it('returns null for non-drawer HTML', () => {
    expect(parseDrawerHtml('<p>hello</p>')).toBeNull()
    expect(parseDrawerHtml('<div class="au-icon-card"></div>')).toBeNull()
    expect(parseDrawerHtml('')).toBeNull()
  })
})
