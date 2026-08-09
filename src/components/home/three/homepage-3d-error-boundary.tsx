'use client';

import { Component, type ReactNode } from 'react';

interface Homepage3DErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
  resetKey: string;
}

interface Homepage3DErrorBoundaryState {
  failed: boolean;
}

/**
 * WebGL is optional enhancement only. Any renderer, shader, or lazy-chunk
 * failure removes the canvas while the server-rendered homepage stays intact.
 */
export class Homepage3DErrorBoundary extends Component<
  Homepage3DErrorBoundaryProps,
  Homepage3DErrorBoundaryState
> {
  override state: Homepage3DErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): Homepage3DErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override componentDidUpdate(previousProps: Homepage3DErrorBoundaryProps) {
    if (
      this.state.failed &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ failed: false });
    }
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
