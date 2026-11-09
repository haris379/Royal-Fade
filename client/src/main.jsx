import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/manrope';
import './index.css';
import App from './App.jsx';
import { BusinessProvider } from './context/BusinessContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BusinessProvider>
        <App />
      </BusinessProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
