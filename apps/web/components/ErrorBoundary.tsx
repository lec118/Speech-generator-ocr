"use client";

import { Component, ReactNode } from "react";
import { Button } from "@repo/ui";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 * Note: Error boundaries only catch errors in:
 * - Rendering
 * - Lifecycle methods
 * - Constructors of the whole tree below them
 *
 * They do NOT catch errors in:
 * - Event handlers (use try-catch)
 * - Asynchronous code (use try-catch)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Reload the page to reset the app state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-6">
          <div className="w-full max-w-md rounded-2xl border-0 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-3xl shadow-xl">
                ⚠️
              </div>
            </div>
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
                문제가 발생했습니다
              </h2>
              <p className="text-sm text-gray-600">
                예상치 못한 오류가 발생했습니다. 페이지를 새로고침해주세요.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 max-h-48 overflow-auto rounded-lg bg-gray-100 p-4">
                <p className="mb-2 text-xs font-semibold text-gray-700">Error Details:</p>
                <pre className="text-xs text-red-600">
                  {this.state.error.toString()}
                </pre>
                {this.state.error.stack && (
                  <pre className="mt-2 text-xs text-gray-600">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                className="h-12 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-semibold text-white shadow-md hover:from-indigo-700 hover:to-purple-700"
              >
                페이지 새로고침
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="h-12 w-full text-base font-semibold"
              >
                이전 페이지로 돌아가기
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
