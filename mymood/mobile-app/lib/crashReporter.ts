interface CrashReport {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: string;
  severity: 'error' | 'warning' | 'critical';
  userAction?: string;
}

interface CrashReporterConfig {
  enableSentry: boolean;
  sentryDsn?: string;
  enableLocalLogging: boolean;
  enableConsoleLogging: boolean;
}

class CrashReporter {
  private config: CrashReporterConfig = {
    enableSentry: false,
    enableLocalLogging: true,
    enableConsoleLogging: true,
  };

  private reportLog: CrashReport[] = [];
  private maxReportsInMemory = 100;

  constructor() {
    this.initialize();
  }
  private initialize(): void {
    console.log('[CrashReporter] Initialized (Sentry: disabled, Local logging: enabled)');
  }

  captureError(error: Error | unknown, context?: Record<string, any>, userAction?: string): void {
    const report: CrashReport = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      severity: 'error',
      userAction,
    };

    this.log(report);
  }

  captureWarning(message: string, context?: Record<string, any>, userAction?: string): void {
    const report: CrashReport = {
      message,
      context,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      userAction,
    };

    this.log(report);
  }

  captureCritical(message: string, context?: Record<string, any>, userAction?: string): void {
    const report: CrashReport = {
      message,
      context,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      userAction,
    };

    this.log(report);
    console.error('[CrashReporter] CRITICAL:', report);
  }

  capturePromiseRejection(reason: any, promise: Promise<any>): void {
    const report: CrashReport = {
      message: `Unhandled Promise Rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      stack: reason instanceof Error ? reason.stack : undefined,
      context: { promiseState: 'rejected' },
      timestamp: new Date().toISOString(),
      severity: 'error',
    };

    this.log(report);
    console.error('[CrashReporter] Unhandled Promise Rejection:', report);
  }

  captureNetworkError(url: string, statusCode: number, error: string, context?: Record<string, any>): void {
    const report: CrashReport = {
      message: `Network Error: ${statusCode} from ${url}`,
      context: {
        ...context,
        url,
        statusCode,
        error,
      },
      timestamp: new Date().toISOString(),
      severity: statusCode >= 500 ? 'warning' : 'error',
    };

    this.log(report);
  }

  captureAudioError(songId: string, error: string, context?: Record<string, any>): void {
    const report: CrashReport = {
      message: `Audio Playback Error: ${error}`,
      context: {
        ...context,
        songId,
        component: 'AudioEngine',
      },
      timestamp: new Date().toISOString(),
      severity: 'error',
      userAction: 'Playing song',
    };

    this.log(report);
  }

  private log(report: CrashReport): void {
    this.reportLog.push(report);
    if (this.reportLog.length > this.maxReportsInMemory) {
      this.reportLog.shift();
    }
    if (this.config.enableConsoleLogging) {
      const color = this.getSeverityColor(report.severity);
      console.log(
        `%c[CrashReporter] ${report.severity.toUpperCase()}`,
        `color: ${color}; font-weight: bold`,
        report.message
      );

      if (report.stack) {
        console.log(report.stack);
      }

      if (report.context) {
        console.table(report.context);
      }
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#ff0000'; // Red
      case 'error':
        return '#ff6600'; // Orange
      case 'warning':
        return '#ffcc00'; // Yellow
      default:
        return '#00cc00'; // Green
    }
  }
  getReports(): CrashReport[] {
    return [...this.reportLog];
  }

  getReportsBySeverity(severity: string): CrashReport[] {
    return this.reportLog.filter((r) => r.severity === severity);
  }

  clearReports(): void {
    this.reportLog = [];
    console.log('[CrashReporter] Reports cleared');
  }

  exportReportsAsJSON(): string {
    return JSON.stringify(this.reportLog, null, 2);
  }

  setConfig(config: Partial<CrashReporterConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[CrashReporter] Configuration updated:', this.config);
  }
}

export const crashReporter = new CrashReporter();
export function setupGlobalErrorHandlers(): void {
  const originalErrorHandler = ErrorUtils.getGlobalHandler?.();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    if (isFatal === true) {
      crashReporter.captureCritical(error.message, { isFatal: true });
    } else {
      crashReporter.captureError(error);
    }
    originalErrorHandler?.(error, isFatal);
  });
  const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
    crashReporter.capturePromiseRejection(reason, promise);
  };
  if (typeof global.Promise !== 'undefined') {
    console.log('[CrashReporter] Global error handlers setup complete');
  }
}
