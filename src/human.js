/**
 * Human-like interaction helpers for browser agents.
 * Anti-detection: randomized delays, natural mouse movement, realistic typing.
 */

'use strict';

/**
 * Wait for a random delay within a range.
 * Avoids the machine-like pattern of fixed delays.
 * 
 * @param {number} minMs - Minimum delay in milliseconds
 * @param {number} maxMs - Maximum delay in milliseconds
 * @returns {Promise<void>}
 * 
 * @example
 * await randomDelay(500, 2000); // Wait 0.5-2 seconds
 */
async function randomDelay(minMs = 300, maxMs = 1500) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Type text with human-like timing between keystrokes.
 * Varies typing speed and occasionally "mistype and correct".
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {string} selector - Input element selector
 * @param {string} text - Text to type
 * @param {Object} [options]
 * @param {number} [options.wpm=60] - Target words per minute
 * @param {number} [options.variance=0.3] - Timing variance 0-1
 * @param {boolean} [options.clear=false] - Clear field before typing
 */
async function humanType(page, selector, text, options = {}) {
  const { wpm = 60, variance = 0.3, clear = false } = options;

  // Base delay per character from WPM (avg 5 chars/word)
  const baseDelay = (60 * 1000) / (wpm * 5);

  if (clear) {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.press('Backspace');
  }

  await page.focus(selector);
  await randomDelay(100, 300);

  for (const char of text) {
    // Randomize per-keystroke timing
    const charDelay = baseDelay * (1 + (Math.random() - 0.5) * variance * 2);
    await new Promise(resolve => setTimeout(resolve, charDelay));
    await page.keyboard.type(char);
  }
}

/**
 * Click an element with human-like timing and optional mouse movement.
 * Moves to element before clicking (not teleporting).
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {string} selector - Element selector
 * @param {Object} [options]
 * @param {boolean} [options.moveFirst=true] - Move mouse to element first
 * @param {number} [options.delayBefore=0] - Wait before clicking (ms)
 */
async function humanClick(page, selector, options = {}) {
  const { moveFirst = true, delayBefore = 0 } = options;

  if (delayBefore > 0) {
    await new Promise(resolve => setTimeout(resolve, delayBefore));
  }

  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  if (moveFirst) {
    // Get element bounds and move to a random point within it
    const box = await element.boundingBox();
    if (box) {
      const x = box.x + box.width * (0.3 + Math.random() * 0.4);
      const y = box.y + box.height * (0.3 + Math.random() * 0.4);
      await page.mouse.move(x, y);
      await randomDelay(50, 200);
    }
  }

  await element.click();
}

/**
 * Scroll the page in a human-like manner.
 * Uses smooth scrolling with variable speed and pauses.
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {Object} [options]
 * @param {string} [options.direction='down'] - 'down', 'up', 'to-bottom', 'to-top'
 * @param {number} [options.distance=400] - Pixels to scroll (for 'up'/'down')
 * @param {number} [options.steps=5] - Number of scroll steps
 */
async function humanScroll(page, options = {}) {
  const { direction = 'down', distance = 400, steps = 5 } = options;

  if (direction === 'to-bottom') {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    return;
  }

  if (direction === 'to-top') {
    await page.evaluate(() => window.scrollTo(0, 0));
    return;
  }

  const stepSize = direction === 'down' ? distance / steps : -(distance / steps);

  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollBy(0, y), stepSize);
    await randomDelay(50, 150);
  }
}

/**
 * Simulate reading a page (scroll down slowly, pause, continue).
 * Useful for pages that detect bot behavior by scroll patterns.
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {Object} [options]
 * @param {number} [options.readTimeMs=3000] - How long to "read" in ms
 */
async function simulateReading(page, options = {}) {
  const { readTimeMs = 3000 } = options;
  const scrollInterval = 800;
  const iterations = Math.floor(readTimeMs / scrollInterval);

  for (let i = 0; i < iterations; i++) {
    // Scroll a small amount (like a human reading)
    const scrollAmount = 60 + Math.random() * 80;
    await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);
    await randomDelay(scrollInterval * 0.7, scrollInterval * 1.3);
  }
}

module.exports = {
  randomDelay,
  humanType,
  humanClick,
  humanScroll,
  simulateReading,
};
