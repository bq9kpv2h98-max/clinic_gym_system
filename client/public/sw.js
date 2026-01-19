const CACHE_NAME = 'clinic-gym-v1';
const OFFLINE_CACHE = 'offline-v1';
const urlsToCache = [
  '/',
  '/customer-home',
  '/staff/scanner',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// インストール時にキャッシュを作成
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// フェッチ時にネットワーク優先、フォールバックでキャッシュ
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests (use network only)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline page if available
          return caches.match('/customer-home');
        });
      })
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let data = {
    title: '診察券アプリ',
    body: '新しい通知があります',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Background sync for offline visit records
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-visit-records') {
    event.waitUntil(syncVisitRecords());
  }
});

async function syncVisitRecords() {
  try {
    // Open IndexedDB and get pending records
    const db = await openDB();
    const tx = db.transaction('pendingVisits', 'readonly');
    const store = tx.objectStore('pendingVisits');
    const records = await getAllRecords(store);
    
    // Send each record to the server
    for (const record of records) {
      try {
        const response = await fetch('/api/trpc/staff.recordVisit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record.data),
        });
        
        if (response.ok) {
          // Remove from IndexedDB after successful sync
          const deleteTx = db.transaction('pendingVisits', 'readwrite');
          const deleteStore = deleteTx.objectStore('pendingVisits');
          await deleteStore.delete(record.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync record:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Failed to sync visit records:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ClinicGymDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingVisits')) {
        db.createObjectStore('pendingVisits', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('visitHistory')) {
        const historyStore = db.createObjectStore('visitHistory', { keyPath: 'id', autoIncrement: true });
        historyStore.createIndex('date', 'date', { unique: false });
        historyStore.createIndex('customerId', 'customerId', { unique: false });
      }
    };
  });
}

function getAllRecords(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/customer-home';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
