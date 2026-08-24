import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { captureSource } from './utils/source'
import { setupPwaAutoUpdate } from './lib/pwaUpdate'

// Read before anything renders: it strips the parameter from the address, and
// a render that got there first could leave the stripped URL in history twice.
captureSource()
setupPwaAutoUpdate()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
