/*
  The stub owns /packs and /media at the root, and the app's own pack route is
  /packs/:id, so a document navigation to /packs/pack_0001 would otherwise be
  proxied to the API and answer 401 JSON instead of loading the app.

  A navigation asks for text/html; the app's XHRs do not. That is the whole of
  the distinction, so bypass returns the app shell for the former and proxies
  the latter. Without this, deep links and reloads on a pack screen are broken,
  which would take RF-1's "a pasted link opens the same thing" with them.
*/
const isDocumentNavigation = (req) =>
  req.method === 'GET' && (req.headers.accept ?? '').includes('text/html');

const toStub = (extra = {}) => ({
  target: 'http://localhost:4010',
  secure: false,
  changeOrigin: true,
  ...extra,
});

module.exports = {
  '/packs': toStub({ bypass: (req) => (isDocumentNavigation(req) ? '/index.html' : null) }),
  '/media': toStub(),
};
