import type { ComponentType } from 'react'
import { DrawerTool } from './components/DrawerTool'
import { CardsTool } from './components/CardsTool'
import { useHashRoute, type Route } from './lib/useHashRoute'
import { REPO_URL } from './lib/config'

// One entry per tool: nav label, page heading/blurb, and the component to render.
// Add a tool by extending Route (useHashRoute) and adding an entry here + to NAV_ORDER.
const TOOLS: Record<Route, { label: string; blurb: string; Component: ComponentType }> = {
  drawer: {
    label: 'Drawer Helper',
    blurb: 'Generate a pure-CSS slide-out drawer for a DNN Text/HTML module.',
    Component: DrawerTool,
  },
  cards: {
    label: 'Card Helper',
    blurb: 'Generate a responsive, brand-styled row of cards for a DNN Text/HTML module.',
    Component: CardsTool,
  },
}
const NAV_ORDER: Route[] = ['drawer', 'cards']

export default function App() {
  const [route] = useHashRoute()
  const { label, blurb, Component } = TOOLS[route]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <div className="flex-1 w-full py-2 px-4">

        {/* Nav: one entry per tool */}
        <nav className="mb-4 text-sm" aria-label="Tool selector">
          {NAV_ORDER.map((id, i) => (
            <span key={id}>
              {i > 0 && <span className="mx-2 text-gray-300">|</span>}
              {route === id ? (
                <span className="font-semibold text-blue-600" aria-current="page">{TOOLS[id].label}</span>
              ) : (
                <a href={`#/${id}`} className="text-gray-500 hover:text-blue-600 hover:underline">{TOOLS[id].label}</a>
              )}
            </span>
          ))}
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{blurb}</p>
        </div>

        <Component />

      </div>
      <footer className="sticky bottom-0 px-2 py-1 bg-white border-t border-gray-200 flex-shrink-0 flex justify-center sm:justify-end">
        <span className="text-[10px] text-gray-400 leading-none">Component Helper v{__APP_VERSION__} • <a className="underline hover:text-blue-500" href={REPO_URL} target="_blank" rel="noreferrer">View on GitHub</a></span>
      </footer>
    </div>
  )
}
