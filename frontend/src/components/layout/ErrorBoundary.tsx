import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  message: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ChainWatch UI error', error, info.componentStack)
  }

  render() {
    if (this.state.message) {
      return (
        <div className="grid h-full place-items-center bg-ink p-8 text-white">
          <div className="panel max-w-lg p-6">
            <p className="display-title text-[10px] text-crimson-bright">Console fault</p>
            <h1 className="mt-2 text-xl font-extrabold">The investigation view crashed</h1>
            <p className="mt-2 text-sm text-beige-dim">{this.state.message}</p>
            <button
              type="button"
              className="btn-pill btn-pill-ghost mt-4"
              onClick={() => this.setState({ message: null })}
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
