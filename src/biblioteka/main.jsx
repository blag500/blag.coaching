import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../plain.css'
import './biblioteka.css'
import App from './App.jsx'

/* Библиотеката (/biblioteka/) — всички страници на сайта на едно място, с
   проверка дали отговарят, готови адреси за проба и QR за отваряне на друго
   устройство. Списъкът е в pages.js. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
