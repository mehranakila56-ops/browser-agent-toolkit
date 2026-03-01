/**
 * Element detection and interaction helpers for browser agents.
 * Provides robust waiting, visibility checking, and element location.
 */

'use strict';

/**
 * Wait for an element to appear and be ready for interaction.
 * More reliable than simple waitForSelector for dynamic content.
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {string} selector - CSS selector or XPath
 * @param {Object} [options]
 * @param {number} [options.timeout=30000] - Max wait time in ms
 * @param {boolean} [options.visible=true] - Element must be visible
 * @param {boolean} [options.enabled=false] - Element must not be disabled
 * @returns {Promise<any>} The element handle
 */
async function waitForElement(page, selector, options = {}) {
  const { timeout = 30000, visible = true, enabled = false } = options;

  const isXPath = selector.startsWith('//') || selector.startsWith('xpath=');

  if (isXPath) {
    // Handle XPath selectors
    const xpathExpr = selector.replace(/^xpath=/, '');
    return await page.waitForFunction(
      ({ xpath, vis }) => {
        const el = document.evaluate(xpath, document, null,
          XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (!el) return null;
        if (vis) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return null;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') return null;
        }
        return el;
      },
      { xpath: xpathExpr, vis: visible },
      { timeout }
    );
  }

  // For CSS selectors, use the built-in waitForSelector
  const waitOptions = { timeout };
  if (visible) waitOptions.state = 'visible';

  const element = await page.waitForSelector(selector, waitOptions);

  if (enabled) {
    // Wait until not disabled
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && !el.disabled && !el.getAttribute('aria-disabled');
      },
      selector,
      { timeout }
    );
  }

  return element;
}

/**
 * Wait for navigation to complete after an action.
 * Handles SPA navigation, redirects, and traditional page loads.
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {Function} action - Async function that triggers navigation
 * @param {Object} [options]
 * @param {number} [options.timeout=30000] - Max wait time
 * @param {string} [options.waitUntil='networkidle'] - When to consider nav done
 */
async function waitForNavigation(page, action, options = {}) {
  const { timeout = 30000, waitUntil = 'networkidle' } = options;

  // Playwright and Puppeteer have slightly different APIs
  const isPlaywright = typeof page.waitForLoadState === 'function';

  if (isPlaywright) {
    await Promise.all([
      page.waitForLoadState(waitUntil === 'networkidle' ? 'networkidle' : 'load', { timeout }),
      action(),
    ]);
  } else {
    // Puppeteer
    await Promise.all([
      page.waitForNavigation({ timeout, waitUntil }),
      action(),
    ]);
  }
}

/**
 * Check if an element is visible on the page without throwing.
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {string} selector - CSS selector
 * @returns {Promise<boolean>}
 */
async function isElementVisible(page, selector) {
  try {
    const element = await page.$(selector);
    if (!element) return false;

    const isVisible = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      );
    }, selector);

    return isVisible;
  } catch {
    return false;
  }
}

/**
 * Find the best matching element from a list of candidate selectors.
 * Useful when a page might have different layouts (A/B tests, localization).
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {string[]} selectors - Array of CSS selectors to try
 * @param {Object} [options]
 * @param {number} [options.timeout=10000] - Max wait time total
 * @returns {Promise<{selector: string, element: any}|null>} First matching selector
 */
async function findFirstVisible(page, selectors, options = {}) {
  const { timeout = 10000 } = options;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const selector of selectors) {
      if (await isElementVisible(page, selector)) {
        return { selector, element: await page.$(selector) };
      }
    }
    await new Promise(r => setTimeout(r, 100));
  }

  return null;
}

/**
 * Extract structured text content from page sections.
 * Handles common content extraction patterns.
 * 
 * @param {import('playwright').Page|import('puppeteer').Page} page
 * @param {Object} schema - Map of field name to CSS selector
 * @returns {Promise<Object>} Extracted data matching the schema
 * 
 * @example
 * const data = await extractData(page, {
 *   title: 'h1',
 *   price: '.product-price',
 *   description: '.product-description',
 * });
 */
async function extractData(page, schema) {
  const result = {};
  for (const [field, selector] of Object.entries(schema)) {
    try {
      const text = await page.$eval(selector, el => el.textContent?.trim() || '');
      result[field] = text;
    } catch {
      result[field] = null;
    }
  }
  return result;
}

module.exports = {
  waitForElement,
  waitForNavigation,
  isElementVisible,
  findFirstVisible,
  extractData,
};
