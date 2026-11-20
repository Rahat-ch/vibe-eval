import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Demo } from './components/Demo'
import '@fontsource-variable/nunito'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/^\/demo\/?$/.test(location.pathname) ? <Demo /> : <App />}
  </StrictMode>,
)
