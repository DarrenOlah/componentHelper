# CLAUDE.md

Guidance for working in this repo.

## What this is

**Component Helper** — a Vite + React + TypeScript + Tailwind app that generates
copy-paste HTML/CSS snippets for DNN (DotNetNuke) Text/HTML modules. It mirrors
the architecture of the sister `heroHelper` repo. It's a *multi-tool* app; the
tools today are the **Drawer** (`#/drawer`) and the **Card Helper** (`#/cards`).

The repo/app name is `componentHelper`; the working folder is `audienceHelper`.

## Architecture

- `src/App.tsx` — shell: tool nav (`NAV_ITEMS`), header, footer. Add tools here.
- `src/lib/useHashRoute.ts` — hash router. `Route` is currently just `'drawer'`;
  widen the union + add a `readRoute` branch to add a tool (the heroHelper pattern).
- `src/lib/drawer.ts` — **pure** generator (no React/DOM). `generateDrawerHtml`
  builds the `<style>` + markup; `generateDrawerPreviewHtml` wraps it in a full
  doc for the sandboxed iframe preview. Contains all escaping/sanitization.
- `src/templates/drawerCss.ts` — the static, input-independent drawer CSS as an
  exported string. **Why a `.ts` string, not `.css?raw`:** Vite's CSS pipeline
  intercepts the `.css` extension and `?raw` returns empty under Vitest. Keep
  static CSS here; generate the per-instance rules in `drawer.ts`.
- `src/components/DrawerTool.tsx` — the tool UI, laid out in four columns:
  (1) label + links, (2) colors + vertical position + widths, (3) live iframe
  preview (always-expanded toggle, fullscreen, tab-overflow warning), (4) gated
  HTML output + copy + reset.
- `src/components/ColorField.tsx` — reusable Army-brand color palette (preset
  swatches + custom hex + native picker), used for both drawer colors.
- `src/lib/cards.ts` — **pure** Card Helper generator (mirrors `drawer.ts`), plus
  the persistence coercers (`coerceSnapshot` / `coercePersistedCards` /
  `coerceCollections`) that validate anything read back from storage. DOM-free.
- `src/lib/parseCards.ts` — best-effort **importer** (`parseCardsHtml`): recovers
  editable fields from pasted generated HTML (whole block, markup-only, or a
  rendered-page copy), falling back to defaults rather than failing. Intentionally
  DOM-aware (`DOMParser`), so it lives apart from the pure `cards.ts`; its test sets
  `// @vitest-environment jsdom` (the only jsdom test — `jsdom` is a devDependency).
- `src/components/CardsTool.tsx` — Card Helper UI. Owns the browser-local state it
  manages itself (localStorage I/O stays out of the pure libs): a debounced autosave
  draft (`componentHelper-cards-draft`) and named collections
  (`componentHelper-cards-collections`). "Start over" wipes the draft; "Reset
  settings" resets only the look, keeping cards. Its **Import** / **Saved Card
  Collections** buttons render into App's right-aligned `#cards-nav-slot` via a
  `createPortal`, so the tool keeps state ownership while pinning controls to the nav row.
- `public/fonts/` — brand G.I. `woff2` fonts, served at `base`. Loaded via
  `@font-face` **into the preview iframe only** (`generateDrawerPreviewHtml`), so
  the preview renders in the real typeface; the copy output stays `@font-face`-free.
- `demo/` — the original standalone HTML demo and brand fonts. Reference only.

## Conventions

- Keep generation logic pure and in `src/lib/*`; unit-test it (`*.test.ts`, Vitest).
- The Drawer is **position: fixed**, so its preview must be a sandboxed
  `<iframe srcDoc>` (it can't render inline).
- **HTML escaping** for output is entity-based (`escapeHtmlAttr` / `escapeHtmlText`),
  not JS-string escaping. `safeHref` neutralizes non-allowlisted schemes.
- **CSS values** (colors, rem widths) are sanitized before being interpolated
  into `<style>` to prevent injection.
- Preserve the DNN/CKEditor survival traits in any generated markup: id-keyed
  toggle (`#au-drawer-cb:checked ~ #au-drawer-flyout`), `normalCheckBox` on the
  input, the SVG carat as a `::before`, XHTML-valid tags, and **no `@font-face`**
  in output.

## Commands

```bash
npm run dev | test | test:run | build | lint
```

Always run `npm run test:run` and `npm run build` after touching the generators or
their CSS — `src/lib/drawer.ts`, `src/templates/drawerCss.ts`, `src/lib/cards.ts`,
`src/lib/parseCards.ts`, or `src/templates/cardsCss.ts`.
