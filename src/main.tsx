import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Font Awesome Free 6.4.2 (matches the live site) for the in-tool icon picker and
// the selected-icon previews. Bundled so it loads regardless of base path / dev
// restart. Generated card output ships no FA CSS — the live site provides it; the
// sandboxed preview iframe loads its own copy from public/fontawesome.
import '@fortawesome/fontawesome-free/css/all.min.css'
import './index.css'
import App from './App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
