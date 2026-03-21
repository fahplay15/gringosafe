// NOME DO CACHE (Sempre que você fizer uma mudança grande no app, mude este número para forçar a limpeza)
const CACHE_NAME = 'gringosafe-v1.0';

// Quando o PWA é instalado no celular
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Força o novo Service Worker a assumir imediatamente
});

// Quando o PWA é ativado (limpa o lixo antigo)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // Apaga os códigos antigos do celular do usuário
                    }
                })
            );
        })
    );
    self.clients.claim(); // Assume o controle da página na hora
});

// Quando o PWA pede um arquivo (Pula o cache e vai direto na internet pegar a versão fresca do Netlify)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});