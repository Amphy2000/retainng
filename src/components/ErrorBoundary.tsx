'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleResetState = () => {
    try {
      // Clear localStorage if data was corrupted
      if (typeof window !== 'undefined') {
        const keysToClean = [
          'kudi_retention_customers',
          'kudi_retention_sales',
          'kudi_retention_businesses',
          'kudi_retention_active_biz_id',
        ];
        keysToClean.forEach((k) => localStorage.removeItem(k));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900">Let&apos;s Get You Back On Track</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                RetainNG encountered a temporary loading glitch. Don&apos;t worry, your data is safe!
              </p>
              {this.state.error?.message && (
                <p className="text-[10px] text-slate-400 font-mono bg-slate-50 border border-slate-200 p-1.5 rounded-lg max-w-xs mx-auto truncate">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetState}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Reset Demo Data &amp; Refresh
              </button>

              <a
                href="/"
                className="text-xs text-slate-400 hover:text-slate-600 transition flex items-center justify-center gap-1 mt-1"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
