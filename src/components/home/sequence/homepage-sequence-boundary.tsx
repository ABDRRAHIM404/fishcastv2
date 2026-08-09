'use client';

import { Component, type ReactNode } from 'react';

interface HomepageSequenceBoundaryProps {
  children: ReactNode;
  onError: () => void;
  resetKey: string;
}

interface HomepageSequenceBoundaryState {
  failed: boolean;
}

/**
 * The cinematic sequence is progressive enhancement. A decode/runtime failure
 * must leave the semantic homepage and its static poster available.
 */
export class HomepageSequenceBoundary extends Component<
  HomepageSequenceBoundaryProps,
  HomepageSequenceBoundaryState
> {
  override state: HomepageSequenceBoundaryState = { failed: false };

  static getDerivedStateFromError(): HomepageSequenceBoundaryState {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override componentDidUpdate(previousProps: HomepageSequenceBoundaryProps) {
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
