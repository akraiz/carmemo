import React, { useContext } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // Import the main App component
import { LanguageProvider, LanguageContext } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

// Add global error logging
window.addEventListener('error', (event) => {
  console.error('🚨 Global error caught:', event.error);
  console.error('🚨 Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled promise rejection:', event.reason);
});

// Add React error boundary logging
const originalConsoleError = console.error;
console.error = (...args) => {
  console.log('🚨 React error detected:', args);
  originalConsoleError.apply(console, args);
};

// Add global click event logging for debugging
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    // Track button clicks for analytics
  }
});

console.log('�� App starting...');

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);

// Guarded App Shell
const GuardedApp = () => (
  <NotificationProvider userId="demo-user">
    <ToastProvider>
      <App />
      <Toaster position="top-center" toastOptions={{
        style: {
          marginTop: 'env(safe-area-inset-top, 0px)',
          maxWidth: '90vw',
          width: 'auto',
          fontSize: '1rem',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        },
      }} />
    </ToastProvider>
  </NotificationProvider>
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <GuardedApp />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);