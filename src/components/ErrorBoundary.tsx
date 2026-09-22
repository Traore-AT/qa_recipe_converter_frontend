import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Boundary globale : capture toute erreur de rendu React et affiche un fallback FR. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-4" role="alert">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-error-container flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-error" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2L1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z" />
              </svg>
            </div>
            <h1 className="text-headline-md font-bold text-on-surface mb-2">Une erreur inattendue est survenue</h1>
            <p className="text-body-base text-on-surface-variant mb-6">
              L'application a rencontré un problème. Vos données sont en sécurité — vous pouvez réessayer.
            </p>
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-primary text-white rounded-lg text-label-md font-medium hover:brightness-110 transition-all cursor-pointer min-h-[44px]"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
