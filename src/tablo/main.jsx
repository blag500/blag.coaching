import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../plain.css'
import './tablo.css'
import TabloApp from './TabloApp/TabloApp.jsx'

/* Отделна страница на същия адрес като приложението — същата сесия, същият
   вход. Без обвивката на приложението. Service worker-ът (/tablo/sw.js) е само
   за известията от бележките: не кешира нищо, таблото винаги е прясно. */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/tablo/sw.js', { scope: '/tablo/' }).catch(() => {})
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TabloApp />
  </StrictMode>,
)
