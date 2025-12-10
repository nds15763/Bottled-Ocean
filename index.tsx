import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

function mountApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Wait for CSS to be loaded before mounting React
// This fixes iOS WKWebView CSS timing issues
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Add small delay to ensure CSS is fully applied
    setTimeout(mountApp, 50);
  });
} else {
  // Document already loaded, add delay to ensure CSS application
  setTimeout(mountApp, 50);
}
