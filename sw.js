// ===== SERVICE WORKER FOR PWA =====
const CACHE_NAME = 'gringosafe-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/map.js',
  '/js/ai.js',
  '/js/app.js',
  '/js/db.js',
  '/img/logo.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
  'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    // Handle external API requests
    if (event.request.url.includes('mapbox') || 
        event.request.url.includes('firebase') ||
        event.request.url.includes('googleapis')) {
      event.respondWith(
        fetch(event.request)
          .catch(() => {
            // Return a cached version or offline response
            return new Response(
              JSON.stringify({ error: 'Offline - cached data unavailable' }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          })
      );
    }
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          // For CSS and JS files, also fetch in background to update cache
          if (event.request.url.includes('.css') || event.request.url.includes('.js')) {
            fetch(event.request)
              .then((fetchResponse) => {
                if (fetchResponse.ok) {
                  caches.open(CACHE_NAME)
                    .then((cache) => {
                      cache.put(event.request, fetchResponse.clone());
                    });
                }
              })
              .catch(() => {
                // Ignore fetch errors for background updates
              });
          }
          return response;
        }
        
        // For navigation requests, try to fetch index.html
        if (event.request.mode === 'navigate') {
          return fetch(event.request)
            .catch(() => {
              return caches.match('/index.html');
            });
        }
        
        // For other requests, try to fetch
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.ok && event.request.method === 'GET') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for HTML requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Return offline response for other requests
            return new Response(
              JSON.stringify({ error: 'Offline - no cached data available' }),
              { 
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync-markers') {
    event.waitUntil(syncMarkers());
  }
  
  if (event.tag === 'background-sync-questions') {
    event.waitUntil(syncQuestions());
  }
});

// Sync markers that were created offline
async function syncMarkers() {
  try {
    const offlineMarkers = await getOfflineData('markers');
    
    for (const marker of offlineMarkers) {
      try {
        // Send to server
        const response = await fetch('/api/markers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(marker.data)
        });
        
        if (response.ok) {
          // Remove from offline storage
          await removeOfflineData('markers', marker.id);
          console.log('Service Worker: Marker synced successfully');
        }
      } catch (error) {
        console.error('Service Worker: Error syncing marker', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error in syncMarkers', error);
  }
}

// Sync questions that were created offline
async function syncQuestions() {
  try {
    const offlineQuestions = await getOfflineData('questions');
    
    for (const question of offlineQuestions) {
      try {
        // Send to server
        const response = await fetch('/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(question.data)
        });
        
        if (response.ok) {
          // Remove from offline storage
          await removeOfflineData('questions', question.id);
          console.log('Service Worker: Question synced successfully');
        }
      } catch (error) {
        console.error('Service Worker: Error syncing question', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error in syncQuestions', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do GringoSafe',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explorar',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('GringoSafe', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for offline storage
async function getOfflineData(type) {
  // In a real implementation, you would use IndexedDB
  // For now, return empty array
  return [];
}

async function removeOfflineData(type, id) {
  // In a real implementation, you would remove from IndexedDB
  console.log(`Removing offline ${type} with id: ${id}`);
}

// Cache update strategy
async function updateCache(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('Service Worker: Error updating cache', error);
    throw error;
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic sync', event.tag);
  
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCachePeriodically());
  }
});

// Update cache periodically
async function updateCachePeriodically() {
  try {
    // Update critical files
    for (const url of urlsToCache) {
      try {
        await updateCache(new Request(url));
      } catch (error) {
        console.error(`Service Worker: Failed to update ${url}`, error);
      }
    }
    
    console.log('Service Worker: Cache update completed');
  } catch (error) {
    console.error('Service Worker: Error in periodic cache update', error);
  }
}

// Message event for communication with main app
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_CACHE':
      clearCache();
      break;
    default:
      console.log('Service Worker: Unknown message type', event.data.type);
  }
});

// Clear all caches
async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Service Worker: All caches cleared');
  } catch (error) {
    console.error('Service Worker: Error clearing caches', error);
  }
}
