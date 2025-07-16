/**
 * Plan service for managing plan operations
 * Handles CRUD operations with optimistic updates and offline support
 */

import type { Plan, PlanItem, StructuredPlanData, NaturalLanguageContent } from '../types/index.js';
import { indexedDBService } from './indexeddb.js';

export interface CreatePlanInput {
  title: string;
  content: NaturalLanguageContent;
  userId: string;
  structuredData?: Partial<StructuredPlanData>;
}

export interface UpdatePlanInput {
  id: string;
  title?: string;
  content?: NaturalLanguageContent;
  structuredData?: Partial<StructuredPlanData>;
}

export interface PlanServiceEvents {
  planCreated: (plan: Plan) => void;
  planUpdated: (plan: Plan) => void;
  planDeleted: (planId: string) => void;
  plansLoaded: (plans: Plan[]) => void;
  error: (error: Error) => void;
}

class PlanService {
  private eventListeners: Partial<PlanServiceEvents> = {};
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Subscribe to plan service events
   */
  on<K extends keyof PlanServiceEvents>(event: K, listener: PlanServiceEvents[K]): void {
    this.eventListeners[event] = listener;
  }

  /**
   * Unsubscribe from plan service events
   */
  off<K extends keyof PlanServiceEvents>(event: K): void {
    delete this.eventListeners[event];
  }

  /**
   * Emit an event to listeners
   */
  private emit<K extends keyof PlanServiceEvents>(event: K, ...args: Parameters<PlanServiceEvents[K]>): void {
    const listener = this.eventListeners[event];
    if (listener) {
      (listener as any)(...args);
    }
  }

  /**
   * Load all plans for a user
   */
  async loadPlans(userId: string): Promise<Plan[]> {
    try {
      await indexedDBService.init();
      const plans = await indexedDBService.getPlans(userId);
      this.emit('plansLoaded', plans);
      return plans;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to load plans');
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Get a single plan by ID
   */
  async getPlan(planId: string): Promise<Plan | null> {
    try {
      await indexedDBService.init();
      return await indexedDBService.getPlan(planId);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get plan');
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Create a new plan
   */
  async createPlan(input: CreatePlanInput): Promise<Plan> {
    try {
      const now = new Date();
      const plan: Plan = {
        id: crypto.randomUUID(),
        userId: input.userId,
        title: input.title,
        content: input.content,
        structuredData: {
          type: 'custom',
          items: [],
          tags: [],
          ...input.structuredData,
        },
        metadata: {
          source: 'user_input',
          language: 'en',
          complexity: 'simple',
        },
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      await indexedDBService.init();
      await indexedDBService.savePlan(plan);

      // Add to sync queue if offline
      if (!this.isOnline) {
        await indexedDBService.addToSyncQueue({
          operation: 'create',
          planId: plan.id,
          data: plan,
        });
      }

      this.emit('planCreated', plan);
      return plan;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create plan');
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Update an existing plan
   */
  async updatePlan(input: UpdatePlanInput): Promise<Plan> {
    try {
      await indexedDBService.init();
      const existingPlan = await indexedDBService.getPlan(input.id);
      
      if (!existingPlan) {
        throw new Error('Plan not found');
      }

      const updatedPlan: Plan = {
        ...existingPlan,
        ...input,
        structuredData: {
          ...existingPlan.structuredData,
          ...input.structuredData,
        },
        version: existingPlan.version + 1,
        updatedAt: new Date(),
      };

      await indexedDBService.savePlan(updatedPlan);

      // Add to sync queue if offline
      if (!this.isOnline) {
        await indexedDBService.addToSyncQueue({
          operation: 'update',
          planId: updatedPlan.id,
          data: updatedPlan,
        });
      }

      this.emit('planUpdated', updatedPlan);
      return updatedPlan;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update plan');
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId: string): Promise<void> {
    try {
      await indexedDBService.init();
      await indexedDBService.deletePlan(planId);

      // Add to sync queue if offline
      if (!this.isOnline) {
        await indexedDBService.addToSyncQueue({
          operation: 'delete',
          planId,
        });
      }

      this.emit('planDeleted', planId);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to delete plan');
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Add an item to a plan
   */
  async addPlanItem(planId: string, item: Omit<PlanItem, 'id' | 'order'>): Promise<Plan> {
    try {
      await indexedDBService.init();
      const plan = await indexedDBService.getPlan(planId);
      
      if (!plan) {
        throw new Error('Plan not found');
      }

      const newItem: PlanItem = {
        ...item,
        id: crypto.randomUUID(),
        order: plan.structuredData.items.length,
      };

      const updatedPlan: Plan = {
        ...plan,
        structuredData: {
          ...plan.structuredData,
          items: [...plan.structuredData.items, newItem],
        },
        version: plan.version + 1,
        updatedAt: new Date(),
      };

      await indexedDBService.savePlan(updatedPlan);

      // Add to sync queue if offline
      if (!this.isOnline) {
        await indexedDBService.addToSyncQueue({
          operation: 'update',
          planId: updatedPlan.id,
          data: updatedPlan,
        });
      }

      this.emit('planUpdated', updatedPlan);
      return updatedPlan;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to add plan item');
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Update a plan item
   */
  async updatePlanItem(planId: string, itemId: string, updates: Partial<PlanItem>): Promise<Plan> {
    try {
      await indexedDBService.init();
      const plan = await indexedDBService.getPlan(planId);
      
      if (!plan) {
        throw new Error('Plan not found');
      }

      const itemIndex = plan.structuredData.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error('Plan item not found');
      }

      const updatedItems = [...plan.structuredData.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        ...updates,
      };

      const updatedPlan: Plan = {
        ...plan,
        structuredData: {
          ...plan.structuredData,
          items: updatedItems,
        },
        version: plan.version + 1,
        updatedAt: new Date(),
      };

      await indexedDBService.savePlan(updatedPlan);

      // Add to sync queue if offline
      if (!this.isOnline) {
        await indexedDBService.addToSyncQueue({
          operation: 'update',
          planId: updatedPlan.id,
          data: updatedPlan,
        });
      }

      this.emit('planUpdated', updatedPlan);
      return updatedPlan;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update plan item');
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Remove a plan item
   */
  async removePlanItem(planId: string, itemId: string): Promise<Plan> {
    try {
      await indexedDBService.init();
      const plan = await indexedDBService.getPlan(planId);
      
      if (!plan) {
        throw new Error('Plan not found');
      }

      const updatedItems = plan.structuredData.items.filter(item => item.id !== itemId);
      
      // Reorder items
      updatedItems.forEach((item, index) => {
        item.order = index;
      });

      const updatedPlan: Plan = {
        ...plan,
        structuredData: {
          ...plan.structuredData,
          items: updatedItems,
        },
        version: plan.version + 1,
        updatedAt: new Date(),
      };

      await indexedDBService.savePlan(updatedPlan);

      // Add to sync queue if offline
      if (!this.isOnline) {
        await indexedDBService.addToSyncQueue({
          operation: 'update',
          planId: updatedPlan.id,
          data: updatedPlan,
        });
      }

      this.emit('planUpdated', updatedPlan);
      return updatedPlan;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to remove plan item');
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Process sync queue when coming back online
   */
  private async processSyncQueue(): Promise<void> {
    try {
      await indexedDBService.init();
      const syncQueue = await indexedDBService.getSyncQueue();
      
      for (const item of syncQueue) {
        try {
          // Here you would sync with your backend API
          // For now, we'll just remove from queue since we're local-only
          await indexedDBService.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error('Failed to sync item:', item, error);
          // Could implement retry logic here
        }
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }

  /**
   * Get sync queue status (for debugging/monitoring)
   */
  async getSyncQueueStatus(): Promise<{ pending: number; items: any[] }> {
    try {
      await indexedDBService.init();
      const items = await indexedDBService.getSyncQueue();
      return {
        pending: items.length,
        items: items.map(item => ({
          id: item.id,
          operation: item.operation,
          planId: item.planId,
          timestamp: item.timestamp,
          retryCount: item.retryCount,
        })),
      };
    } catch (error) {
      return { pending: 0, items: [] };
    }
  }
}

// Export singleton instance
export const planService = new PlanService();