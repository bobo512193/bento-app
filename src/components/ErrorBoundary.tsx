import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 13, overflowWrap: 'break-word' }}>
          <div style={{ color: 'red', fontWeight: 'bold', marginBottom: 8 }}>
            ⚠ App crashed — please screenshot this
          </div>
          <div style={{ marginBottom: 4 }}><b>Message:</b> {error.message}</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#555' }}>
            {error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
