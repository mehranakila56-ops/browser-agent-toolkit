# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- `browser_agent_toolkit/screenshot.js` — Screenshot comparison utilities
- `browser_agent_toolkit/network.js` — Request interception and mocking
- TypeScript type definitions
- Published npm package

## [0.1.0] - 2026-03-01

### Added
- `retry(fn, options)` — Exponential backoff retry with jitter
- `retryWithTimeout(fn, timeoutMs)` — Retry within a time budget
- `createRetrier(options)` — Create reusable retry wrappers
- `waitForElement(page, selector, options)` — Robust element waiting with XPath support
- `waitForNavigation(page, action, options)` — Wait for nav after triggered action
- `isElementVisible(page, selector)` — Non-throwing visibility check
- `findFirstVisible(page, selectors)` — Find first visible from candidates
- `extractData(page, schema)` — Schema-based content extraction
- `humanType(page, selector, text, options)` — Human-like typing with WPM control
- `humanClick(page, selector, options)` — Click with mouse movement
- `humanScroll(page, options)` — Smooth scrolling with direction control
- `simulateReading(page, options)` — Simulate human reading behavior
- `SessionManager` — Cloud browser session pooling (AnchorBrowser, Browserbase)
- `PageAnalyzer` — Page structure, state detection, and data extraction
- Jest test suite for retry utilities
