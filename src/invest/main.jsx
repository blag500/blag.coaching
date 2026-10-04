import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import InvestDashboard from './InvestDashboard/InvestDashboard.jsx'

/* Отделна страница на същия адрес като приложението — значи същата сесия в
   localStorage: който е влязъл в Blag, е влязъл и тук. Без обвивката на
   приложението, без табовете, без service worker — само таблото. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <InvestDashboard />
  </StrictMode>,
)
