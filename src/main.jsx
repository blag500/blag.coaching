import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { captureSource } from './utils/source'

// Read before anything renders: it strips the parameter from the address, and
// a render that got there first could leave the stripped URL in history twice.
captureSource()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
