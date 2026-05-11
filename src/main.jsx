import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { AuthProvider } from '@/contexts/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import '@/index.css';

// Using standard static imports to avoid dynamic import failures and silent blocking
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Failed to find the root element.");
} else {
  ReactDOM.createRoot(rootElement).render(
    <>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </>
  );
}