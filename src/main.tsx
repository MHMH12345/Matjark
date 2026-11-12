import { createRoot } from 'react-dom/client';
import 'material/styles/base';
import 'material/styles/typography';
import 'material/styles/button';
import 'material/styles/icon-button';
import 'material/styles/button-group';
import 'material/styles/list';
import 'material/styles/card';
import 'material/styles/text-field';
import 'material/styles/switch';
import 'material/styles/divider';
import 'material/styles/dialog';
import 'material/styles/bottom-sheet';
import 'material/styles/navigation-rail';
import 'material/styles/navigation-bar';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
