/**
 * IndexedDB service for local plan storage
 * Provides persistent storage for plans with offline capabilities
 */

import type { Plan } from '../types/index.js';

const DB_NAME = 'ai-planning-assistant';
const DB_VERSION = 1;
const PLANS_STORE = 'plans';
const SYNC_QUEUE_STORE = 'syncQueue';

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  planId: string;
  data?: Plan;
  timestamp: Date;
  retryCount: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create plans store
        if (!db.objectStoreNames.contains(PLANS_STORE)) {
          const plansStore = db.createObjectStore(PLANS_STORE, { keyPath: 'id' });
          plansStore.createIndex('userId', 'userId', { unique: false });
          plansStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Get all plans for a user
   */
  async getPlans(userId: string): Promise<Plan[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PLANS_STORE], 'readonly');
      const store = transaction.objectStore(PLANS_STORE);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const plans = request.result || [];
        // Sort by updatedAt descending
        plans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(plans);
      };

      request.onerror = () => {
        reject(new Error('Failed to get plans from IndexedDB'));
      };
    });
  }

  /**
   * Get a single plan by ID
   */
  async getPlan(planId: string): Promise<Plan | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PLANS_STORE], 'readonly');
      const store = transaction.objectStore(PLANS_STORE);
      const request = store.get(planId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to get plan from IndexedDB'));
      };
    });
  }

  /**
   * Save a plan to IndexedDB
   */
  async savePlan(plan: Plan): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PLANS_STORE], 'readwrite');
      const store = transaction.objectStore(PLANS_STORE);
      const request = store.put(plan);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save plan to IndexedDB'));
      };
    });
  }

  /**
   * Delete a plan from IndexedDB
   */
  async deletePlan(planId: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PLANS_STORE], 'readwrite');
      const store = transaction.objectStore(PLANS_STORE);
      const request = store.delete(planId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete plan from IndexedDB'));
      };
    });
  }

  /**
   * Add item to sync queue for offline changes
   */
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const db = await this.ensureDB();
    
    const syncItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.put(syncItem);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to add item to sync queue'));
      };
    });
  }

  /**
   * Get all items from sync queue
   */
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        // Sort by timestamp ascending (oldest first)
        items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        resolve(items);
      };

      request.onerror = () => {
        reject(new Error('Failed to get sync queue'));
      };
    });
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(itemId: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const request = store.delete(itemId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to remove item from sync queue'));
      };
    });
  }

  /**
   * Clear all data (for testing or reset)
   */
  async clear(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PLANS_STORE, SYNC_QUEUE_STORE], 'readwrite');
      
      const plansStore = transaction.objectStore(PLANS_STORE);
      const syncStore = transaction.objectStore(SYNC_QUEUE_STORE);
      
      const clearPlans = plansStore.clear();
      const clearSync = syncStore.clear();

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          resolve();
        }
      };

      clearPlans.onsuccess = checkComplete;
      clearSync.onsuccess = checkComplete;

      clearPlans.onerror = () => reject(new Error('Failed to clear plans store'));
      clearSync.onerror = () => reject(new Error('Failed to clear sync store'));
    });
  }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();