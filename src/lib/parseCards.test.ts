// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { generateCardsHtml, type GenerateCardsInput } from './cards'
import { parseCardsHtml } from './parseCards'

const colors = { accent: '#FFCC33', accentText: '#000000', surface: '#000000', text: '#FFFFFF' }

function roundTrip(input: GenerateCardsInput) {
  return parseCardsHtml(generateCardsHtml(input))
}

describe('parseCardsHtml — round-trips generated HTML', () => {
  it('icon cards: type, layout, colors, and fields', () => {
    const input: GenerateCardsInput = {
      type: 'icon',
      cardsPerRow: 4,
      align: 'center',
      colors,
      cards: [
        { imageSrc: '/Portals/0/a.png', imageAlt: 'A', heading: 'Alpha', body: 'Body A', buttonText: 'Go A', ctaText: '', buttonHref: 'https://example.com/a', external: true },
        { imageSrc: '/Portals/0/b.png', imageAlt: 'B', heading: 'Beta', body: 'Body B', buttonText: 'Go B', ctaText: '', buttonHref: 'https://example.com/b', external: false },
      ],
    }
    const out = roundTrip(input)!
    expect(out).not.toBeNull()
    expect(out.type).toBe('icon')
    expect(out.cardsPerRow).toBe(4)
    expect(out.align).toBe('center')
    expect(out.colors.accent.toLowerCase()).toBe('#ffcc33')
    expect(out.cards).toHaveLength(2)
    expect(out.cards[0]).toMatchObject({
      imageSrc: '/Portals/0/a.png',
      imageAlt: 'A',
      heading: 'Alpha',
      body: 'Body A',
      buttonText: 'Go A',
      buttonHref: 'https://example.com/a',
      external: true, // target="_blank" recovered
    })
    expect(out.cards[1].external).toBe(false) // internal link stays internal
  })

  it('callout cards: image + button only', () => {
    const input: GenerateCardsInput = {
      type: 'callout',
      cardsPerRow: 2,
      align: 'left',
      colors,
      cards: [{ imageSrc: '/x.png', imageAlt: 'X', heading: '', body: '', buttonText: 'Open', ctaText: '', buttonHref: '/go', external: false }],
    }
    const out = roundTrip(input)!
    expect(out.type).toBe('callout')
    expect(out.cardsPerRow).toBe(2)
    expect(out.cards[0]).toMatchObject({ imageSrc: '/x.png', imageAlt: 'X', buttonText: 'Open', buttonHref: '/go' })
  })

  it('hover cards: band link + desc + cta', () => {
    const input: GenerateCardsInput = {
      type: 'hover',
      cardsPerRow: 3,
      align: 'left',
      colors,
      cards: [{ imageSrc: '/y.png', imageAlt: 'Y', heading: '', body: 'Desc', buttonText: 'Band', ctaText: 'More', buttonHref: '/h', external: false }],
    }
    const out = roundTrip(input)!
    expect(out.type).toBe('hover')
    expect(out.cards[0]).toMatchObject({
      imageSrc: '/y.png',
      imageAlt: 'Y',
      body: 'Desc',
      buttonText: 'Band',
      ctaText: 'More',
      buttonHref: '/h',
    })
  })
})

describe('parseCardsHtml — best-effort degradation', () => {
  const input: GenerateCardsInput = {
    type: 'icon',
    cardsPerRow: 3,
    align: 'left',
    colors: { accent: '#123456', accentText: '#ffffff', surface: '#222222', text: '#eeeeee' },
    cards: [{ imageSrc: '/a.png', imageAlt: 'A', heading: 'H', body: 'B', buttonText: 'Go', ctaText: '', buttonHref: '/a', external: false }],
  }

  it('falls back to default colors when the <style> block is missing (markup-only paste)', () => {
    const markupOnly = generateCardsHtml(input).replace(/<style>[\s\S]*?<\/style>/, '')
    const out = parseCardsHtml(markupOnly)!
    expect(out).not.toBeNull()
    expect(out.type).toBe('icon')
    expect(out.colors.accent.toLowerCase()).toBe('#ffcc33') // DEFAULT_CARD_COLORS
    expect(out.cards[0].buttonText).toBe('Go')
  })

  it('returns null for junk / non-card HTML', () => {
    expect(parseCardsHtml('')).toBeNull()
    expect(parseCardsHtml('<div>hello</div>')).toBeNull()
    expect(parseCardsHtml('not html at all')).toBeNull()
  })

  it('maps the blank-image placeholder back to an empty src', () => {
    const blank: GenerateCardsInput = { ...input, cards: [{ ...input.cards[0], imageSrc: '' }] }
    const out = parseCardsHtml(generateCardsHtml(blank))!
    expect(out.cards[0].imageSrc).toBe('')
  })
})
