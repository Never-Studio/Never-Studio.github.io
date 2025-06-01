self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle our custom requests
  if (url.pathname.startsWith('/cors-proxy/')) {
    const targetUrl = decodeURIComponent(url.pathname.replace('/cors-proxy/', ''));

    event.respondWith(
      fetch(targetUrl, {
        method: event.request.method,
        headers: event.request.headers,
        body: event.request.body,
        mode: 'no-cors', // risky — depends on the API
      })
    );
  }
});
