import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import { Provider } from 'react-redux'
import './index.css'
import App from './App.jsx'
// import { store } from './test_store'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <Provider> */}
      <App />
    {/* </Provider> */}
  </StrictMode>,
)
