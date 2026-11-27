import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../plain.css'
import './chetec.css'
import App from './App.jsx'

/* Четецът (/chetec/) — тестовата платформа на мястото на QR четеца при
   вратата (миграции 152–153). Телефон, таблет или лаптоп с камера: чете
   личния QR от /vrata/, праща го на zs-access (scan) със своя ключ и показва
   какво би направила бравата. Истинският четец ще прави същия POST. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
