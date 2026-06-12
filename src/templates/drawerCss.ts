// Static (input-independent) CSS for the slide-out drawer, exported as a string.
//
// Kept as a TS template literal rather than a `.css?raw` import: Vite's CSS
// pipeline intercepts the `.css` extension and returns an empty string under
// Vitest, so a real .css file can't be reliably read as raw text here. The
// per-instance rules (theme colors, widths, vertical position, open/closed
// transforms) are generated and appended by drawer.ts.
//
// DNN survival notes (preserved from the original demo):
//   - Toggle logic is keyed off the input's #id (ids survive DNN sanitizing
//     better than classes), so the slide still works if classes get stripped.
//   - The checkbox carries the "normalCheckBox" class = DNN's documented opt-out
//     so its dnnCheckbox jQuery leaves the real <input> alone.
//   - The carat is drawn with a ::before pseudo-element, NOT a real <span>:
//     CKEditor strips EMPTY inline elements on save. A pseudo-element has no node
//     to strip (the SVG data URI in CSS survives fine).
//   - Markup is XHTML-valid: lowercase tags, quoted attrs, self-closed <input/>.

export const DRAWER_STATIC_CSS = `.au-drawer,
.au-drawer * {
  box-sizing: border-box;
}

/* Visually-hidden but keyboard-focusable checkbox that drives the toggle.
   Its vertical anchor (top/bottom) is set in the generated block. */
.au-drawer__cb {
  position: fixed;
  right: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
}

/* The flyout = tab (left) + list panel (right), sliding as one unit.
   Vertical anchor and the closed transform are set in the generated block. */
.au-drawer__flyout {
  position: fixed;
  right: 0;
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  transition: transform 0.3s ease;
}

/* Always-visible vertical handle on the LEFT edge of the flyout. */
.au-drawer__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  width: var(--au-tab-w);
  padding: 0.85rem 0.25rem;

  /* Surface colors guarded against host skins. */
  background: var(--au-tab) !important;
  border: 2px solid var(--au-border) !important;
  border-right: 0 !important;

  cursor: pointer;
  user-select: none;
}

/* Label rotated to read top-to-bottom down the right edge. */
.au-drawer__text {
  -webkit-writing-mode: vertical-rl;
  writing-mode: vertical-rl;
  text-transform: uppercase !important;
  white-space: nowrap;
  /* Flip the vertical text 180deg so it reads bottom-to-top. The carat is a
     separate ::before on the tab, so it stays put at the top. */
  transform: rotate(180deg);
  /* Re-assert against host typography rules that target inline elements. */
  font-family: "GI-530", system-ui, Arial, sans-serif !important;
  font-weight: 530 !important;
  font-size: 0.95rem !important;
  letter-spacing: 0.02em !important;
  color: var(--au-tab-ink) !important;
}

/* Carat: left-pointing chevron (round caps) drawn as a ::before pseudo-element
   (no HTML node) so DNN's CKEditor can't strip it. The colored SVG data URI is
   emitted in the generated block so the carat follows the tab text color (a
   black carat would vanish on a dark tab). Flips right when open via scaleX(-1). */
.au-drawer__tab::before {
  content: "";
  display: block;
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  background: transparent center / 0.85rem no-repeat;
  transform: scaleX(1);
  transition: transform 0.3s ease;
}

/* The list panel (right part of the flyout). Width is set in the generated
   block (auto fit-content vs fixed rem). */
.au-drawer__panel {
  background: var(--au-panel) !important;
}

.au-drawer__list {
  list-style: none !important;
  margin: 0 !important;
  padding: 0.4rem 0 !important;
}

/* Links: force the component's white/G.I. look over host anchor styles.
   :link/:visited included so visited-link rules can't recolor them. */
.au-drawer__list a,
.au-drawer__list a:link,
.au-drawer__list a:visited {
  display: block !important;
  padding: 0.7rem 1rem !important;
  color: var(--au-link) !important;
  font-family: "GI-400", system-ui, Arial, sans-serif !important;
  font-weight: 400 !important;
  font-size: 0.95rem !important;
  line-height: 1.2 !important;
  text-decoration: none !important;
  text-transform: none !important;
  background: transparent !important;
}

.au-drawer__list a:hover,
.au-drawer__list a:focus {
  color: var(--au-link) !important;
  text-decoration: underline !important;
}

/* Carat flip when open (id-keyed so it survives class stripping). Position-
   independent, so it lives in the static rules. */
#au-drawer-cb:checked ~ #au-drawer-flyout .au-drawer__tab::before {
  transform: scaleX(-1);
}

/* Keyboard focus ring on the tab. */
#au-drawer-cb:focus-visible ~ #au-drawer-flyout .au-drawer__tab {
  outline: 3px solid var(--au-tab-ink);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .au-drawer__flyout,
  .au-drawer__tab::before {
    transition: none;
  }
}`
