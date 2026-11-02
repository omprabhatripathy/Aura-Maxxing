import { Component, type ErrorInfo, type ReactNode } from 'react';
import Button from '../Button';
import './feedback.css';

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  error: Error | null;
  resetKey?: string;
}

/** Catches render errors in a page so one broken view never blanks the whole app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Navigating to another page clears the error.
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-state" role="alert">
        <h2 className="text-headline-md">This page hit a problem</h2>
        <p className="text-muted">Your data is safe. Try again, or go back to the dashboard.</p>
        <div className="error-state__actions">
          <Button onClick={() => this.setState({ error: null })}>Try again</Button>
          <Button variant="ghost" onClick={() => window.location.assign('/')}>
            Dashboard
          </Button>
        </div>
      </div>
    );
  }
}
