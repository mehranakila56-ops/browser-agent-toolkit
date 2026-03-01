/**
 * PageAnalyzer — Analyzes pages to understand structure and extract data.
 * Helps AI agents understand page state before taking actions.
 */

'use strict';

/**
 * Analyzes a web page to extract structure, interactive elements, and state.
 * Designed to give AI agents a fast understanding of what's on screen.
 */
class PageAnalyzer {
  /**
   * @param {import('playwright').Page|import('puppeteer').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Get a summary of the page structure including headings, links, and forms.
   * Useful as context for an AI agent deciding what to do next.
   * 
   * @returns {Promise<PageSummary>}
   */
  async summarize() {
    return await this.page.evaluate(() => {
      // Get all headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .slice(0, 10)
        .map(h => ({ level: h.tagName, text: h.textContent?.trim().substring(0, 100) }));

      // Get navigation links
      const navLinks = Array.from(document.querySelectorAll('nav a, header a'))
        .slice(0, 20)
        .map(a => ({ text: a.textContent?.trim(), href: a.href }))
        .filter(l => l.text && l.href);

      // Get all forms
      const forms = Array.from(document.querySelectorAll('form')).map((form, i) => {
        const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name || input.id,
          placeholder: input.placeholder,
          required: input.required,
          value: input.type === 'password' ? '[hidden]' : input.value,
        }));
        const submitBtn = form.querySelector('[type="submit"], button');
        return {
          index: i,
          action: form.action,
          method: form.method || 'GET',
          inputs,
          submitText: submitBtn?.textContent?.trim(),
        };
      });

      // Get primary CTA buttons
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
        .filter(b => {
          const rect = b.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .slice(0, 15)
        .map(b => ({
          text: b.textContent?.trim() || b.value,
          disabled: b.disabled || b.getAttribute('aria-disabled') === 'true',
          id: b.id,
          classes: b.className?.split(' ').filter(Boolean).slice(0, 3),
        }));

      return {
        url: window.location.href,
        title: document.title,
        headings,
        navLinks,
        forms,
        buttons,
        hasModal: !!document.querySelector('[role="dialog"], .modal, .dialog'),
        hasAlert: !!document.querySelector('[role="alert"], .alert, .error-message'),
      };
    });
  }

  /**
   * Check the current page state — loading, error, success, empty, etc.
   * 
   * @returns {Promise<{state: string, indicators: string[]}>}
   */
  async detectState() {
    return await this.page.evaluate(() => {
      const indicators = [];
      let state = 'normal';

      // Check for loading indicators
      const spinners = document.querySelectorAll(
        '[class*="spinner"], [class*="loading"], [class*="skeleton"], [aria-busy="true"]'
      );
      if (spinners.length > 0) {
        state = 'loading';
        indicators.push(`${spinners.length} loading indicator(s) visible`);
      }

      // Check for error states
      const errors = document.querySelectorAll(
        '[class*="error"], [class*="alert-danger"], [role="alert"]'
      );
      if (errors.length > 0) {
        state = 'error';
        errors.forEach(e => {
          const text = e.textContent?.trim();
          if (text) indicators.push(`Error: ${text.substring(0, 100)}`);
        });
      }

      // Check for success states
      const success = document.querySelectorAll(
        '[class*="success"], [class*="alert-success"], [class*="confirmation"]'
      );
      if (success.length > 0) {
        state = 'success';
        success.forEach(s => {
          const text = s.textContent?.trim();
          if (text) indicators.push(`Success: ${text.substring(0, 100)}`);
        });
      }

      // Check for empty states
      const contentLength = document.body?.textContent?.trim()?.length || 0;
      if (contentLength < 50) {
        state = 'empty';
        indicators.push('Page has very little content');
      }

      // Check for login/auth walls
      const loginForms = document.querySelectorAll(
        'form[action*="login"], form[action*="signin"], [id*="login-form"]'
      );
      if (loginForms.length > 0) {
        indicators.push('Login form detected');
      }

      return { state, indicators, url: window.location.href };
    });
  }

  /**
   * Extract all links from the page, categorized by type.
   * 
   * @param {Object} [options]
   * @param {boolean} [options.internal=true] - Include internal links
   * @param {boolean} [options.external=true] - Include external links
   * @param {number} [options.limit=50] - Max links to return
   * @returns {Promise<Link[]>}
   */
  async getLinks(options = {}) {
    const { internal = true, external = true, limit = 50 } = options;
    const currentHost = new URL(this.page.url()).hostname;

    return await this.page.evaluate(({ host, int, ext, lim }) => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          text: a.textContent?.trim() || a.getAttribute('aria-label') || '',
          href: a.href,
          isInternal: new URL(a.href, window.location.href).hostname === host,
        }))
        .filter(l => l.href && (
          (l.isInternal && int) || (!l.isInternal && ext)
        ))
        .slice(0, lim);
    }, { host: currentHost, int: internal, ext: external, lim: limit });
  }

  /**
   * Extract structured data from a list/table on the page.
   * Auto-detects the best way to extract the data.
   * 
   * @param {string} [containerSelector] - Container to look in (default: body)
   * @returns {Promise<Object[]>}
   */
  async extractTableData(containerSelector = 'table') {
    return await this.page.evaluate((sel) => {
      const table = document.querySelector(sel);
      if (!table) return [];

      const headers = Array.from(table.querySelectorAll('th'))
        .map(th => th.textContent?.trim() || '');

      const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => {
        const cells = Array.from(row.querySelectorAll('td'))
          .map(td => td.textContent?.trim() || '');

        if (headers.length > 0) {
          return Object.fromEntries(headers.map((h, i) => [h || `col${i}`, cells[i] || '']));
        }
        return cells;
      });

      return rows;
    }, containerSelector);
  }
}

module.exports = { PageAnalyzer };
