import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
import App from './App';
import { StudioProvider } from './state/StudioContext';
import './styles.css';
import './visual.css';
import './components/controls.css';
import './views/overview.css';
import './views/consolidation.css';
import './art-direction.css';
import './views/landing.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StudioProvider>
      <App />
    </StudioProvider>
  </React.StrictMode>,
);
