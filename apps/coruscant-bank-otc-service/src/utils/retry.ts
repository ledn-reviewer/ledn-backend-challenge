import logger from './logger';

/**
 * Options for retry function
 */
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors?: (error: any) => boolean;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffFactor: 2,
  retryableErrors: (error: any) => {
    // By default, retry network errors, timeouts and 5xx responses
    if (error?.code === 'ECONNREFUSED' ||
        error?.code === 'ECONNRESET' ||
        error?.code === 'ETIMEDOUT') {
      return true;
    }

    // For HTTP status errors
    if (error?.response?.status) {
      const status = error.response.status;
      return status >= 500 && status < 600;
    }

    return false;
  }
};

/**
 * Execute a function with retries
 * @param fn The function to execute
 * @param options Retry options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const retryOptions: RetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options
  };

  let lastError: Error | undefined;
  let attempt = 1;

  while (attempt <= retryOptions.maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const isRetryable = retryOptions.retryableErrors?.(error) ?? true;

      if (!isRetryable || attempt >= retryOptions.maxAttempts) {
        logger.error({
          error,
          attempt,
          maxAttempts: retryOptions.maxAttempts
        }, 'Operation failed, not retrying');
        throw error;
      }

      // Calculate backoff delay
      const delayMs = Math.min(
        retryOptions.initialDelayMs * Math.pow(retryOptions.backoffFactor, attempt - 1),
        retryOptions.maxDelayMs
      );

      logger.info({
        error,
        attempt,
        nextAttemptIn: delayMs,
        maxAttempts: retryOptions.maxAttempts
      }, 'Operation failed, will retry');

      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, delayMs));
      attempt++;
    }
  }

  // This should never happen due to the loop logic, but TypeScript needs it
  throw lastError;
}
