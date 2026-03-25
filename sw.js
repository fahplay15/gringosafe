// SERVICE WORKER OTIMIZADO - GringoSafe
const CACHE_NAME = 'gringosafe-v2.0';
const STATIC_CACHE = 'gringosafe-static-v2.0';
const DYNAMIC_CACHE = 'gringosafe-dynamic-v2.0';

// Arquivos essenciais para cache estático
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/images/logo.png',
    '/css/core.css',
    '/css/components.css',
    '/css/modals.css',
    '/css/map.css',
    '/css/responsive.css',
    '/js/core/config.js',
    '/js/core/utils.js',
    '/js/core/app.js',
    '/js/modules/auth.js',
    '/js/modules/ui.js',
    '/js/modules/map.js',
    '/js/services/api.js',
    '/js/services/cache.js',
    '/js/main.js'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('📦 Instalando Service Worker v2.0');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📚 Cacheando arquivos estáticos...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker instalado com sucesso');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Erro na instalação:', error);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Ativando Service Worker v2.0');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Remover caches antigos
                        if (cacheName !== CACHE_NAME && 
                            cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker ativado');
                return self.clients.claim();
            })
    );
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requisições de extensões e protocolos diferentes
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Estratégia para recursos estáticos
    if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    // Se não estiver no cache, buscar da rede
                    return fetch(request)
                        .then(networkResponse => {
                            // Cacheiar resposta bem-sucedida
                            if (networkResponse.ok) {
                                caches.open(STATIC_CACHE)
                                    .then(cache => cache.put(request, networkResponse.clone()));
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            // Fallback para offline
                            return caches.match(request);
                        });
                })
        );
        return;
    }
    
    // Estratégia para requisições de API (Firebase)
    if (url.hostname.includes('firebaseio.com') || 
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('googleapis.com')) {
        
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // Cacheiar respostas GET bem-sucedidas
                    if (networkResponse.ok && request.method === 'GET') {
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => cache.put(request, networkResponse.clone()));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Tentar do cache se falhar a rede
                    return caches.match(request);
                })
        );
        return;
    }
    
    // Estratégia para outros recursos (imagens, fontes, etc.)
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(request)
                    .then(networkResponse => {
                        // Cacheiar se for bem-sucedido
                        if (networkResponse.ok) {
                            caches.open(DYNAMIC_CACHE)
                                .then(cache => cache.put(request, networkResponse.clone()));
                        }
                        return networkResponse;
                    });
            })
    );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Lógica de sincronização offline
            console.log('🔄 Sincronizando dados em background...');
        );
    }
});

// Push notifications (se implementado no futuro)
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Nova notificação do GringoSafe',
        icon: '/assets/images/logo.png',
        badge: '/assets/images/logo.png',
        vibrate: [200, 100, 200],
        data: {
            url: '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('GringoSafe', options)
    );
});

// Click na notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

// Limpeza periódica do cache
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_CLEANUP') {
        caches.open(DYNAMIC_CACHE)
            .then(cache => {
                cache.keys()
                    .then(keys => {
                        // Manter apenas os 50 mais recentes
                        if (keys.length > 50) {
                            const keysToDelete = keys.slice(50);
                            return Promise.all(
                                keysToDelete.map(key => cache.delete(key))
                            );
                        }
                    });
            });
    }
});
