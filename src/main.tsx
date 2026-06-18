import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/gravity.css'
import './styles/overlay.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/Confirm'
import { SettingsProvider } from './lib/useSettings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
