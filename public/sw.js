const CACHE = "ekendali-v1"
const URLS = ["/", "/dashboard", "/scan", "/login"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(URLS))
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  )
})
