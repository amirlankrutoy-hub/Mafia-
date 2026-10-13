import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { RoomProvider } from "./context/RoomContext";
import './index.css';
import { startVersionWatch } from './services/version';

startVersionWatch();

import { applySettings } from './services/settings';
applySettings();

ReactDOM.createRoot(document.getElementById('root')).render(
  <RoomProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </RoomProvider>
);