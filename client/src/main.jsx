import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { BrowserRouter } from 'react-router-dom'
import "./assets/index.css";
import { CallProvider } from './context/CallContext.jsx';

createRoot(document.getElementById('root')).render(

  <CallProvider>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </CallProvider>
)
