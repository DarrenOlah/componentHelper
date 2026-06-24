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
        { imageSrc: '/Portals/0/a.png', imageAlt: 'A', iconMode: 'image', iconClass: '', heading: 'Alpha', body: 'Body A', buttonText: 'Go A', ctaText: '', buttonHref: 'https://example.com/a', external: true },
        { imageSrc: '/Portals/0/b.png', imageAlt: 'B', iconMode: 'image', iconClass: '', heading: 'Beta', body: 'Body B', buttonText: 'Go B', ctaText: '', buttonHref: 'https://example.com/b', external: false },
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
      cards: [{ imageSrc: '/x.png', imageAlt: 'X', iconMode: 'image', iconClass: '', heading: '', body: '', buttonText: 'Open', ctaText: '', buttonHref: '/go', external: false }],
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
      cards: [{ imageSrc: '/y.png', imageAlt: 'Y', iconMode: 'image', iconClass: '', heading: '', body: 'Desc', buttonText: 'Band', ctaText: 'More', buttonHref: '/h', external: false }],
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

  it('logo cards: icon + band link + desc + cta (routes like hover)', () => {
    const input: GenerateCardsInput = {
      type: 'logo',
      cardsPerRow: 5,
      imageAspect: '1:1',
      align: 'left',
      colors,
      cards: [
        { imageSrc: '/fb.png', imageAlt: 'Facebook', iconMode: 'image', iconClass: '', heading: '', body: '', buttonText: 'Facebook', ctaText: '', buttonHref: 'https://facebook.com', external: true },
        { imageSrc: '/fl.png', imageAlt: 'Flickr', iconMode: 'image', iconClass: '', heading: '', body: 'All photos', buttonText: 'Flickr', ctaText: 'Follow Us', buttonHref: 'https://flickr.com', external: true },
      ],
    }
    const out = roundTrip(input)!
    expect(out.type).toBe('logo')
    expect(out.cardsPerRow).toBe(5)
    expect(out.imageAspect).toBe('1:1')
    // static icon tile: label + href recovered, no reveal content
    expect(out.cards[0]).toMatchObject({ imageSrc: '/fb.png', imageAlt: 'Facebook', buttonText: 'Facebook', body: '', ctaText: '' })
    // reveal tile: desc + cta recovered
    expect(out.cards[1]).toMatchObject({ imageSrc: '/fl.png', body: 'All photos', buttonText: 'Flickr', ctaText: 'Follow Us' })
    // default icon fit is contain
    expect(out.iconFit).toBe('contain')
  })

  it('logo cards: recovers the cover (fill & crop) icon fit', () => {
    const card = { imageSrc: '/a.png', imageAlt: 'A', iconMode: 'image' as const, iconClass: '', heading: '', body: '', buttonText: 'Go', ctaText: '', buttonHref: '/a', external: false }
    const covered = roundTrip({ type: 'logo', cardsPerRow: 5, iconFit: 'cover', align: 'left', colors, cards: [card] })!
    expect(covered.iconFit).toBe('cover')
    const contained = roundTrip({ type: 'logo', cardsPerRow: 5, iconFit: 'contain', align: 'left', colors, cards: [card] })!
    expect(contained.iconFit).toBe('contain')
  })

  it('logo cards: recovers the solid (opaque) reveal background', () => {
    const card = { imageSrc: '/a.png', imageAlt: 'A', iconMode: 'image' as const, iconClass: '', heading: '', body: 'Desc', buttonText: 'Go', ctaText: 'More', buttonHref: '/a', external: false }
    const solid = roundTrip({ type: 'logo', cardsPerRow: 5, revealBg: 'solid', align: 'left', colors, cards: [card] })!
    expect(solid.revealBg).toBe('solid')
    const gradient = roundTrip({ type: 'logo', cardsPerRow: 5, revealBg: 'gradient', align: 'left', colors, cards: [card] })!
    expect(gradient.revealBg).toBe('gradient')
  })

  it('recovers 1-up (col-12 only) and 5-up (au-col-5 hook) layouts', () => {
    const oneUp = roundTrip({
      type: 'icon',
      cardsPerRow: 1,
      align: 'left',
      colors,
      cards: [{ imageSrc: '/a.png', imageAlt: 'A', iconMode: 'image', iconClass: '', heading: '', body: '', buttonText: 'Go', ctaText: '', buttonHref: '/a', external: false }],
    })!
    expect(oneUp.cardsPerRow).toBe(1)

    const fiveUp = roundTrip({
      type: 'icon',
      cardsPerRow: 5,
      align: 'left',
      colors,
      cards: [{ imageSrc: '/a.png', imageAlt: 'A', iconMode: 'image', iconClass: '', heading: '', body: '', buttonText: 'Go', ctaText: '', buttonHref: '/a', external: false }],
    })!
    expect(fiveUp.cardsPerRow).toBe(5)
  })

  it('recovers the image shape (aspect ratio) for cover-photo cards', () => {
    const card = { imageSrc: '/a.png', imageAlt: 'A', iconMode: 'image' as const, iconClass: '', heading: '', body: '', buttonText: 'Go', ctaText: '', buttonHref: '/a', external: false }
    const shaped = roundTrip({ type: 'callout', cardsPerRow: 1, imageAspect: '4:3', align: 'left', colors, cards: [card] })!
    expect(shaped.imageAspect).toBe('4:3')
    // the ultrawide cinematic preset round-trips too (21 / 9, integer pair)
    const cine = roundTrip({ type: 'hover', cardsPerRow: 1, imageAspect: '21:9', align: 'left', colors, cards: [card] })!
    expect(cine.imageAspect).toBe('21:9')
    // default (no aspect rule emitted) round-trips to auto
    const plain = roundTrip({ type: 'callout', cardsPerRow: 1, align: 'left', colors, cards: [card] })!
    expect(plain.imageAspect).toBe('auto')
  })
})

describe('parseCardsHtml — best-effort degradation', () => {
  const input: GenerateCardsInput = {
    type: 'icon',
    cardsPerRow: 3,
    align: 'left',
    colors: { accent: '#123456', accentText: '#ffffff', surface: '#222222', text: '#eeeeee' },
    cards: [{ imageSrc: '/a.png', imageAlt: 'A', iconMode: 'image', iconClass: '', heading: 'H', body: 'B', buttonText: 'Go', ctaText: '', buttonHref: '/a', external: false }],
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

describe('parseCardsHtml — Font Awesome icons', () => {
  it('round-trips an fa icon card (mode + class, empty image fields)', () => {
    const input: GenerateCardsInput = {
      type: 'icon',
      cardsPerRow: 3,
      align: 'left',
      colors,
      cards: [{ imageSrc: '', imageAlt: '', iconMode: 'fa', iconClass: 'fa-solid fa-house', heading: 'Home', body: 'Body', buttonText: 'Go', ctaText: '', buttonHref: '/a', external: false }],
    }
    const out = roundTrip(input)!
    expect(out.cards[0].iconMode).toBe('fa')
    expect(out.cards[0].iconClass).toBe('fa-solid fa-house')
    expect(out.cards[0].imageSrc).toBe('')
    expect(out.cards[0].heading).toBe('Home')
  })

  it('round-trips an fa logo card', () => {
    const input: GenerateCardsInput = {
      type: 'logo',
      cardsPerRow: 5,
      align: 'left',
      colors,
      cards: [{ imageSrc: '', imageAlt: '', iconMode: 'fa', iconClass: 'fa-brands fa-youtube', heading: '', body: '', buttonText: 'YouTube', ctaText: '', buttonHref: 'https://youtube.com', external: true }],
    }
    const out = roundTrip(input)!
    expect(out.cards[0].iconMode).toBe('fa')
    expect(out.cards[0].iconClass).toBe('fa-brands fa-youtube')
    expect(out.cards[0].buttonText).toBe('YouTube')
  })

  it('round-trips a mixed block (one fa card, one image card)', () => {
    const input: GenerateCardsInput = {
      type: 'icon',
      cardsPerRow: 2,
      align: 'left',
      colors,
      cards: [
        { imageSrc: '', imageAlt: '', iconMode: 'fa', iconClass: 'fa-solid fa-star', heading: 'Star', body: '', buttonText: 'A', ctaText: '', buttonHref: '/a', external: false },
        { imageSrc: '/Portals/0/b.png', imageAlt: 'B', iconMode: 'image', iconClass: '', heading: 'Beta', body: '', buttonText: 'B', ctaText: '', buttonHref: '/b', external: false },
      ],
    }
    const out = roundTrip(input)!
    expect(out.cards[0]).toMatchObject({ iconMode: 'fa', iconClass: 'fa-solid fa-star' })
    expect(out.cards[1]).toMatchObject({ iconMode: 'image', imageSrc: '/Portals/0/b.png', imageAlt: 'B' })
  })
})
