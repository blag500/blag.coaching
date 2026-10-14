import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import TabloApp from './TabloApp/TabloApp.jsx'

/* Отделна страница на същия адрес като приложението — същата сесия, същият
   вход. Без обвивката на приложението и без service worker, като /invest/. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TabloApp />
  </StrictMode>,
)
