import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Success from './Success.jsx'
import Scanner from './scanner/Scanner.jsx'

const isSuccessPage = new URLSearchParams(window.location.search).has('payment_intent_client_secret');
const pathname = window.location.pathname;
const isScannerPage = pathname === '/scanner' || pathname.endsWith('/scanner') || pathname.endsWith('/scanner/');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isScannerPage ? <Scanner /> : (isSuccessPage ? <Success /> : <App />)}
  </StrictMode>,
)
