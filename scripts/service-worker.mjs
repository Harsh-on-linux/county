import { readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const assets = (await readdir("dist/assets")).map((f) => "/assets/" + f);
const fonts = (await readdir("dist/fonts"))
  .filter((f) => f.endsWith(".woff2"))
  .map((f) => "/fonts/" + f);
const cache =
  "county-" +
  createHash("sha256")
    .update([...assets, ...fonts].join())
    .digest("hex")
    .slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(cache)};const ASSETS=${JSON.stringify(["/", "/index.html", "/favicon.svg", "/brand/county-mark.svg", "/brand/county-mark-light.svg", ...assets, ...fonts])};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('county-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!ASSETS.includes(u.pathname))return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});`,
);
