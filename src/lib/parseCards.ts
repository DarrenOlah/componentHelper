// Best-effort importer: recover the editable Card Helper fields from a block this tool
// generated — or a partial paste (just the markup, no <style>), or even markup copied
// from a rendered page. Unlike cards.ts this is intentionally DOM-aware (it uses
// DOMParser), so it lives in its own module to keep the generator pure/DOM-free.
//
// Best-effort means every piece degrades independently: unknown look-settings fall back
// to defaults rather than failing. Returns null only when no card markup is recognizable
// at all (so the UI can show a friendly "couldn't recognize any cards" message).

import {
  DEFAULT_CARD_COLORS,
  type CardType,
  type CardAlign,
  type CardColors,
  type CardContent,
  type GenerateCardsInput,
} from './cards'
import { IMAGE_PLACEHOLDER } from './sanitize'

// Full count is carried by col-lg-* (3/4-up); 2-up tops out at col-md-6 and 1-up
// at col-12. 5-up uses the custom au-col-5 hook (no Bootstrap class for 12/5).
const PER_ROW_FROM_LG: Record<string, 3 | 4> = { '4': 3, '3': 4 }

// Read a CSS custom property's value out of raw CSS text. Anchored on the `:` so
// `--au-gold` never matches the derived `--au-gold-hover`.
function cssVar(text: string, name: string): string | undefined {
  const m = text.match(new RegExp('--' + name + '\\s*:\\s*([^;}]+)'))
  return m ? m[1].trim() : undefined
}

export function parseCardsHtml(html: string): GenerateCardsInput | null {
  if (typeof DOMParser === 'undefined') return null

  // Type from any surviving `au-<type>-card` class (works even for partial/rendered paste).
  const type = (html.match(/au-(icon|callout|hover)-card/) || [])[1] as CardType | undefined
  if (!type) return null

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const base = `au-${type}-card` // the per-card base class (a standalone token)
  const cardEls = Array.from(doc.getElementsByClassName(base))
  if (cardEls.length === 0) return null

  // cards-per-row from the card's column class. 5-up carries the custom au-col-5
  // hook; 3/4-up carry col-lg-4/3; 2-up has only col-md-6; 1-up only col-12. Check
  // most-specific first; au-col-5 isn't a col-lg-* so it must be tested on its own.
  // No recognizable col class → default 3.
  let cardsPerRow: 1 | 2 | 3 | 4 | 5 = 3
  if (cardEls[0].closest('.au-col-5')) {
    cardsPerRow = 5
  } else {
    const lgCol = cardEls[0].closest('[class*="col-lg-"]')
    const lg = (lgCol?.className.match(/col-lg-(\d+)/) || [])[1]
    if (lg && PER_ROW_FROM_LG[lg]) cardsPerRow = PER_ROW_FROM_LG[lg]
    else if (cardEls[0].closest('.col-md-6')) cardsPerRow = 2
    else if (cardEls[0].closest('.col-12')) cardsPerRow = 1
  }

  // alignment from the row class.
  const row = cardEls[0].closest('[class*="row"]')
  const align: CardAlign = row?.className.includes('justify-content-center') ? 'center' : 'left'

  // colors from <style> custom props; fall back to inline styles, then defaults.
  let cssText = Array.from(doc.querySelectorAll('style'))
    .map(s => s.textContent || '')
    .join('\n')
  if (!/--au-gold/.test(cssText)) {
    cssText += '\n' + Array.from(doc.querySelectorAll('[style]'))
      .map(el => el.getAttribute('style') || '')
      .join('\n')
  }
  const colors: CardColors = {
    accent: cssVar(cssText, 'au-gold') ?? DEFAULT_CARD_COLORS.accent,
    accentText: cssVar(cssText, 'au-ink') ?? DEFAULT_CARD_COLORS.accentText,
    surface: cssVar(cssText, 'au-surface') ?? DEFAULT_CARD_COLORS.surface,
    text: cssVar(cssText, 'au-text') ?? DEFAULT_CARD_COLORS.text,
  }

  const txt = (el: Element | null) => (el?.textContent ?? '').trim()
  const attr = (el: Element | null, name: string) => el?.getAttribute(name) ?? ''
  const unplaceholder = (src: string) => (src === IMAGE_PLACEHOLDER ? '' : src)

  const cards: CardContent[] = []
  for (const el of cardEls) {
    const img = el.querySelector('[class*="__icon"], [class*="__img"]')
    const card: CardContent = {
      imageSrc: unplaceholder(attr(img, 'src')),
      imageAlt: attr(img, 'alt'),
      heading: '',
      body: '',
      buttonText: '',
      ctaText: '',
      buttonHref: '',
      external: false,
    }

    if (type === 'icon') {
      card.heading = txt(el.querySelector('[class*="__title"]'))
      card.body = txt(el.querySelector('[class*="__text"]'))
      const a = el.querySelector('[class*="__btn"]')
      if (!a) continue // a card with no link isn't usable — skip it, don't abort
      card.buttonText = txt(a)
      card.buttonHref = attr(a, 'href')
      card.external = attr(a, 'target').toLowerCase() === '_blank'
    } else if (type === 'callout') {
      const a = el.querySelector('[class*="__btn"]')
      if (!a) continue
      card.buttonText = txt(a)
      card.buttonHref = attr(a, 'href')
      card.external = attr(a, 'target').toLowerCase() === '_blank'
    } else {
      // hover: the gold band (__title-link) is the single stretched link.
      const a = el.querySelector('[class*="__title-link"]')
      if (!a) continue
      card.buttonText = txt(a)
      card.buttonHref = attr(a, 'href')
      card.external = attr(a, 'target').toLowerCase() === '_blank'
      card.body = txt(el.querySelector('[class*="__desc"]'))
      card.ctaText = txt(el.querySelector('[class*="__cta"]'))
    }
    cards.push(card)
  }
  if (cards.length === 0) return null

  return { type, cardsPerRow, align, colors, cards }
}
