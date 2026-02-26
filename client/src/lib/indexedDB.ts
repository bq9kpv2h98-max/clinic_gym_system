// IndexedDB helper for offline support

const DB_NAME = 'ClinicGymDB';
const DB_VERSION = 1;

export interface PendingVisit {
  id?: number;
  customerId: string;
  timestamp: number;
  data: {
    customerId: string;
  };
}

export interface VisitHistoryRecord {
  id?: number;
  customerId: string;
  customerName: string;
  date: string;
  timestamp: number;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
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

export async function savePendingVisit(visit: PendingVisit): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pendingVisits', 'readwrite');
  const store = tx.objectStore('pendingVisits');
  
  return new Promise((resolve, reject) => {
    const request = store.add(visit);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingVisits(): Promise<PendingVisit[]> {
  const db = await openDB();
  const tx = db.transaction('pendingVisits', 'readonly');
  const store = tx.objectStore('pendingVisits');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePendingVisit(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pendingVisits', 'readwrite');
  const store = tx.objectStore('pendingVisits');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveVisitHistory(visit: VisitHistoryRecord): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('visitHistory', 'readwrite');
  const store = tx.objectStore('visitHistory');
  
  return new Promise((resolve, reject) => {
    const request = store.add(visit);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getTodayVisitHistory(): Promise<VisitHistoryRecord[]> {
  const db = await openDB();
  const tx = db.transaction('visitHistory', 'readonly');
  const store = tx.objectStore('visitHistory');
  const index = store.index('date');
  
  const today = new Date().toISOString().split('T')[0];
  
  return new Promise((resolve, reject) => {
    const request = index.getAll(today);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function syncPendingVisits(): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register('sync-visit-records');
  }
}
