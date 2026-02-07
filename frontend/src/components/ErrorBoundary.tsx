"use client";

import { Component, type ReactNode } from "react";
import { Result, Button } from "antd";
import { WarningOutlined, ReloadOutlined } from "@ant-design/icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in the component tree.
 * This provides a graceful fallback UI and prevents the entire app from crashing.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error);
      console.error("Error info:", errorInfo);
    }
    
    // You could also log to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
    
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
          <Result
            status="error"
            icon={<WarningOutlined className="text-red-500" />}
            title="Đã xảy ra lỗi"
            subTitle="Rất tiếc, ứng dụng đã gặp sự cố không mong muốn."
            extra={[
              <Button
                key="retry"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
              >
                Thử lại
              </Button>,
              <Button
                key="reload"
                onClick={this.handleReload}
              >
                Tải lại trang
              </Button>,
            ]}
          >
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg text-left max-w-lg mx-auto">
                <span className="font-semibold text-red-700 dark:text-red-300 block mb-2">Chi tiết lỗi (dev only):</span>
                <pre
                  className="text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32 bg-gray-100 dark:bg-gray-800 rounded p-2 whitespace-pre-wrap"
                >
                  <code>{this.state.error.message}</code>
                </pre>
                {this.state.error.stack && (
                  <pre
                    className="text-xs text-red-500 dark:text-red-400 overflow-auto max-h-40 mt-2 bg-gray-100 dark:bg-gray-800 rounded p-2 whitespace-pre-wrap"
                  >
                    <code>{this.state.error.stack.slice(0, 500)}...</code>
                  </pre>
                )}
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
