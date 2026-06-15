import { useEffect, useState } from 'react'

// Tools are hash-routed (#/drawer, #/cards). Add a tool by extending Route and
// the ROUTES list; readRoute() matches the hash against it, defaulting to 'drawer'.
export type Route = 'drawer' | 'cards'

const ROUTES: Route[] = ['drawer', 'cards']

function readRoute(): Route {
  const id = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return (ROUTES as string[]).includes(id) ? (id as Route) : 'drawer'
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
