/**
 * Retry logic for browser automation operations.
 * Browser actions are inherently flaky - network delays, dynamic content,
 * race conditions. This module provides battle-tested retry patterns.
 */

'use strict';

/**
 * Default retry options
 * @typedef {Object} RetryOptions
 * @property {number} maxAttempts - Maximum number of attempts (default: 3)
 * @property {number} delayMs - Initial delay between retries in ms (default: 1000)
 * @property {number} backoffFactor - Multiply delay by this on each retry (default: 2)
 * @property {number} maxDelayMs - Cap the delay at this value in ms (default: 30000)
 * @property {Function} onRetry - Called before each retry with (error, attempt)
 * @property {Function} shouldRetry - Return false to abort retrying for specific errors
 */

const DEFAULT_OPTIONS = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 30000,
  onRetry: null,
  shouldRetry: null,
};

/**
 * Retry an async function with exponential backoff.
 * 
 * @param {Function} fn - Async function to retry
 * @param {RetryOptions} [options] - Retry configuration
 * @returns {Promise<any>} Result of the function
 * @throws {Error} Last error if all attempts fail
 * 
 * @example
 * // Basic usage
 * const result = await retry(() => page.click('#submit-btn'), { maxAttempts: 5 });
 * 
 * @example
 * // Custom retry logic
 * const result = await retry(
 *   async () => {
 *     await page.goto('https://example.com');
 *     return await page.title();
 *   },
 *   {
 *     maxAttempts: 3,
 *     delayMs: 2000,
 *     shouldRetry: (error) => !error.message.includes('404'),
 *     onRetry: (error, attempt) => console.log(`Retry ${attempt}: ${error.message}`)
 *   }
 * );
 */
async function retry(fn, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError;
  let delay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (opts.shouldRetry && !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // Don't wait after last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Call onRetry callback if provided
      if (opts.onRetry) {
        await opts.onRetry(error, attempt);
      }

      // Wait before next attempt
      await sleep(delay);

      // Apply backoff
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelayMs);

      // Add small jitter to avoid thundering herd
      delay += Math.random() * 200;
    }
  }

  throw lastError;
}

/**
 * Retry with a specific timeout instead of attempt count.
 * Keeps retrying until timeout is reached.
 * 
 * @param {Function} fn - Async function to retry
 * @param {number} timeoutMs - Total time budget in milliseconds
 * @param {RetryOptions} [options] - Retry configuration
 */
async function retryWithTimeout(fn, timeoutMs, options = {}) {
  const deadline = Date.now() + timeoutMs;
  const opts = { ...DEFAULT_OPTIONS, ...options, maxAttempts: Infinity };
  let attempt = 0;
  let delay = opts.delayMs;
  let lastError;

  while (Date.now() < deadline) {
    attempt++;
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (opts.shouldRetry && !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      const waitTime = Math.min(delay, remaining);
      if (opts.onRetry) await opts.onRetry(error, attempt);
      await sleep(waitTime);
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelayMs);
    }
  }

  throw lastError || new Error(`Timeout after ${timeoutMs}ms`);
}

/**
 * Create a retry wrapper that applies the same retry logic to any function.
 * Useful when you want to retry multiple operations with the same config.
 * 
 * @param {RetryOptions} options - Default retry options for the wrapper
 * @returns {Function} A function that wraps other functions with retry
 * 
 * @example
 * const withRetry = createRetrier({ maxAttempts: 5, delayMs: 500 });
 * const safeClick = (selector) => withRetry(() => page.click(selector));
 * const safeFill = (selector, text) => withRetry(() => page.fill(selector, text));
 */
function createRetrier(options = {}) {
  return (fn) => retry(fn, options);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { retry, retryWithTimeout, createRetrier };
