import React from 'react';

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // You can log error to an error reporting service here
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#F7C843', background: '#232323', padding: 32, textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>Something went wrong.</h1>
          <p style={{ fontSize: 18, marginBottom: 24 }}>Our team has been notified. Please refresh the page or try again later.</p>
          <span style={{ fontSize: 48, marginBottom: 8 }}>🛠️</span>
        </div>
      );
    }
    return this.props.children;
  }
} 