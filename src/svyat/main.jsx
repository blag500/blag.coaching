import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './svyat.css'
import App from './App.jsx'
import { setStart } from './nav'

// #спирката се прибира, преди React да покаже секциите — иначе браузърът сам
// скача до котвата в слоя с текста, а камерата остава в началото.
setStart(window.location.hash.slice(1))
if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search)

/* Светът „Благ“ (/svyat/) — пети вход на Vite. 3D кодът (three, fiber, drei)
   се зарежда само тук; приложението и магазинът не го теглят. */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
