'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  level?: 'page' | 'component' | 'section';
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GamificationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Gamification Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;
      
      const defaultErrorUI = (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {level === 'page' ? 'Page Error' : level === 'section' ? 'Section Error' : 'Component Error'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground">
              <p>
                {level === 'page' 
                  ? 'The gamification page encountered an error and couldn\'t load properly.'
                  : level === 'section'
                  ? 'This section of the gamification dashboard failed to load.'
                  : 'This component encountered an unexpected error.'
                }
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">Error Details</summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="default" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = '/gamification'} 
                variant="outline" 
                size="sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      );

      return defaultErrorUI;
    }

    return this.props.children;
  }
}

// HOC for easier usage
export function withGamificationErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <GamificationErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </GamificationErrorBoundary>
  );
  
  WrappedComponent.displayName = `withGamificationErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error handling in functional components
export function useGamificationErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    console.error('Gamification Error:', error, errorInfo);
    // Here you could also send to error reporting service
  };
}

// Error boundary specifically for data loading
export function DataLoadingErrorBoundary({ 
  children, 
  onRetry 
}: { 
  children: ReactNode; 
  onRetry?: () => void; 
}) {
  return (
    <GamificationErrorBoundary 
      level="section"
      onReset={onRetry}
      fallback={
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load data</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the gamification data. Please try again.
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      }
    >
      {children}
    </GamificationErrorBoundary>
  );
}