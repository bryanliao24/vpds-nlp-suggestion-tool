// src/main.jsx
import '@visa/nova-styles/styles.css';
import '@visa/nova-styles/themes/visa-light/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './App.css';  


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
