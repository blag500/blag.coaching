import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../plain.css'
import './tablo.css'
import TabloApp from './TabloApp/TabloApp.jsx'

/* Отделна страница на същия адрес като приложението — същата сесия, същият
   вход. Без обвивката на приложението и без service worker, като /invest/.
   Бележките, които бяха тук за ден, са отделно — /belezhki/. Ако телефонът
   още държи стария /tablo/sw.js, той се маха. */
navigator.serviceWorker?.getRegistrations?.().then((rs) => rs
  .filter((r) => new URL(r.scope).pathname === '/tablo/').forEach((r) => r.unregister())).catch(() => {})
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TabloApp />
  </StrictMode>,
)
