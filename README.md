# browser-agent-toolkit

> Utilities and helpers for building reliable AI browser agents

[![npm version](https://badge.fury.io/js/browser-agent-toolkit.svg)](https://www.npmjs.com/package/browser-agent-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A collection of battle-tested utilities for browser automation with AI agents. Works with Puppeteer, Playwright, and cloud browser providers (AnchorBrowser, Browserbase, etc.).

Browser automation is inherently flaky. Network delays, dynamic content, anti-bot measures, and DOM race conditions cause even simple automations to fail. This library provides robust primitives that handle the edge cases so you don't have to.

## Features

- 🔄 **Retry utilities** — Exponential backoff, jitter, per-error retry logic
- 👁️ **Element helpers** — Robust waiting, visibility checks, XPath + CSS support
- 🤖 **Human-like interactions** — Realistic typing speed, randomized delays, natural mouse movement
- ☁️ **Session management** — Pool and reuse cloud browser sessions (AnchorBrowser, Browserbase)
- 🔍 **Page analyzer** — Extract structured data, detect page state, find interactive elements

## Installation

```bash
npm install browser-agent-toolkit
```

The library has no required dependencies. Puppeteer or Playwright are optional peer dependencies.

## Quick Start

```javascript
const { retry, waitForElement, humanType, humanClick, randomDelay } = require('browser-agent-toolkit');

// Example: Reliable form submission with human-like behavior
async function submitForm(page, { email, password }) {
  // Wait for form elements to be ready
  await waitForElement(page, '#email', { visible: true });
  
  // Type with human-like timing (60 WPM)
  await humanType(page, '#email', email, { wpm: 65 });
  await randomDelay(300, 700);
  await humanType(page, '#password', password, { wpm: 55 });
  
  // Click submit and wait for navigation
  await humanClick(page, '#submit-btn');
  
  // Retry the check in case of slow response
  await retry(
    () => waitForElement(page, '.dashboard', { visible: true, timeout: 5000 }),
    { maxAttempts: 3, delayMs: 1000 }
  );
}
```

## API Reference

### `retry(fn, options)`

Retry an async function with exponential backoff.

```javascript
const { retry } = require('browser-agent-toolkit');

const data = await retry(
  async () => {
    await page.goto('https://example.com');
    return await page.title();
  },
  {
    maxAttempts: 3,       // Default: 3
    delayMs: 1000,        // Initial delay (default: 1000ms)
    backoffFactor: 2,     // Multiply delay each retry (default: 2)
    maxDelayMs: 30000,    // Cap delay at this value (default: 30s)
    onRetry: (err, n) => console.log(`Retry #${n}: ${err.message}`),
    shouldRetry: (err) => !err.message.includes('404'), // Don't retry 404s
  }
);
```

### `waitForElement(page, selector, options)`

Wait for an element to appear and be ready for interaction.

```javascript
const { waitForElement } = require('browser-agent-toolkit');

// Wait for element with CSS selector
const element = await waitForElement(page, '#submit-button', {
  timeout: 30000,  // Default: 30s
  visible: true,   // Must be visible (default: true)
  enabled: true,   // Must not be disabled
});

// Works with XPath too
await waitForElement(page, '//button[contains(text(), "Submit")]');
```

### `humanType(page, selector, text, options)`

Type text with realistic human-like timing.

```javascript
const { humanType } = require('browser-agent-toolkit');

await humanType(page, '#search-input', 'browser automation tools', {
  wpm: 70,         // Words per minute (default: 60)
  variance: 0.3,   // Timing variance 0-1 (default: 0.3)
  clear: true,     // Clear field before typing (default: false)
});
```

### `SessionManager`

Manage cloud browser sessions with pooling and auto-cleanup.

```javascript
const { SessionManager } = require('browser-agent-toolkit');

const sessions = new SessionManager({
  provider: 'anchorbrowser',
  apiKey: process.env.ANCHOR_API_KEY,
  maxSessions: 10,
});

// Create a session
const session = await sessions.createSession({
  stealth: true,
  proxy: 'residential',
  country: 'US',
});

// Connect Puppeteer to the session
const browser = await puppeteer.connect({ browserWSEndpoint: session.wsUrl });
const page = (await browser.pages())[0];

// ... do your work ...

// Clean up
await sessions.closeSession(session.id);
```

## Cloud Browser Providers

Tested with:

| Provider | Config |
|----------|--------|
| [AnchorBrowser](https://anchorbrowser.io) | `provider: 'anchorbrowser'` |
| [Browserbase](https://browserbase.com) | `provider: 'browserbase'` |

## Contributing

Contributions welcome! Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/mehranakila56-ops/browser-agent-toolkit.git
cd browser-agent-toolkit
npm install
npm test
```

## License

MIT © mehranakila56-ops
