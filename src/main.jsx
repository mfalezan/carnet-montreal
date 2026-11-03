import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import App from './App.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import { configured } from './lib/supabase.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>{configured ? <App /> : <SetupScreen />}</StrictMode>
);
