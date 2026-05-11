import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { RolesProvider } from './context/RolesContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RolesProvider>
        <App />
      </RolesProvider>
    </AuthProvider>
  </StrictMode>,
)
