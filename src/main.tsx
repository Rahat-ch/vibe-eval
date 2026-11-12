import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Demo } from './components/Demo'
import { GrowthPlan } from './components/GrowthPlan'
import '@fontsource-variable/nunito'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.pathname.startsWith('/growth-plan') ? (
      <GrowthPlan />
    ) : /^\/demo\/?$/.test(location.pathname) ? (
      <Demo />
    ) : (
      <App />
    )}
  </StrictMode>,
)
