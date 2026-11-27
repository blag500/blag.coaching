import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../plain.css'
import './vrata.css'
import App from './App.jsx'

/* Вратата (/vrata/) — входът на магазина „Здраве и Сила“ (миграция 151).
   QR на вратата → тук. Телефон → SMS код веднъж → после само „Отвори“.
   Без supabase-js: три POST-а към zs-access, нищо повече. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
