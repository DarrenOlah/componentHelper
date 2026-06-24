// Per-type CSS builders for the Card Helper, plus a preview-only Bootstrap-4 grid
// subset. The source of truth for these styles is demo/cards/cards.html — keep the
// two in sync when tweaking card visuals.
//
// Kept as TS string builders (not a .css file): Vite's CSS pipeline intercepts the
// .css extension and `?raw` returns empty under Vitest, so static CSS can't be read
// reliably that way. Unlike the drawer (one fixed `.au-drawer` scope), every card
// block must be scoped to a per-instance class so two differently-colored blocks on
// one DNN page can't collide — so each type is a `(inst, vars) => string` builder.
//
// DNN/CKEditor survival: theming lives in this <style> (NOT inline `style` attrs,
// which CKEditor's ACF can strip); !important guards beat host skins; the stretched
// link is a `::after` pseudo-element (no extra nodes for CKEditor to strip).

// Resolved, already-sanitized color values threaded into the scoped vars block.
export interface CardCssVars {
  accent: string // --au-gold     (band / button background)
  accentHover: string // --au-gold-hover (derived darken of accent)
  accentText: string // --au-ink      (text on the gold band)
  surface: string // --au-surface  (card background / image fallback)
  text: string // --au-text      (heading + body color)
}

// The custom-property block written into the scoped root rule. Values are literal
// (sanitized) colors — safe here because they live in the <style>, not an attr.
function varsBlock(v: CardCssVars): string {
  return `    --au-gold: ${v.accent};
    --au-gold-hover: ${v.accentHover};
    --au-ink: ${v.accentText};
    --au-surface: ${v.surface};
    --au-text: ${v.text};
    --au-band: 44px;`
}

const F530 = '"GI-530", system-ui, Arial, sans-serif'
const F400 = '"GI-400", system-ui, Arial, sans-serif'

// Uniform inter-card gap (px), applied on BOTH axes. Cards used to space via the
// theme's 30px Bootstrap gutter (horizontal) + a 15px card margin (vertical); we
// now drive a single gap so cards sit flush with the surrounding text and only
// the gaps separate them. Change this one value to retune (e.g. back to 30).
export const CARD_GAP_PX = 15

// The full-count column class applies at the lg breakpoint (992px). 1-up/2-up
// reach their full count below lg (col-12 / col-md-6), so they have no lg entry.
// 3-up/4-up use real Bootstrap classes: 12/3 and 12/4 are integers, so the class
// is also a correct fallback if our override never loads. 5-up has no exact class
// (12/5 = 2.4), so reusing a col-* class would be actively misleading (it would
// fall back to the wrong count). It gets a custom au-col-5 hook instead, sized
// entirely by the calc() override below.
const LG_COL: Record<3 | 4 | 5, string> = { 3: 'col-lg-4', 4: 'col-lg-3', 5: 'au-col-5' }

// Scoped layout override applied only under our own grid wrapper class (never the
// page's other rows). We deliberately abandon Bootstrap's negative-margin gutter
// model — which indents the block by the container's padding and would overflow if
// that padding were removed — for a flush, gap-based layout:
//   • zero the container-fluid padding so the block lines up with surrounding text;
//   • zero the row's negative margins and the columns' padding;
//   • `gap` provides CARD_GAP_PX between columns AND between wrapped lines (space
//     only BETWEEN cards, so the outer cards stay flush — no overflow);
//   • size each column with calc() so N columns + (N-1) gaps sum to exactly 100%.
// Selectors are scoped + specific enough to beat the host's `.row`/`.col-*` rules.
// Breakpoint progression (graduated to delay density on small screens):
//   • < 768px  → 1 column   (col-12, the default below)
//   • ≥ 768px  → 2 columns  (col-md-6 — the final count for 2-up; skipped for 1-up)
//   • ≥ 992px  → full count (col-lg-4 / col-lg-3 / col-lg-2 — for 3/4/5-up)
// 1-up never steps up: it stays a single col-12 column at every width.
export function cardGridCss(gridClass: string, cardsPerRow: 1 | 2 | 3 | 4 | 5, gap = CARD_GAP_PX): string {
  // Flex-basis for n equal columns sharing (n-1) gaps across a 100% row.
  const w = (n: number) => `calc((100% - ${(n - 1) * gap}px) / ${n})`
  // Every count except 1-up drops to 2 columns at md.
  const mdRule =
    cardsPerRow >= 2
      ? `
  @media (min-width: 768px) {
    .${gridClass} > .row > .col-md-6 { flex: 0 0 ${w(2)}; max-width: ${w(2)}; }
  }`
      : ''
  // 3/4/5-up step up to their full count at lg; 1-up/2-up are already done below lg.
  const lgRule =
    cardsPerRow > 2
      ? `
  @media (min-width: 992px) {
    .${gridClass} > .row > .${LG_COL[cardsPerRow as 3 | 4 | 5]} { flex: 0 0 ${w(cardsPerRow)}; max-width: ${w(cardsPerRow)}; }
  }`
      : ''
  // Compound selector + !important so the zeroed gutters beat the host theme's
  // single-class `.container-fluid { padding: 0 15px }` regardless of load order.
  return `.container-fluid.${gridClass} { padding-right: 0 !important; padding-left: 0 !important; }
  .${gridClass} > .row { margin-right: 0; margin-left: 0; gap: ${gap}px; }
  .${gridClass} > .row > [class*="col-"] { padding-right: 0; padding-left: 0; }
  .${gridClass} > .row > .col-12 { flex: 0 0 100%; max-width: 100%; }${mdRule}${lgRule}`
}

// ---- Icon card: overhanging square, optional heading/body, full-bleed button --
export function iconCardCss(inst: string, v: CardCssVars): string {
  return `.${inst} {
${varsBlock(v)}
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    min-height: 250px;
    width: 100%;
    margin-top: 60px;
    padding: 60px 0 0;
    background: var(--au-surface);
    color: var(--au-text);
    text-align: center;
  }
  .${inst}:focus-within { outline: 3px solid var(--au-gold); outline-offset: -3px; }
  .${inst}__icon {
    position: absolute;
    top: -45px;
    left: 50%;
    transform: translateX(-50%);
    width: 90px;
    height: 90px;
    border: 3px solid #ffffff;
    object-fit: cover;
    object-position: center;
    background: var(--au-surface);
  }
  .${inst}__icon--fa {
    display: flex;
    align-items: center;
    justify-content: center;
    object-fit: unset;
  }
  .${inst}__icon--fa > i {
    font-size: 44px;
    line-height: 1;
    color: var(--au-text);
  }
  .${inst}__title {
    margin: 0 0 8px !important;
    padding: 0 24px !important;
    color: var(--au-text) !important;
    background: transparent !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
    text-transform: uppercase !important;
  }
  .${inst}__text {
    margin: 0 !important;
    padding: 0 24px 24px !important;
    color: var(--au-text) !important;
    font-family: ${F400} !important;
    font-weight: 400 !important;
    font-size: 16px !important;
  }
  .${inst}__btn,
  .${inst}__btn:link,
  .${inst}__btn:visited {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--au-band);
    box-sizing: border-box;
    padding: 8px 12px;
    background: var(--au-gold) !important;
    color: var(--au-ink) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
    line-height: 1.2;
    text-transform: uppercase !important;
    text-align: center;
    text-decoration: none !important;
    overflow-wrap: break-word;
    word-break: break-word;
    text-wrap: balance;
  }
  .${inst}__btn:hover { background: var(--au-gold-hover) !important; cursor: pointer; }
  .${inst}__btn:hover,
  .${inst}__btn:focus {
    color: var(--au-ink) !important;
    text-decoration: none !important;
  }
  .${inst}__btn:focus { outline: none; }
  .${inst}__btn::after { content: ""; position: absolute; inset: 0; }`
}

// ---- Callout card: full-cover image, full-width button band -------------------
export function calloutCardCss(inst: string, v: CardCssVars): string {
  return `.${inst} {
${varsBlock(v)}
    position: relative;
    box-sizing: border-box;
    min-height: 250px;
    width: 100%;
    margin: 0;
    overflow: hidden;
    background: var(--au-surface);
  }
  .${inst}:focus-within { outline: 3px solid var(--au-gold); outline-offset: -3px; }
  .${inst}__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  .${inst}__btn,
  .${inst}__btn:link,
  .${inst}__btn:visited {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    min-height: var(--au-band);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    background: var(--au-gold) !important;
    color: var(--au-ink) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
    line-height: 1.2;
    text-transform: uppercase !important;
    text-align: center;
    text-decoration: none !important;
    overflow-wrap: break-word;
    word-break: break-word;
    text-wrap: balance;
  }
  .${inst}__btn:hover { background: var(--au-gold-hover) !important; cursor: pointer; }
  .${inst}__btn:hover,
  .${inst}__btn:focus {
    color: var(--au-ink) !important;
    text-decoration: none !important;
  }
  .${inst}__btn:focus { outline: none; }
  .${inst}__btn::after {
    content: "";
    position: absolute;
    top: -1000px;
    left: 0;
    right: 0;
    bottom: 0;
  }`
}

// ---- Hover card: full-cover image + sliding panel revealed on hover/focus -----
// `revealable` adds a preview-only `--open` class + open-state rules so the live
// preview can show the revealed state (never emitted on the copy path).
// Two non-obvious rules below: the __box `transition` is !important so host skins'
// broad transitions can't override it (panel would snap instead of glide); the gold
// band (__title-link) is kept unpositioned so its ::after overlay resolves to __box
// and covers the whole card.
export function hoverCardCss(inst: string, v: CardCssVars, opts: { revealable?: boolean } = {}): string {
  const reveal = opts.revealable
    ? `
  .${inst}--open .${inst}__box { top: 0; padding-top: 1rem; }
  .${inst}--open .${inst}__title {
    background-color: transparent !important;
    color: var(--au-text) !important;
    text-shadow: 0 -2px 8px rgba(0, 0, 0, 0.6);
  }`
    : ''
  return `.${inst} {
${varsBlock(v)}
    position: relative;
    box-sizing: border-box;
    min-height: 250px;
    width: 100%;
    margin: 0;
    overflow: hidden;
    background: var(--au-surface);
    color: var(--au-text);
  }
  .${inst}:focus-within { outline: 3px solid var(--au-gold); outline-offset: -3px; }
  .${inst}__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }
  .${inst}__box {
    position: absolute;
    left: 0;
    width: 100%;
    height: 100%;
    top: calc(100% - var(--au-band));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    text-align: center;
    background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.6) 30%);
    transition: top 0.5s ease-in-out, padding-top 0.5s ease-in-out !important;
  }
  .${inst}:hover .${inst}__box,
  .${inst}:focus-within .${inst}__box { top: 0; padding-top: 1rem; }
  .${inst}__title {
    margin: 0 !important;
    height: var(--au-band);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3%;
    background: var(--au-gold) !important;
    color: var(--au-ink) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
    text-transform: uppercase !important;
    transition: background-color 0.3s ease-in-out, color 0.3s ease-in-out !important;
  }
  .${inst}:hover .${inst}__title,
  .${inst}:focus-within .${inst}__title {
    background-color: transparent !important;
    color: var(--au-text) !important;
    text-shadow: 0 -2px 8px rgba(0, 0, 0, 0.6);
  }
  .${inst}__title-link,
  .${inst}__title-link:link,
  .${inst}__title-link:visited,
  .${inst}__title-link:hover,
  .${inst}__title-link:focus,
  .${inst}__title-link:active {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: transparent !important;
    color: inherit !important;
    text-decoration: none !important;
  }
  .${inst}__title-link:focus { outline: none; }
  .${inst}__title-link::after {
    content: "";
    position: absolute;
    top: -1000px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }
  .${inst}__desc {
    display: block;
    padding: 3%;
    color: var(--au-text) !important;
    font-family: ${F400} !important;
    font-weight: 400 !important;
    font-size: 16px !important;
  }
  .${inst}__cta {
    display: inline-block;
    align-self: center;
    padding: 0 3%;
    margin-top: 0.5em;
    background: transparent !important;
    color: var(--au-gold) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .${inst}__box,
    .${inst}__title { transition: none !important; }
  }${reveal}`
}

// ---- Logo card: centered, contained icon/logo + optional hover reveal -------
// Built for square / transparent-background logos and icons. Unlike the hover
// card's full-bleed cover photo, the icon sits in a `__media` layer that reserves
// the band's height (bottom: var(--au-band)) and centers the logo *above* the band
// with object-fit: contain — so the band never overlaps it and transparent PNGs show
// the surface color behind them. The slide-up reveal is reused from the hover card
// but gated on a per-card `__box--reveal` class: a tile with body/CTA reveals on
// hover/focus; a plain icon tile (no `--reveal`) stays static. `revealable` adds the
// preview-only `--open` rules so the live preview can show the revealed state.
export function logoCardCss(
  inst: string,
  v: CardCssVars,
  opts: { revealable?: boolean; fit?: 'contain' | 'cover'; bg?: 'gradient' | 'solid' } = {},
): string {
  const reveal = opts.revealable
    ? `
  .${inst}--open .${inst}__box--reveal { top: 0; padding-top: 1rem; }
  .${inst}--open .${inst}__box--reveal .${inst}__title {
    background-color: transparent !important;
    color: var(--au-text) !important;
    text-shadow: 0 -2px 8px rgba(0, 0, 0, 0.6);
  }`
    : ''
  // 'cover' fills the media box and crops to the tile's Image-shape (no padding —
  // fill edge-to-edge); 'contain' shows the whole logo with breathing room. The
  // media box already stops at the band (bottom: var(--au-band)) for both.
  const cover = opts.fit === 'cover'
  const mediaPad = cover ? '0' : '6%'
  const iconSize = cover
    ? `    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;`
    : `    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;`
  // 'solid' fills the slide-up panel with the surface color so the revealed text sits
  // on an opaque background (icon hidden, maximum contrast); 'gradient' keeps the
  // default dark overlay so the icon shows through behind the text.
  const boxBg =
    opts.bg === 'solid' ? 'var(--au-surface)' : 'linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.6) 30%)'
  return `.${inst} {
${varsBlock(v)}
    position: relative;
    box-sizing: border-box;
    min-height: 250px;
    width: 100%;
    margin: 0;
    overflow: hidden;
    background: var(--au-surface);
    color: var(--au-text);
  }
  .${inst}:focus-within { outline: 3px solid var(--au-gold); outline-offset: -3px; }
  .${inst}__media {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: var(--au-band);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${mediaPad};
  }
  .${inst}__icon {
${iconSize}
    display: block;
  }
  .${inst}__icon--fa {
    display: flex;
    align-items: center;
    justify-content: center;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
  }
  .${inst}__icon--fa > i {
    font-size: 88px;
    line-height: 1;
    color: var(--au-text);
  }
  .${inst}__box {
    position: absolute;
    left: 0;
    width: 100%;
    height: 100%;
    top: calc(100% - var(--au-band));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    text-align: center;
    background: ${boxBg};
    transition: top 0.5s ease-in-out, padding-top 0.5s ease-in-out !important;
  }
  .${inst}:hover .${inst}__box--reveal,
  .${inst}:focus-within .${inst}__box--reveal { top: 0; padding-top: 1rem; }
  .${inst}__title {
    margin: 0 !important;
    height: var(--au-band);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3%;
    background: var(--au-gold) !important;
    color: var(--au-ink) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
    text-transform: uppercase !important;
    transition: background-color 0.3s ease-in-out, color 0.3s ease-in-out !important;
  }
  .${inst}:hover .${inst}__box--reveal .${inst}__title,
  .${inst}:focus-within .${inst}__box--reveal .${inst}__title {
    background-color: transparent !important;
    color: var(--au-text) !important;
    text-shadow: 0 -2px 8px rgba(0, 0, 0, 0.6);
  }
  .${inst}:hover .${inst}__box:not(.${inst}__box--reveal) .${inst}__title,
  .${inst}:focus-within .${inst}__box:not(.${inst}__box--reveal) .${inst}__title {
    background-color: var(--au-gold-hover) !important;
  }
  .${inst}__title-link,
  .${inst}__title-link:link,
  .${inst}__title-link:visited,
  .${inst}__title-link:hover,
  .${inst}__title-link:focus,
  .${inst}__title-link:active {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: transparent !important;
    color: inherit !important;
    text-decoration: none !important;
  }
  .${inst}__title-link:focus { outline: none; }
  .${inst}__title-link::after {
    content: "";
    position: absolute;
    top: -1000px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }
  .${inst}__desc {
    display: block;
    padding: 3%;
    color: var(--au-text) !important;
    font-family: ${F400} !important;
    font-weight: 400 !important;
    font-size: 16px !important;
  }
  .${inst}__cta {
    display: inline-block;
    align-self: center;
    padding: 0 3%;
    margin-top: 0.5em;
    background: transparent !important;
    color: var(--au-gold) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .${inst}__box,
    .${inst}__title { transition: none !important; }
  }${reveal}`
}

// Minimal Bootstrap-4 grid subset for the PREVIEW iframe only (offline,
// deterministic). The copy output ships no Bootstrap — the DNN theme provides it.
// Breakpoints (576/768) match Bootstrap 4 so preview parity holds.
export const PREVIEW_BOOTSTRAP_GRID_CSS = `.container-fluid {
    width: 100%;
    padding-right: 15px;
    padding-left: 15px;
    margin-right: auto;
    margin-left: auto;
    box-sizing: border-box;
  }
  .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
  .justify-content-center { justify-content: center; }
  .d-flex { display: flex !important; }
  [class*="col-"] {
    position: relative;
    width: 100%;
    padding-right: 15px;
    padding-left: 15px;
    box-sizing: border-box;
  }
  .col-12 { flex: 0 0 100%; max-width: 100%; }
  @media (min-width: 576px) {
    .col-sm-6 { flex: 0 0 50%; max-width: 50%; }
  }
  @media (min-width: 768px) {
    .col-md-12 { flex: 0 0 100%; max-width: 100%; }
    .col-md-9 { flex: 0 0 75%; max-width: 75%; }
    .col-md-6 { flex: 0 0 50%; max-width: 50%; }
    .col-md-4 { flex: 0 0 33.333333%; max-width: 33.333333%; }
    .col-md-3 { flex: 0 0 25%; max-width: 25%; }
  }
  @media (min-width: 992px) {
    .col-lg-4 { flex: 0 0 33.333333%; max-width: 33.333333%; }
    .col-lg-3 { flex: 0 0 25%; max-width: 25%; }
  }`

// Preview-only chrome that simulates the host page's sidebar layout, so the cards
// render in a content pane of the real width (full / 3-of-4 / 2-of-4). Placeholder
// sidebars are striped gray blocks; never part of the copy output.
export const PREVIEW_SIM_CSS = `.sim-page {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 15px;
    box-sizing: border-box;
  }
  .sim-side {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    margin-bottom: 16px;
    background: repeating-linear-gradient(135deg, #e2e8f0, #e2e8f0 10px, #eef2f7 10px, #eef2f7 20px);
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    color: #94a3b8;
    font: 600 13px system-ui, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }`
