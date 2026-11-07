// RaceNewRoads Service Worker: macht die App installierbar und startet sie notfalls auch ohne Netz.
// Die Seite selbst wird immer zuerst frisch aus dem Netz geholt (Updates kommen sofort an);
// nur wenn das Netz fehlt, wird die zuletzt gespeicherte Version gezeigt.
// Karten, Supabase und alle anderen fremden Adressen laufen unverändert am Service Worker vorbei.
var CACHE = 'rnr-shell-v1';
var SHELL = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).catch(function () {}));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // fremde Dienste nicht anfassen
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put('./', copy); }); }
      return res;
    }).catch(function () {
      return caches.match('./').then(function (r) { return r || Response.error(); });
    }));
    return;
  }
  // Icons und Manifest: aus dem Speicher, sonst Netz
  e.respondWith(caches.match(req).then(function (r) { return r || fetch(req); }));
});
