import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center border border-dashed border-destructive/50 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mb-2 h-8 w-8 text-destructive" />
          <h3 className="text-sm font-semibold text-destructive">Something went wrong</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
            We couldn't render this component. Try refreshing the page.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4 h-8"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
