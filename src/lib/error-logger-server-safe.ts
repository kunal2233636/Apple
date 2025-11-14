// Server-safe Error Logger
// This is a version that works on the server, and can be used in client components
// but will only log to console on the server.

import type { ErrorContext } from './error-logger'; // Keep type import if needed

// Server-safe logError that falls back to console.error
export function logError(error: Error, context: ErrorContext = {}): string {
  const errorId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.error(`[${errorId}] ${error.message}`, context);
  return errorId;
}

// Server-safe logInfo that works on the server
export function logInfo(message: string, context: ErrorContext = {}): string {
  const infoId = `server_info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.info(`[${infoId}] ${message}`, context);
  return infoId;
}

// Server-safe logWarning that works on the server
export function logWarning(message: string, context: ErrorContext = {}): string {
  const warningId = `server_warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.warn(`[${warningId}] ${message}`, context);
  return warningId;
}

export type { ErrorContext };