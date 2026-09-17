/**
 * Two responsibilities, both about paths that static assets alone cannot serve:
 *
 * 1. /assets/pdf/* — the catalogue PDFs referenced by data/catalogues.js exceed the
 *    25 MiB per-asset limit, so they are excluded from the static assets (see
 *    .assetsignore) and stored in R2 instead.
 *
 * 2. Directory URLs — html_handling is "none" so the site's existing .html URLs are
 *    served as-is with no redirect, which preserves the current URL structure. The
 *    trade-off is that Workers no longer resolves directory roots, so "/" and
 *    "/dir/" are mapped onto their index.html here.
 *
 * This script only runs when no static asset matches the request, so ordinary assets
 * are served directly from the edge without invoking the Worker.
 */

const PDF_PREFIX = '/assets/pdf/';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith(PDF_PREFIX)) {
      const key = decodeURIComponent(url.pathname.slice(1));
      const object = await env.CATALOGUE_PDFS.get(key);

      if (object !== null) {
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('cache-control', 'public, max-age=31536000, immutable');
        return new Response(object.body, { headers });
      }
    }

    if (url.pathname.endsWith('/')) {
      const indexUrl = new URL(url);
      indexUrl.pathname = `${url.pathname}index.html`;
      const response = await env.ASSETS.fetch(indexUrl);
      if (response.status !== 404) return response;
    }

    return env.ASSETS.fetch(request);
  },
};
