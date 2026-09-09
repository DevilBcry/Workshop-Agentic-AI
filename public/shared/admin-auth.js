(() => {
  const key = 'workshop-agentic-ai-admin-token';
  window.getAdminToken = () => localStorage.getItem(key) || '';
  window.setAdminToken = (token) => localStorage.setItem(key, token);
  window.adminFetch = (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('X-Admin-Token', window.getAdminToken());
    return fetch(path, { ...options, headers });
  };
})();