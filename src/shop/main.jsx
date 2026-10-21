import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../plain.css'
import './shop.css'
import ShopApp from './ShopApp.jsx'

/* Онлайн магазинът здраве&сила — четвърти вход на Vite, като /tablo/:
   същият Supabase клиент, без обвивката на приложението, без service worker. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ShopApp />
  </StrictMode>,
)
