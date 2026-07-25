// The Worker only serves static calculator files. It has no storage bindings
// and rejects non-read requests so entered student data cannot be uploaded.
const SECURITY_HEADERS = Object.freeze({
  // Match the page meta CSP (connect-src 'none', no style unsafe-inline) and keep
  // frame/base/form hardening for every Worker response, including non-HTML assets.
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload"
});

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return withSecurityHeaders(new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" }
      }));
    }
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  }
};

export { SECURITY_HEADERS, withSecurityHeaders };
