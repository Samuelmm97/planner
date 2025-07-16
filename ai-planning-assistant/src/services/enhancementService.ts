/**
 * Enhancement Service for managing AI-generated plan enhancements
 * Handles change approval, rejection, history tracking, and rollback capabilities
 */

import type {
  Enhancement,
  Change,
  EnhancementStatus,
  Plan,
} from '../types/index.js';

// Change history entry for tracking applied changes
export interface ChangeHistoryEntry {
  id: string;
  enhancementId: string;
  planId: string;
  changeId: string;
  appliedAt: Date;
  appliedBy: string; // user ID
  originalValue: any;
  appliedValue: any;
  rollbackData?: any; // Additional data needed for rollback
}

// Batch operation result
export interface BatchOperationResult {
  successful: string[]; // IDs of successful operations
  failed: { id: string; error: string }[]; // Failed operations with errors
}

// Enhancement service interface
export interface IEnhancementService {
  // Enhancement management
  getEnhancementsByPlan(planId: string): Promise<Enhancement[]>;
  getPendingEnhancements(planId: string): Promise<Enhancement[]>;
  getEnhancementById(enhancementId: string): Promise<Enhancement | null>;

  // Change approval/rejection
  approveChanges(
    enhancementId: string,
    changeIds?: string[],
    userId?: string
  ): Promise<BatchOperationResult>;

  rejectChanges(
    enhancementId: string,
    changeIds?: string[],
    feedback?: string,
    userId?: string
  ): Promise<BatchOperationResult>;

  editChange(
    enhancementId: string,
    changeId: string,
    newValue: any,
    userId?: string
  ): Promise<void>;

  // Batch operations
  batchApproveEnhancements(
    enhancementIds: string[],
    userId?: string
  ): Promise<BatchOperationResult>;

  batchRejectEnhancements(
    enhancementIds: string[],
    feedback?: string,
    userId?: string
  ): Promise<BatchOperationResult>;

  // Change history and rollback
  getChangeHistory(planId: string): Promise<ChangeHistoryEntry[]>;
  rollbackChange(historyEntryId: string, userId?: string): Promise<void>;
  rollbackEnhancement(enhancementId: string, userId?: string): Promise<void>;

  // Storage management
  saveEnhancement(enhancement: Enhancement): Promise<void>;
  deleteEnhancement(enhancementId: string): Promise<void>;
  clearHistory(planId: string, olderThan?: Date): Promise<void>;
}

// IndexedDB-based enhancement service implementation
export class IndexedDBEnhancementService implements IEnhancementService {
  private dbName = 'ai-planning-assistant';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Enhancements store
        if (!db.objectStoreNames.contains('enhancements')) {
          const enhancementStore = db.createObjectStore('enhancements', {
            keyPath: 'id',
          });
          enhancementStore.createIndex('planId', 'planId', { unique: false });
          enhancementStore.createIndex('status', 'status', { unique: false });
          enhancementStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          });
        }

        // Change history store
        if (!db.objectStoreNames.contains('changeHistory')) {
          const historyStore = db.createObjectStore('changeHistory', {
            keyPath: 'id',
          });
          historyStore.createIndex('planId', 'planId', { unique: false });
          historyStore.createIndex('enhancementId', 'enhancementId', {
            unique: false,
          });
          historyStore.createIndex('appliedAt', 'appliedAt', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    return this.db;
  }

  async getEnhancementsByPlan(planId: string): Promise<Enhancement[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['enhancements'], 'readonly');
      const store = transaction.objectStore('enhancements');
      const index = store.index('planId');
      const request = index.getAll(planId);

      request.onsuccess = () => {
        const enhancements = request.result.map(this.deserializeEnhancement);
        // Sort by creation date, newest first
        enhancements.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        resolve(enhancements);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingEnhancements(planId: string): Promise<Enhancement[]> {
    const allEnhancements = await this.getEnhancementsByPlan(planId);
    return allEnhancements.filter((e) => e.status === 'pending');
  }

  async getEnhancementById(enhancementId: string): Promise<Enhancement | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['enhancements'], 'readonly');
      const store = transaction.objectStore('enhancements');
      const request = store.get(enhancementId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? this.deserializeEnhancement(result) : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async approveChanges(
    enhancementId: string,
    changeIds?: string[],
    userId: string = 'anonymous'
  ): Promise<BatchOperationResult> {
    const enhancement = await this.getEnhancementById(enhancementId);
    if (!enhancement) {
      throw new Error(`Enhancement ${enhancementId} not found`);
    }

    const result: BatchOperationResult = {
      successful: [],
      failed: [],
    };

    try {
      // If no specific changes specified, approve all
      const changesToApprove =
        changeIds ||
        enhancement.changes.map(
          (_, index) => `${enhancementId}-change-${index}`
        );

      // Create change history entries
      const historyEntries: ChangeHistoryEntry[] = [];

      for (const changeId of changesToApprove) {
        try {
          const changeIndex = this.extractChangeIndex(changeId);
          const change = enhancement.changes[changeIndex];

          if (!change) {
            result.failed.push({
              id: changeId,
              error: 'Change not found',
            });
            continue;
          }

          // Create history entry
          const historyEntry: ChangeHistoryEntry = {
            id: crypto.randomUUID(),
            enhancementId,
            planId: enhancement.planId,
            changeId,
            appliedAt: new Date(),
            appliedBy: userId,
            originalValue: change.oldValue,
            appliedValue: change.newValue,
            rollbackData: {
              operation: change.operation,
              target: change.target,
            },
          };

          historyEntries.push(historyEntry);
          result.successful.push(changeId);
        } catch (error) {
          result.failed.push({
            id: changeId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Save history entries
      await this.saveChangeHistory(historyEntries);

      // Update enhancement status
      const updatedEnhancement: Enhancement = {
        ...enhancement,
        status: 'approved',
        appliedAt: new Date(),
      };
      await this.saveEnhancement(updatedEnhancement);
    } catch (error) {
      // If something goes wrong, mark all as failed
      changesToApprove.forEach((id) => {
        if (!result.successful.includes(id)) {
          result.failed.push({
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    }

    return result;
  }

  async rejectChanges(
    enhancementId: string,
    changeIds?: string[],
    feedback?: string,
    userId: string = 'anonymous'
  ): Promise<BatchOperationResult> {
    const enhancement = await this.getEnhancementById(enhancementId);
    if (!enhancement) {
      throw new Error(`Enhancement ${enhancementId} not found`);
    }

    const result: BatchOperationResult = {
      successful: [],
      failed: [],
    };

    try {
      const changesToReject =
        changeIds ||
        enhancement.changes.map(
          (_, index) => `${enhancementId}-change-${index}`
        );

      // Update enhancement with rejection info
      const updatedEnhancement: Enhancement = {
        ...enhancement,
        status: 'rejected',
        rejectedAt: new Date(),
        userFeedback: feedback,
      };

      await this.saveEnhancement(updatedEnhancement);

      // Mark all changes as successfully rejected
      result.successful = changesToReject;
    } catch (error) {
      // Mark all as failed if something goes wrong
      const changesToReject =
        changeIds ||
        enhancement.changes.map(
          (_, index) => `${enhancementId}-change-${index}`
        );

      changesToReject.forEach((id) => {
        result.failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }

    return result;
  }

  async editChange(
    enhancementId: string,
    changeId: string,
    newValue: any,
    userId: string = 'anonymous'
  ): Promise<void> {
    const enhancement = await this.getEnhancementById(enhancementId);
    if (!enhancement) {
      throw new Error(`Enhancement ${enhancementId} not found`);
    }

    const changeIndex = this.extractChangeIndex(changeId);
    if (changeIndex < 0 || changeIndex >= enhancement.changes.length) {
      throw new Error(`Change ${changeId} not found`);
    }

    // Update the change with new value
    const updatedChanges = [...enhancement.changes];
    updatedChanges[changeIndex] = {
      ...updatedChanges[changeIndex],
      newValue,
      description: `${updatedChanges[changeIndex].description} (edited by user)`,
    };

    const updatedEnhancement: Enhancement = {
      ...enhancement,
      changes: updatedChanges,
    };

    await this.saveEnhancement(updatedEnhancement);
  }

  async batchApproveEnhancements(
    enhancementIds: string[],
    userId: string = 'anonymous'
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      successful: [],
      failed: [],
    };

    for (const enhancementId of enhancementIds) {
      try {
        await this.approveChanges(enhancementId, undefined, userId);
        result.successful.push(enhancementId);
      } catch (error) {
        result.failed.push({
          id: enhancementId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async batchRejectEnhancements(
    enhancementIds: string[],
    feedback?: string,
    userId: string = 'anonymous'
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      successful: [],
      failed: [],
    };

    for (const enhancementId of enhancementIds) {
      try {
        await this.rejectChanges(enhancementId, undefined, feedback, userId);
        result.successful.push(enhancementId);
      } catch (error) {
        result.failed.push({
          id: enhancementId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  async getChangeHistory(planId: string): Promise<ChangeHistoryEntry[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['changeHistory'], 'readonly');
      const store = transaction.objectStore('changeHistory');
      const index = store.index('planId');
      const request = index.getAll(planId);

      request.onsuccess = () => {
        const history = request.result.map(this.deserializeHistoryEntry);
        // Sort by applied date, newest first
        history.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
        resolve(history);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async rollbackChange(
    historyEntryId: string,
    userId: string = 'anonymous'
  ): Promise<void> {
    const db = await this.ensureDB();

    // Get the history entry
    const historyEntry = await new Promise<ChangeHistoryEntry | null>(
      (resolve, reject) => {
        const transaction = db.transaction(['changeHistory'], 'readonly');
        const store = transaction.objectStore('changeHistory');
        const request = store.get(historyEntryId);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? this.deserializeHistoryEntry(result) : null);
        };
        request.onerror = () => reject(request.error);
      }
    );

    if (!historyEntry) {
      throw new Error(`History entry ${historyEntryId} not found`);
    }

    // Create a rollback enhancement
    const rollbackEnhancement: Enhancement = {
      id: crypto.randomUUID(),
      planId: historyEntry.planId,
      type: 'optimization',
      changes: [
        {
          operation: 'modify',
          target: historyEntry.rollbackData?.target || 'unknown',
          oldValue: historyEntry.appliedValue,
          newValue: historyEntry.originalValue,
          description: `Rollback of change from ${historyEntry.appliedAt.toLocaleString()}`,
          confidence: 1.0,
        },
      ],
      confidence: 1.0,
      reasoning: `User-requested rollback of previous change`,
      status: 'approved',
      createdAt: new Date(),
      appliedAt: new Date(),
    };

    await this.saveEnhancement(rollbackEnhancement);

    // Create new history entry for the rollback
    const rollbackHistoryEntry: ChangeHistoryEntry = {
      id: crypto.randomUUID(),
      enhancementId: rollbackEnhancement.id,
      planId: historyEntry.planId,
      changeId: `${rollbackEnhancement.id}-change-0`,
      appliedAt: new Date(),
      appliedBy: userId,
      originalValue: historyEntry.appliedValue,
      appliedValue: historyEntry.originalValue,
      rollbackData: {
        isRollback: true,
        originalHistoryEntryId: historyEntryId,
      },
    };

    await this.saveChangeHistory([rollbackHistoryEntry]);
  }

  async rollbackEnhancement(
    enhancementId: string,
    userId: string = 'anonymous'
  ): Promise<void> {
    // Get all history entries for this enhancement
    const db = await this.ensureDB();
    const historyEntries = await new Promise<ChangeHistoryEntry[]>(
      (resolve, reject) => {
        const transaction = db.transaction(['changeHistory'], 'readonly');
        const store = transaction.objectStore('changeHistory');
        const index = store.index('enhancementId');
        const request = index.getAll(enhancementId);

        request.onsuccess = () => {
          const entries = request.result.map(this.deserializeHistoryEntry);
          resolve(entries);
        };
        request.onerror = () => reject(request.error);
      }
    );

    // Rollback each change in reverse order
    for (const entry of historyEntries.reverse()) {
      await this.rollbackChange(entry.id, userId);
    }
  }

  async saveEnhancement(enhancement: Enhancement): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['enhancements'], 'readwrite');
      const store = transaction.objectStore('enhancements');
      const request = store.put(this.serializeEnhancement(enhancement));

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteEnhancement(enhancementId: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['enhancements'], 'readwrite');
      const store = transaction.objectStore('enhancements');
      const request = store.delete(enhancementId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearHistory(planId: string, olderThan?: Date): Promise<void> {
    const db = await this.ensureDB();
    const cutoffDate =
      olderThan || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['changeHistory'], 'readwrite');
      const store = transaction.objectStore('changeHistory');
      const index = store.index('planId');
      const request = index.openCursor(planId);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = this.deserializeHistoryEntry(cursor.value);
          if (entry.appliedAt < cutoffDate) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async saveChangeHistory(
    entries: ChangeHistoryEntry[]
  ): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['changeHistory'], 'readwrite');
      const store = transaction.objectStore('changeHistory');

      let completed = 0;
      const total = entries.length;

      if (total === 0) {
        resolve();
        return;
      }

      entries.forEach((entry) => {
        const request = store.put(this.serializeHistoryEntry(entry));
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  private extractChangeIndex(changeId: string): number {
    const match = changeId.match(/-change-(\d+)$/);
    return match ? parseInt(match[1], 10) : -1;
  }

  private serializeEnhancement(enhancement: Enhancement): any {
    return {
      ...enhancement,
      createdAt: enhancement.createdAt.toISOString(),
      appliedAt: enhancement.appliedAt?.toISOString(),
      rejectedAt: enhancement.rejectedAt?.toISOString(),
    };
  }

  private deserializeEnhancement(data: any): Enhancement {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : undefined,
      rejectedAt: data.rejectedAt ? new Date(data.rejectedAt) : undefined,
    };
  }

  private serializeHistoryEntry(entry: ChangeHistoryEntry): any {
    return {
      ...entry,
      appliedAt: entry.appliedAt.toISOString(),
    };
  }

  private deserializeHistoryEntry(data: any): ChangeHistoryEntry {
    return {
      ...data,
      appliedAt: new Date(data.appliedAt),
    };
  }
}

// Export singleton instance
export const enhancementService = new IndexedDBEnhancementService();
