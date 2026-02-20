import { Component, type ReactNode } from 'react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

// class component required -- React doesn't support error boundaries with hooks yet
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            An unexpected error occurred.
          </p>
          {this.state.error && (
            <pre className="text-xs text-left bg-muted border border-border rounded-lg p-3 overflow-auto max-h-[120px] text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
            <Button onClick={() => window.location.assign('/')}>
              Go home
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
