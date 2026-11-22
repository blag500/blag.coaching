import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../plain.css'
import '../tablo/tablo.css'
import App from './App.jsx'

/* Бележките (/belezhki/) — личният план, отделно от таблото (22.11.2026).
   Същият вход като приложението, вижда ги само собственикът (is_tablo_owner).
   Видът е на таблото: тъмно, плочки. Service worker-ът е само за известията. */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/belezhki/sw.js', { scope: '/belezhki/' }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
