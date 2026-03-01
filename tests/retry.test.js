/**
 * Tests for retry utilities
 */

'use strict';

const { retry, retryWithTimeout, createRetrier } = require('../src/retry');

describe('retry()', () => {
  it('returns result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('hello');
    const result = await retry(fn);
    expect(result).toBe('hello');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) throw new Error('Temporary failure');
      return Promise.resolve('success');
    });

    const result = await retry(fn, { maxAttempts: 5, delayMs: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Always fails'));

    await expect(
      retry(fn, { maxAttempts: 3, delayMs: 10 })
    ).rejects.toThrow('Always fails');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry with error and attempt number', async () => {
    const onRetry = jest.fn();
    let calls = 0;
    const fn = jest.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) throw new Error(`Error ${calls}`);
      return Promise.resolve('done');
    });

    await retry(fn, { maxAttempts: 5, delayMs: 10, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][1]).toBe(1); // attempt 1
    expect(onRetry.mock.calls[1][1]).toBe(2); // attempt 2
  });

  it('stops retrying when shouldRetry returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Permanent 404'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(
      retry(fn, { maxAttempts: 5, delayMs: 10, shouldRetry })
    ).rejects.toThrow('Permanent 404');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });
});

describe('createRetrier()', () => {
  it('creates a reusable retry wrapper', async () => {
    const withRetry = createRetrier({ maxAttempts: 3, delayMs: 10 });

    let calls = 0;
    const result = await withRetry(() => {
      calls++;
      if (calls < 2) throw new Error('fail');
      return Promise.resolve('ok');
    });

    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });
});
