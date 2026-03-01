/**
 * Session management for cloud browser providers.
 * Handles connection lifecycle, reconnection, and pooling.
 */

'use strict';

/**
 * Manages browser sessions for cloud providers like AnchorBrowser, Browserbase, etc.
 * Provides connection pooling, auto-reconnect, and session reuse.
 */
class SessionManager {
  /**
   * @param {Object} config
   * @param {string} config.provider - 'anchorbrowser' | 'browserbase' | 'generic'
   * @param {string} config.apiKey - Provider API key
   * @param {number} [config.maxSessions=5] - Maximum concurrent sessions
   * @param {number} [config.sessionTimeoutMs=300000] - Session idle timeout (5 min default)
   * @param {string} [config.region='us-east'] - Session region
   */
  constructor(config) {
    this.config = {
      provider: config.provider || 'generic',
      apiKey: config.apiKey,
      maxSessions: config.maxSessions || 5,
      sessionTimeoutMs: config.sessionTimeoutMs || 5 * 60 * 1000,
      region: config.region || 'us-east',
    };
    this._sessions = new Map();
    this._connectionCache = new Map();
  }

  /**
   * Create a new browser session with the configured provider.
   * Returns the WebSocket URL to connect to.
   * 
   * @param {Object} [options]
   * @param {boolean} [options.stealth=true] - Enable anti-detection
   * @param {string} [options.proxy] - Proxy type: 'residential', 'datacenter'
   * @param {string} [options.country] - Proxy country code
   * @returns {Promise<{id: string, wsUrl: string, createdAt: Date}>}
   */
  async createSession(options = {}) {
    const { stealth = true, proxy, country } = options;

    if (this._sessions.size >= this.config.maxSessions) {
      throw new Error(`Session pool exhausted (max: ${this.config.maxSessions})`);
    }

    const sessionConfig = this._buildSessionConfig({ stealth, proxy, country });
    const sessionData = await this._callProviderAPI('create', sessionConfig);

    const session = {
      id: sessionData.id,
      wsUrl: sessionData.wsUrl || sessionData.cdp_url,
      createdAt: new Date(),
      lastUsed: new Date(),
      provider: this.config.provider,
    };

    this._sessions.set(session.id, session);
    return session;
  }

  /**
   * Close a session and clean up resources.
   * 
   * @param {string} sessionId - Session ID to close
   */
  async closeSession(sessionId) {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    try {
      await this._callProviderAPI('close', { id: sessionId });
    } catch (err) {
      // Session may have already expired - log but don't throw
      console.warn(`[SessionManager] Warning closing session ${sessionId}:`, err.message);
    } finally {
      this._sessions.delete(sessionId);
      this._connectionCache.delete(sessionId);
    }
  }

  /**
   * Close all active sessions.
   */
  async closeAll() {
    const sessionIds = [...this._sessions.keys()];
    await Promise.allSettled(sessionIds.map(id => this.closeSession(id)));
  }

  /**
   * Get stats about active sessions.
   * @returns {{ active: number, max: number, sessions: Object[] }}
   */
  getStats() {
    return {
      active: this._sessions.size,
      max: this.config.maxSessions,
      sessions: [...this._sessions.values()].map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        lastUsed: s.lastUsed,
        ageMs: Date.now() - s.createdAt.getTime(),
      })),
    };
  }

  // Private: Build provider-specific config
  _buildSessionConfig({ stealth, proxy, country }) {
    const base = {};

    if (this.config.provider === 'anchorbrowser') {
      base.fingerprint = { screen: { width: 1920, height: 1080 } };
      if (proxy) base.proxy = { type: proxy, country: country || 'US' };
    } else if (this.config.provider === 'browserbase') {
      base.browserSettings = {};
      if (stealth) base.browserSettings.stealth = true;
    }

    return base;
  }

  // Private: Call provider API
  async _callProviderAPI(action, data) {
    const endpoints = {
      anchorbrowser: {
        create: { method: 'POST', url: 'https://api.anchorbrowser.io/v1/sessions' },
        close: { method: 'DELETE', url: `https://api.anchorbrowser.io/v1/sessions/${data.id}` },
      },
      browserbase: {
        create: { method: 'POST', url: 'https://www.browserbase.com/v1/sessions' },
        close: { method: 'DELETE', url: `https://www.browserbase.com/v1/sessions/${data.id}` },
      },
    };

    const providerEndpoints = endpoints[this.config.provider];
    if (!providerEndpoints) {
      throw new Error(`Unsupported provider: ${this.config.provider}. Use 'anchorbrowser' or 'browserbase'.`);
    }

    const endpoint = providerEndpoints[action];
    const headers = this._getAuthHeaders();

    const fetchOptions = {
      method: endpoint.method,
      headers: { ...headers, 'Content-Type': 'application/json' },
    };

    if (action === 'create' && Object.keys(data).length > 0) {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(endpoint.url, fetchOptions);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Provider API error (${response.status}): ${text}`);
    }

    if (endpoint.method === 'DELETE') return {};
    return response.json();
  }

  _getAuthHeaders() {
    if (this.config.provider === 'anchorbrowser') {
      return { 'anchor-api-key': this.config.apiKey };
    }
    return { 'x-bb-api-key': this.config.apiKey };
  }
}

module.exports = { SessionManager };
