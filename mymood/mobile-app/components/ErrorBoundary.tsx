import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { AlertCircle, RotateCw } from 'lucide-react-native';
import { crashReporter } from '@/lib/crashReporter';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, retry: () => void, resetError: () => void) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState((state) => ({
      errorCount: state.errorCount + 1,
    }));
    crashReporter.captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorCount: this.state.errorCount + 1,
    });
    this.props.onError?.(error, errorInfo);

    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    if (__DEV__) {
      console.error(
        '[ErrorBoundary] Error Caught by Error Boundary:',
        error.message
      );
    }
  }

  retry = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
    if (this.state.errorCount > 5) {
      console.error(
        '[ErrorBoundary] Multiple Errors Detected:',
        'The app encountered multiple errors. Please restart the app.'
      );
      this.setState({ errorCount: 0 });
    }
  };

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
    });

    crashReporter.captureWarning('Error boundary reset by user');
  };

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback ? (
        this.props.fallback(this.state.error, this.retry, this.resetError)
      ) : (
        <DefaultErrorFallback
          error={this.state.error}
          errorCount={this.state.errorCount}
          onRetry={this.retry}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  errorCount,
  onRetry,
  onReset,
}: {
  error: Error;
  errorCount: number;
  onRetry: () => void;
  onReset: () => void;
}): React.ReactElement {
  return (
    <ScrollView className="flex-1 bg-red-50">
      <View className="flex-1 px-4 py-8">
        {/* Error Icon */}
        <View className="items-center mb-6">
          <View className="bg-red-100 rounded-full p-4 mb-4">
            <AlertCircle size={48} color="#dc2626" />
          </View>
          <Text className="text-2xl font-bold text-red-900 text-center mb-2">Oops! Something went wrong</Text>
          <Text className="text-sm text-red-700 text-center">
            {errorCount > 1 ? `This error has occurred ${errorCount} times.` : 'An unexpected error occurred.'}
          </Text>
        </View>

        {/* Error Details */}
        <View className="bg-white rounded-lg p-4 mb-6 border border-red-200">
          <Text className="text-xs font-bold text-red-900 mb-2">Error Details</Text>
          <Text className="text-sm text-gray-700 font-mono mb-2">{error.message}</Text>

          {__DEV__ && error.stack && (
            <View className="mt-4 pt-4 border-t border-gray-200">
              <Text className="text-xs font-bold text-gray-600 mb-2">Stack Trace</Text>
              <Text className="text-xs text-gray-600 font-mono">{error.stack.substring(0, 300)}...</Text>
            </View>
          )}
        </View>

        {/* Recovery Tips */}
        <View className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <Text className="text-sm font-bold text-blue-900 mb-2">What you can try:</Text>
          <View className="space-y-1">
            <Text className="text-sm text-blue-800">• Tap "Try Again" to retry the operation</Text>
            <Text className="text-sm text-blue-800">• Tap "Reset" to clear the error state</Text>
            <Text className="text-sm text-blue-800">• Close and reopen the app if problems persist</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="space-y-3">
          {/* Retry Button */}
          <TouchableOpacity
            onPress={onRetry}
            className="flex-row items-center justify-center bg-blue-600 rounded-lg py-3 active:bg-blue-700"
          >
            <RotateCw size={18} color="white" />
            <Text className="ml-2 text-white font-semibold">Try Again</Text>
          </TouchableOpacity>

          {/* Reset Button */}
          <TouchableOpacity
            onPress={onReset}
            className="flex-row items-center justify-center bg-gray-600 rounded-lg py-3 active:bg-gray-700"
          >
            <AlertCircle size={18} color="white" />
            <Text className="ml-2 text-white font-semibold">Reset</Text>
          </TouchableOpacity>

          {/* Development Info */}
          {__DEV__ && (
            <Text className="text-xs text-gray-600 text-center mt-4">
              [DEV MODE] Error reported to crash reporter
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
