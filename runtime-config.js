// Runtime config shim: allow injecting Supabase URL/ANON key at runtime
// and provide a resilient getSupabaseClient method when library/load order/env fails.
(function () {
  try {
    // Wait until configManager exists
    const waitForConfig = () => new Promise((resolve) => {
      if (window.configManager) return resolve(window.configManager);
      const i = setInterval(() => {
        if (window.configManager) {
          clearInterval(i);
          resolve(window.configManager);
        }
      }, 50);
      // fallback timeout
      setTimeout(() => resolve(window.configManager), 2000);
    });

    waitForConfig().then((cfgMgr) => {
      if (!cfgMgr) return;

      // Accept runtime-injected globals: window.__SUPABASE_URL, window.__SUPABASE_ANON_KEY
      const runtimeUrl = window.__SUPABASE_URL || window.SUPABASE_URL || '';
      const runtimeKey = window.__SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';

      if (runtimeUrl) cfgMgr.supabaseConfig.url = runtimeUrl;
      if (runtimeKey) cfgMgr.supabaseConfig.anonKey = runtimeKey;

      // Expose a helper to set config at runtime
      cfgMgr.setSupabaseConfig = function (url, anonKey) {
        if (url) this.supabaseConfig.url = url;
        if (anonKey) this.supabaseConfig.anonKey = anonKey;
        // Try to recreate client if supabase lib available
          if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            try {
              // only create client when url and anonKey are present
              if (this.supabaseConfig.url && this.supabaseConfig.anonKey) {
                this._client = window.supabase.createClient(this.supabaseConfig.url, this.supabaseConfig.anonKey);
                return this._client;
              }
            } catch (e) {
              console.warn('Could not create Supabase client after setSupabaseConfig', e);
            }
          }
        return null;
      };

      // Patch getSupabaseClient to be resilient
      const originalGet = cfgMgr.getSupabaseClient && cfgMgr.getSupabaseClient.bind(cfgMgr);
      cfgMgr.getSupabaseClient = function () {
        const cfg = this.supabaseConfig || {};
        const url = cfg.url || '';
        const anon = cfg.anonKey || cfg.anon_key || cfg.anonKey || '';

        // If we've cached a client, return it
        if (this._client) return this._client;

        // Prefer the global supabase (loaded from CDN) if available
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
          try {
            // only attempt to create client when url and anon are provided
            if (url && anon) {
              this._client = window.supabase.createClient(url, anon);
              return this._client;
            }
          } catch (e) {
            console.warn('window.supabase.createClient failed:', e);
          }
        }

        // Try original implementation if present
        try {
          const maybe = originalGet && originalGet();
          if (maybe) {
            this._client = maybe;
            return this._client;
          }
        } catch (e) {
          // ignore
        }

        // Last resort: warn and return null rather than throwing
        if (!url || !anon) {
          console.warn('Supabase URL or anon key not set. Provide via window.__SUPABASE_URL and window.__SUPABASE_ANON_KEY or call configManager.setSupabaseConfig(url, anonKey)');
        } else {
          console.warn('Supabase client library not available on window, cannot create client in browser.');
        }

        return null;
      };
    });
  } catch (err) {
    console.error('runtime-config shim error', err);
  }
})();
