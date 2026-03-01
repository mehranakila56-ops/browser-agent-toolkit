/**
 * browser-agent-toolkit
 * 
 * Utilities and helpers for building reliable AI browser agents.
 * Works with Puppeteer, Playwright, and cloud browser providers.
 */

'use strict';

const { retry } = require('./retry');
const { waitForElement, waitForNavigation, isElementVisible } = require('./element');
const { SessionManager } = require('./session');
const { PageAnalyzer } = require('./analyzer');
const { randomDelay, humanType, humanClick, humanScroll } = require('./human');

module.exports = {
  // Retry utilities
  retry,
  
  // Element helpers  
  waitForElement,
  waitForNavigation,
  isElementVisible,
  
  // Session management
  SessionManager,
  
  // Page analysis
  PageAnalyzer,
  
  // Human-like interaction
  randomDelay,
  humanType,
  humanClick,
  humanScroll,
};
