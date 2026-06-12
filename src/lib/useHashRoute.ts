import { useEffect, useState } from 'react'

// Only the Drawer tool exists today. The union/readRoute below is deliberately
// shaped so a second component generator (e.g. 'cards') slots in the same way
// heroHelper added its video tool: extend Route, add a branch in readRoute().
export type Route = 'drawer'

function readRoute(): Route {
  // Everything normalizes to 'drawer' for now.
  return 'drawer'
}

export function useHashRoute(): [Route, (next: Route) => void] {
  const [route, setRouteState] = useState<Route>(() => readRoute())

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/drawer')
    }
    const onHashChange = () => setRouteState(readRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setRoute = (next: Route) => {
    window.location.hash = `#/${next}`
  }

  return [route, setRoute]
}
