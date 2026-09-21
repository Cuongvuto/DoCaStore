import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' 
import App from './App.jsx'
import './index.css'
import { Toaster } from 'sonner'
import AppProviders from './context/AppProviders.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
        <Toaster position="top-right" richColors closeButton />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
)
