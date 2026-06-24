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
  type CardImageAspect,
  type CardIconFit,
  type CardRevealBg,
  type CardIconMode,
  type GenerateCardsInput,
} from './cards'
import { sanitizeIconClass } from './sanitize'
import { IMAGE_PLACEHOLDER } from './sanitize'

// Full count is carried by col-lg-* (3/4-up); 2-up tops out at col-md-6 and 1-up
// at col-12. 5-up uses the custom au-col-5 hook (no Bootstrap class for 12/5).
const PER_ROW_FROM_LG: Record<string, 3 | 4> = { '4': 3, '3': 4 }

// Reverse of cards.ts ASPECT_CSS: the emitted `aspect-ratio: w / h` → preset key.
const ASPECT_FROM_CSS: Record<string, CardImageAspect> = {
  '1 / 1': '1:1',
  '5 / 4': '5:4',
  '4 / 3': '4:3',
  '3 / 2': '3:2',
  '16 / 9': '16:9',
  '21 / 9': '21:9',
}

// Read a CSS custom property's value out of raw CSS text. Anchored on the `:` so
// `--au-gold` never matches the derived `--au-gold-hover`.
function cssVar(text: string, name: string): string | undefined {
  const m = text.match(new RegExp('--' + name + '\\s*:\\s*([^;}]+)'))
  return m ? m[1].trim() : undefined
}

export function parseCardsHtml(html: string): GenerateCardsInput | null {
  if (typeof DOMParser === 'undefined') return null

  // Type from any surviving `au-<type>-card` class (works even for partial/rendered paste).
  const type = (html.match(/au-(icon|callout|hover|logo)-card/) || [])[1] as CardType | undefined
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

  // Image shape from the appended `aspect-ratio` rule (absent → auto). Only present
  // in a full block paste with the <style>; markup-only pastes degrade to auto.
  const ar = cssText.match(/aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/)
  const imageAspect: CardImageAspect = (ar && ASPECT_FROM_CSS[`${ar[1]} / ${ar[2]}`]) || 'auto'

  // Logo icon fit from the __icon rule's object-fit (cover = fill/crop, else
  // contain). Only meaningful for logo; other types don't read it. Markup-only
  // pastes (no <style>) degrade to contain.
  const iconFit: CardIconFit =
    type === 'logo' && /__icon\s*\{[^}]*object-fit:\s*cover/.test(cssText) ? 'cover' : 'contain'

  // Logo reveal-panel background from the __box rule: a surface-color fill is the
  // opaque 'solid' option, anything else (the dark gradient) is 'gradient'. The
  // `__box {` anchor excludes the `__box--reveal`/`__box:not(...)` selectors. Only
  // meaningful for logo; markup-only pastes (no <style>) degrade to gradient.
  const revealBg: CardRevealBg =
    type === 'logo' && /__box\s*\{[^}]*background:\s*var\(--au-surface\)/.test(cssText) ? 'solid' : 'gradient'

  const txt = (el: Element | null) => (el?.textContent ?? '').trim()
  const attr = (el: Element | null, name: string) => el?.getAttribute(name) ?? ''
  const unplaceholder = (src: string) => (src === IMAGE_PLACEHOLDER ? '' : src)
  // Read the fields shared by every type's link: label, href, and external flag.
  const readAnchor = (a: Element) => ({
    buttonText: txt(a),
    buttonHref: attr(a, 'href'),
    external: attr(a, 'target').toLowerCase() === '_blank',
  })

  const cards: CardContent[] = []
  for (const el of cardEls) {
    const img = el.querySelector('[class*="__icon"], [class*="__img"]')
    // FA mode (icon/logo): the __icon wrapper holds an <i> carrying fa- classes
    // instead of an <img>. Filter to fa- tokens so a hand-edited/rendered paste
    // can't smuggle junk. When present, image fields stay empty (the wrapper has
    // no src/alt) and the card renders the glyph.
    const faEl = img?.querySelector('[class*="fa-"]') ?? null
    const iconClass = faEl ? sanitizeIconClass(faEl.className) : ''
    const iconMode: CardIconMode = iconClass ? 'fa' : 'image'
    const card: CardContent = {
      imageSrc: unplaceholder(attr(img, 'src')),
      imageAlt: attr(img, 'alt'),
      iconMode,
      iconClass,
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
      Object.assign(card, readAnchor(a))
    } else if (type === 'callout') {
      const a = el.querySelector('[class*="__btn"]')
      if (!a) continue
      Object.assign(card, readAnchor(a))
    } else {
      // hover/logo: the gold band (__title-link) is the single stretched link.
      const a = el.querySelector('[class*="__title-link"]')
      if (!a) continue
      Object.assign(card, readAnchor(a))
      card.body = txt(el.querySelector('[class*="__desc"]'))
      card.ctaText = txt(el.querySelector('[class*="__cta"]'))
    }
    cards.push(card)
  }
  if (cards.length === 0) return null

  return { type, cardsPerRow, imageAspect, iconFit, revealBg, align, colors, cards }
}
