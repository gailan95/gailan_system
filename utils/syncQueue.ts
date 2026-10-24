import { saveToIndexedDB, loadFromIndexedDB } from './indexedDB';

export interface SyncQueueItem {
  id: string;
  type:
    | 'SALE_CREATED'
    | 'EXPENSE_ADDED'
    | 'DEBT_PAYMENT'
    | 'PRODUCT_UPDATED'
    | 'CUSTOMER_ADDED'
    | 'GRANULAR_SYNC'
    | 'FULL_SNAPSHOT_SYNC';
  timestamp: string;
  payload: any;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = 'kurd_offline_sync_queue_v1';

// In-memory queue cache
let inMemoryQueue: SyncQueueItem[] = [];

// Initialize in-memory queue from localStorage synchronously
try {
  const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      inMemoryQueue = parsed;
    }
  }
} catch (e) {
  inMemoryQueue = [];
}

// Persist queue to both LocalStorage and IndexedDB
async function persistQueue(): Promise<void> {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(inMemoryQueue));
  } catch (err) {
    console.warn('LocalStorage queue save error:', err);
  }

  try {
    await saveToIndexedDB('sync_queue', inMemoryQueue);
  } catch (err) {
    console.warn('IndexedDB queue save error:', err);
  }
}

// Load queue from IndexedDB asynchronously (called on startup)
export async function initializeSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const idbQueue = await loadFromIndexedDB<SyncQueueItem[]>('sync_queue');
    if (idbQueue && Array.isArray(idbQueue) && idbQueue.length > 0) {
      // Merge unique items by id
      const existingIds = new Set(inMemoryQueue.map((item) => item.id));
      idbQueue.forEach((item) => {
        if (!existingIds.has(item.id)) {
          inMemoryQueue.push(item);
          existingIds.add(item.id);
        }
      });
      persistQueue();
    }
  } catch (err) {
    console.warn('Error loading sync queue from IndexedDB:', err);
  }
  return inMemoryQueue;
}

export function getSyncQueue(): SyncQueueItem[] {
  return [...inMemoryQueue];
}

export function getPendingSyncCount(): number {
  return inMemoryQueue.length;
}

export function enqueueSyncItem(
  type: SyncQueueItem['type'],
  payload: any
): SyncQueueItem {
  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    payload,
    retryCount: 0,
  };

  // If there's already a FULL_SNAPSHOT_SYNC in queue, replace it with the newer snapshot
  if (type === 'FULL_SNAPSHOT_SYNC') {
    inMemoryQueue = inMemoryQueue.filter((q) => q.type !== 'FULL_SNAPSHOT_SYNC');
  }

  inMemoryQueue.push(item);
  persistQueue();
  return item;
}

export function removeSyncQueueItem(id: string): void {
  inMemoryQueue = inMemoryQueue.filter((item) => item.id !== id);
  persistQueue();
}

export function clearSyncQueue(): void {
  inMemoryQueue = [];
  persistQueue();
}

export function markItemRetry(id: string): void {
  const item = inMemoryQueue.find((i) => i.id === id);
  if (item) {
    item.retryCount = (item.retryCount || 0) + 1;
    persistQueue();
  }
}
