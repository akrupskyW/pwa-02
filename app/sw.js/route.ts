import { NextResponse } from "next/server";

// Dev-only kill switch served at /sw.js. In production, `public/sw.js`
// (built by @serwist/next) exists and takes precedence over this route
// handler, so the real service worker ships. In dev, public/sw.js doesn't
// exist (Serwist is disabled and the file is gitignored), so this handler
// answers — serving a tiny worker that unregisters any previously-installed
// SW and forces a hard reload of all controlled clients. That way, switching
// between `yarn build && yarn start` and `yarn dev` never strands the browser
// with a stale precache.
//
// `force-dynamic` is required, not `force-static`:
//   • `force-static` would prerender this route at build time, baking a
//     static `/sw.js` asset into every production deploy that would
//     compete with the real Serwist-built `public/sw.js`.
//   • `force-static` also opts the response into Next's full-route cache,
//     which would override the `Cache-Control: no-store` header below and
//     potentially keep serving a stale kill switch from a CDN.

export const dynamic = "force-dynamic";

const KILL_SWITCH = `// Auto-generated dev SW. Unregisters itself and reloads controlled clients.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
    try {
      await self.registration.unregister();
    } catch {}
    try {
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        try { client.navigate(client.url); } catch {}
      }
    } catch {}
  })());
});
`;

export const GET = () =>
  new NextResponse(KILL_SWITCH, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
