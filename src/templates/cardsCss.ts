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

const MD_COL: Record<2 | 3 | 4, string> = { 2: 'col-md-6', 3: 'col-md-4', 4: 'col-md-3' }

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
export function cardGridCss(gridClass: string, cardsPerRow: 2 | 3 | 4, gap = CARD_GAP_PX): string {
  const mdCol = MD_COL[cardsPerRow]
  // Flex-basis for n equal columns sharing (n-1) gaps across a 100% row.
  const w = (n: number) => `calc((100% - ${(n - 1) * gap}px) / ${n})`
  // Compound selector + !important so the zeroed gutters beat the host theme's
  // single-class `.container-fluid { padding: 0 15px }` regardless of load order.
  return `.container-fluid.${gridClass} { padding-right: 0 !important; padding-left: 0 !important; }
  .${gridClass} > .row { margin-right: 0; margin-left: 0; gap: ${gap}px; }
  .${gridClass} > .row > [class*="col-"] { padding-right: 0; padding-left: 0; }
  .${gridClass} > .row > .col-12 { flex: 0 0 100%; max-width: 100%; }
  @media (min-width: 576px) {
    .${gridClass} > .row > .col-sm-6 { flex: 0 0 ${w(2)}; max-width: ${w(2)}; }
  }
  @media (min-width: 768px) {
    .${gridClass} > .row > .${mdCol} { flex: 0 0 ${w(cardsPerRow)}; max-width: ${w(cardsPerRow)}; }
  }`
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
    border: 3px solid var(--au-text);
    object-fit: cover;
    object-position: center;
    background: var(--au-surface);
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
    height: var(--au-band);
    box-sizing: border-box;
    padding: 0 12px;
    background: var(--au-gold) !important;
    color: var(--au-ink) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
    text-transform: uppercase !important;
    text-align: center;
    text-decoration: none !important;
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
    height: var(--au-band);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    background: var(--au-gold) !important;
    color: var(--au-ink) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
    text-transform: uppercase !important;
    text-align: center;
    text-decoration: none !important;
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
    transition: top 0.5s ease-in-out, padding-top 0.5s ease-in-out;
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
    transition: background-color 0.3s ease-in-out, color 0.3s ease-in-out;
  }
  .${inst}:hover .${inst}__title,
  .${inst}:focus-within .${inst}__title {
    background-color: transparent !important;
    color: var(--au-text) !important;
    text-shadow: 0 -2px 8px rgba(0, 0, 0, 0.6);
  }
  .${inst}__desc {
    display: block;
    padding: 3%;
    color: var(--au-text) !important;
    font-family: ${F400} !important;
    font-weight: 400 !important;
    font-size: 16px !important;
  }
  .${inst}__cta,
  .${inst}__cta:link,
  .${inst}__cta:visited {
    display: inline-block;
    align-self: center;
    padding: 0 3%;
    margin-top: 0.5em;
    background: transparent !important;
    color: var(--au-gold) !important;
    font-family: ${F530} !important;
    font-weight: 530 !important;
    font-size: 18px !important;
    text-decoration: none !important;
  }
  .${inst}__cta:hover,
  .${inst}__cta:focus {
    background: transparent !important;
    color: var(--au-gold) !important;
    text-decoration: none !important;
  }
  .${inst}__cta:focus { outline: none; }
  .${inst}__cta::after {
    content: "";
    position: absolute;
    top: -1000px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .${inst}__box { transition: none; }
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
