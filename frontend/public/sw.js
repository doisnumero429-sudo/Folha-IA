const CACHE = 'faltas-ag-v1'

// Assets to precache for offline shell
const PRECACHE = [
  '/faltas',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept API calls — always go network-first
  if (url.pathname.startsWith('/api/')) return

  // For navigation requests serve the app shell from cache, falling back to network
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/faltas'))
    )
    return
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && request.method === 'GET') {
        const clone = response.clone()
        caches.open(CACHE).then(cache => cache.put(request, clone))
      }
      return response
    }))
  )
})
