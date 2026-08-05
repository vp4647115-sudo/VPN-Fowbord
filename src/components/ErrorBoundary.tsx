import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in FlowBoard AI:', error, errorInfo);
  }

  public render() {
    const state = (this as any).state as State;
    const props = (this as any).props as Props;

    if (state.hasError) {
      return (
        <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-6 text-center">
          <div className="bg-white border border-[#c3c6d7]/50 rounded-2xl p-8 max-w-md shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h2 className="text-lg font-bold text-[#191c1e] font-headline">Something went wrong</h2>
            <p className="text-xs text-[#737686] leading-relaxed">
              FlowBoard AI encountered an unexpected issue while rendering the workspace canvas.
            </p>
            {state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left text-[11px] font-mono text-red-700 overflow-x-auto max-h-24">
                {state.error.toString()}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#004ac6] hover:bg-[#2563eb] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return props.children;
  }
}
