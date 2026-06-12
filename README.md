# Component Helper

A small web tool that generates copy-paste **HTML + CSS** for self-contained UI
components to drop into a DotNetNuke (DNN) **Text/HTML module**. Built as a
multi-tool app so more component generators can be added over time.

Sister project to [heroHelper](https://github.com/DarrenOlah/heroHelper) and
shares its stack and conventions.

## Tools

### Drawer
A pure-CSS, zero-JS slide-out drawer: a vertical tab pinned to the right edge of
the screen that slides a panel of links into view when clicked. You provide:

- a **tab label**,
- an arbitrary list of **links** (add / remove / reorder),
- **colors** (tab/background and ink/border/panel),
- **vertical position** (top / middle / bottom),
- **widths** — fixed, or **auto-fit to the longest link**, with an optional max-width cap.

The generated snippet is hardened for DNN's CKEditor (id-keyed toggle that
survives class-stripping, `normalCheckBox` opt-out, an SVG carat drawn as a
`::before` pseudo-element, XHTML-valid markup). It references the brand font
families `GI-530` / `GI-400` that the DNN page already loads.

## Develop

```bash
npm install
npm run dev        # Vite dev server
npm run test       # Vitest (watch)
npm run test:run   # Vitest (once)
npm run build      # typecheck + production build
npm run lint
```

## Project layout

```
src/
  App.tsx                  app shell + tool nav (hash routes)
  lib/
    useHashRoute.ts        hash router (currently 'drawer')
    config.ts              GitHub-Pages URL derivation
    drawer.ts              pure generator: generateDrawerHtml / *PreviewHtml + escaping
    drawer.test.ts         unit tests for the generator
  components/
    DrawerTool.tsx         the Drawer tool UI
    SectionLabel.tsx       shared numbered section header
  templates/
    drawerCss.ts           static (input-independent) drawer CSS as a string
demo/                      the original standalone HTML demo + brand fonts
```

The pure generator lives in `src/lib/drawer.ts` and has no React/DOM
dependencies, so it's unit-tested directly.

## Deploy

A tag push (`v*`) triggers the GitHub Actions workflow which builds and publishes
to GitHub Pages. `vite.config.ts` sets `base: '/componentHelper/'` for
project-pages asset paths.
