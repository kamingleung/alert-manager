/**
 * Standalone React entry point — no OSD dependencies.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';

// OUI CSS
import '@opensearch-project/oui/dist/eui_theme_light.css';

// OUI Context for proper styling
import { OuiContext } from '@opensearch-project/oui/lib/components/context';

import { AlarmsPage, AlarmsApiClient, HttpClient } from './components/alarms_page';

console.log('Alarms standalone app loading...');

/** Simple fetch-based HTTP client for standalone mode */
const standaloneHttp: HttpClient = {
  get: async <T extends unknown>(path: string): Promise<T> => {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  },
  post: async <T extends unknown>(path: string, body?: any): Promise<T> => {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json();
  },
  delete: async <T extends unknown>(path: string): Promise<T> => {
    const res = await fetch(path, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
    return res.json();
  },
};

const apiClient = new AlarmsApiClient(standaloneHttp);

const App = () => {
  console.log('App component rendering...');
  return (
    <OuiContext>
      <Router>
        <AlarmsPage apiClient={apiClient} />
      </Router>
    </OuiContext>
  );
};

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  ReactDOM.render(<App />, rootElement);
  console.log('React app mounted');
} else {
  console.error('Root element not found!');
}
