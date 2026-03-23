// NOME DO CACHE 
const CACHE_NAME = 'gringosafe-v1.3';

// Quando o PWA é instalado no celular
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
});

// Quando o PWA é ativado (limpa o lixo antigo)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); 
                    }
                })
            );
        })
    );
    self.clients.claim(); 
});

// Quando o PWA pede um arquivo
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});