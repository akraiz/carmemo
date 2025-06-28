import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // Import the main App component
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';

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

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <NotificationProvider userId="demo-user">
          <ToastProvider>
            <App />
          </ToastProvider>
        </NotificationProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);