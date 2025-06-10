import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import store from "../store/Store.ts"
import { PersistGate } from 'redux-persist/integration/react'
import { persistStore } from 'redux-persist'
import { Provider } from 'react-redux'
import {BrowserRouter} from 'react-router-dom'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
     <Provider store={store}>
      <PersistGate persistor={persistStore(store)}>
    <App />   
    </PersistGate>
   </Provider>
    </BrowserRouter>
  </StrictMode>,
)
