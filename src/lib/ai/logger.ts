// AI Provider Test Logger
// =======================

import type { TestSummary, LoggingConfig } from '@/types/api-test';

export class TestLogger {
  private config: LoggingConfig;

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = {
      enableFileLogging: true,
      enableConsoleLogging: true,
      logDirectory: 'logs',
      maxLogFiles: 10,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Log a test summary to both console and file
   */
  public logTestSummary(summary: TestSummary): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      summary,
      type: 'API_TEST_SUMMARY',
    };

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(summary);
    }

    // File logging
    if (this.config.enableFileLogging) {
      this.logToFile(logEntry).catch(error => {
        console.warn('Failed to write to log file:', error);
      });
    }
  }

  /**
   * Log individual test result
   */
  public logTestResult(provider: string, success: boolean, responseTime: number, error?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      provider,
      success,
      responseTime,
      error,
      type: 'API_TEST_RESULT',
    };

    // Console logging for immediate feedback
    if (this.config.enableConsoleLogging) {
      this.logProviderResult(provider, success, responseTime, error);
    }

    // File logging
    if (this.config.enableFileLogging) {
      this.logToFile(logEntry).catch(error => {
        console.warn('Failed to write to log file:', error);
      });
    }
  }

  /**
   * Log environment check results
   */
  public logEnvironmentCheck(allPresent: boolean, missing: string[]): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      allPresent,
      missing,
      type: 'ENVIRONMENT_CHECK',
    };

    if (this.config.enableConsoleLogging) {
      console.log(`🔍 Environment Check: ${allPresent ? '✅ All variables present' : '❌ Missing variables: ' + missing.join(', ')}`);
    }

    if (this.config.enableFileLogging) {
      this.logToFile(logEntry).catch(error => {
        console.warn('Failed to write to log file:', error);
      });
    }
  }

  /**
   * Format and log test summary to console
   */
  private logToConsole(summary: TestSummary): void {
    const { total, successful, failed, successRate, duration } = summary;
    const header = '\n' + '='.repeat(45);
    const footer = '='.repeat(45);

    console.log(`${header}`);
    console.log(`BLOCKWISE AI - API KEY TEST RESULTS`);
    console.log(header);
    console.log(`Date: ${new Date().toLocaleDateString()}`);
    console.log(`Time: ${new Date().toLocaleTimeString()}`);
    console.log();
    console.log(`Testing ${total} AI Providers...`);
    console.log();

    // Log individual results
    summary.results.forEach(result => {
      this.logProviderResult(result.provider, result.success, result.responseTime, result.error);
    });

    console.log();
    console.log(footer);
    console.log(`${successful}/${total} providers working (${successRate.toFixed(1)}%)`);
    console.log(`Duration: ${duration}ms`);
    console.log();
    console.log(failed > 0 ? 'Next step: Fix failed providers and retry' : 'All providers working correctly!');
    console.log(footer);
  }

  /**
   * Format and log individual provider result
   */
  private logProviderResult(provider: string, success: boolean, responseTime: number, error?: any): void {
    const responseTimeStr = `${responseTime}ms`;
    
    if (success) {
      console.log(`✓ ${provider}: SUCCESS (response in ${responseTimeStr})`);
    } else {
      console.log(`✗ ${provider}: FAILED`);
      if (error) {
        console.log(`  Error: ${error.message || error}`);
        if (error.details) {
          console.log(`  Details: ${error.details}`);
        }
      }
    }
  }

  /**
   * Write log entry to file
   */
  private async logToFile(logEntry: any): Promise<void> {
    try {
      // Ensure log directory exists
      await this.ensureLogDirectory();
      
      const logFileName = `ai-provider-test-${new Date().toISOString().split('T')[0]}.log`;
      const logFilePath = `${this.config.logDirectory}/${logFileName}`;
      
      // Format log entry
      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Append to file using fetch API (for Next.js)
      if (typeof window === 'undefined') {
        // Server-side: use fs
        const fs = await import('fs/promises');
        await fs.appendFile(logFilePath, logLine, 'utf8');
      } else {
        // Client-side: use localStorage for persistence
        this.logToLocalStorage(logEntry);
      }
    } catch (error) {
      console.warn('Failed to write log to file:', error);
    }
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    if (typeof window === 'undefined') {
      // Server-side: create directory
      const fs = await import('fs/promises');
      const path = await import('path');
      
      try {
        await fs.access(this.config.logDirectory);
      } catch {
        await fs.mkdir(this.config.logDirectory, { recursive: true });
      }
    }
  }

  /**
   * Log to localStorage (for client-side persistence)
   */
  private logToLocalStorage(logEntry: any): void {
    try {
      const storageKey = 'blockwise-ai-test-logs';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Keep only last 100 log entries
      const updatedLogs = [...existingLogs.slice(-99), logEntry];
      
      localStorage.setItem(storageKey, JSON.stringify(updatedLogs));
    } catch (error) {
      console.warn('Failed to log to localStorage:', error);
    }
  }

  /**
   * Get test history from localStorage
   */
  public getTestHistory(): any[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storageKey = 'blockwise-ai-test-logs';
      const logs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Filter for test summaries only and return last 10
      return logs
        .filter((log: any) => log.type === 'API_TEST_SUMMARY')
        .slice(-10);
    } catch (error) {
      console.warn('Failed to read test history:', error);
      return [];
    }
  }

  /**
   * Clean up old logs (server-side only)
   */
  public async cleanupOldLogs(): Promise<void> {
    if (typeof window !== 'undefined') {
      return; // Client-side: no file cleanup needed
    }

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const files = await fs.readdir(this.config.logDirectory);
      const logFiles = files.filter(f => f.startsWith('ai-provider-test-') && f.endsWith('.log'));
      
      // Sort by modification time (newest first)
      const fileStats = await Promise.all(
        logFiles.map(async (file) => ({
          file,
          mtime: (await fs.stat(path.join(this.config.logDirectory, file))).mtime
        }))
      );
      
      fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Remove old files beyond maxLogFiles
      if (fileStats.length > this.config.maxLogFiles) {
        const filesToDelete = fileStats.slice(this.config.maxLogFiles);
        await Promise.all(
          filesToDelete.map(f => fs.unlink(path.join(this.config.logDirectory, f.file)))
        );
      }
    } catch (error) {
      console.warn('Failed to cleanup old logs:', error);
    }
  }
}

// Export singleton instance
export const testLogger = new TestLogger();