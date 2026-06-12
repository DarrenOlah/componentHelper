import { DrawerTool } from './components/DrawerTool'
import { useHashRoute, type Route } from './lib/useHashRoute'
import { REPO_URL } from './lib/config'

type NavItem = { kind: 'route'; id: Route; label: string }

const NAV_ITEMS: NavItem[] = [
  { kind: 'route', id: 'drawer', label: 'Drawer' },
  // Future tools slot in here, e.g. { kind: 'route', id: 'cards', label: 'Cards' }
]

export default function App() {
  const [route] = useHashRoute()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <div className="flex-1 w-full py-2 px-4">

        {/* Nav: Drawer (more tools to come) */}
        <nav className="mb-4 text-sm" aria-label="Tool selector">
          {NAV_ITEMS.map((item, i) => (
            <span key={item.id}>
              {i > 0 && <span className="mx-2 text-gray-300">|</span>}
              {route === item.id ? (
                <span className="font-semibold text-blue-600" aria-current="page">{item.label}</span>
              ) : (
                <a href={`#/${item.id}`} className="text-gray-500 hover:text-blue-600 hover:underline">{item.label}</a>
              )}
            </span>
          ))}
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Component Helper</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Generate a pure-CSS slide-out drawer for a DNN Text/HTML module.
          </p>
        </div>

        <DrawerTool />

      </div>
      <footer className="sticky bottom-0 px-2 py-1 bg-white border-t border-gray-200 flex-shrink-0 flex justify-center sm:justify-end">
        <span className="text-[10px] text-gray-400 leading-none">Component Helper v{__APP_VERSION__} • <a className="underline hover:text-blue-500" href={REPO_URL} target="_blank" rel="noreferrer">View on GitHub</a></span>
      </footer>
    </div>
  )
}
