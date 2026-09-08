/**
 * @fileoverview React application entry point.
 * This file is responsible for rendering the root React application component
 * into the DOM and setting up global providers like React.StrictMode.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App';
import './index.css';

// Mount the React application to the root DOM element
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>
);
