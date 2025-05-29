import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { MintlayerProvider } from '@mintlayer/react'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MintlayerProvider>
      <App />
    </MintlayerProvider>
  </StrictMode>,
)
