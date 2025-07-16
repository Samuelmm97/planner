/**
 * Tests for Plan Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { planService } from '../planService.js';
import { indexedDBService } from '../indexeddb.js';
import type { Plan, PlanItem } from '../../types/index.js';

// Mock IndexedDB service
vi.mock('../indexeddb.js', () => ({
  indexedDBService: {
    init: vi.fn(),
    getPlans: vi.fn(),
    getPlan: vi.fn(),
    savePlan: vi.fn(),
    deletePlan: vi.fn(),
    addToSyncQueue: vi.fn(),
  },
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random()),
  },
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('PlanService', () => {
  const mockPlan: Plan = {
    id: 'test-plan-1',
    userId: 'user-1',
    title: 'Test Plan',
    content: { originalText: 'Test content' },
    structuredData: {
      type: 'custom',
      items: [],
      tags: ['test'],
    },
    metadata: {
      source: 'user_input',
      language: 'en',
      complexity: 'simple',
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (indexedDBService.init as any).mockResolvedValue(undefined);
    (indexedDBService.getPlans as any).mockResolvedValue([]);
    (indexedDBService.getPlan as any).mockResolvedValue(null);
    (indexedDBService.savePlan as any).mockResolvedValue(undefined);
    (indexedDBService.deletePlan as any).mockResolvedValue(undefined);
    (indexedDBService.addToSyncQueue as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clear any event listeners
    planService.off('planCreated');
    planService.off('planUpdated');
    planService.off('planDeleted');
    planService.off('plansLoaded');
    planService.off('error');
  });

  describe('event handling', () => {
    it('should register and emit events', () => {
      const mockListener = vi.fn();
      
      planService.on('planCreated', mockListener);
      
      // Simulate event emission (this would normally happen internally)
      (planService as any).emit('planCreated', mockPlan);
      
      expect(mockListener).toHaveBeenCalledWith(mockPlan);
    });

    it('should unregister events', () => {
      const mockListener = vi.fn();
      
      planService.on('planCreated', mockListener);
      planService.off('planCreated');
      
      // Simulate event emission
      (planService as any).emit('planCreated', mockPlan);
      
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('loadPlans', () => {
    it('should load plans successfully', async () => {
      const plans = [mockPlan];
      (indexedDBService.getPlans as any).mockResolvedValue(plans);
      
      const mockListener = vi.fn();
      planService.on('plansLoaded', mockListener);

      const result = await planService.loadPlans('user-1');

      expect(result).toEqual(plans);
      expect(indexedDBService.init).toHaveBeenCalled();
      expect(indexedDBService.getPlans).toHaveBeenCalledWith('user-1');
      expect(mockListener).toHaveBeenCalledWith(plans);
    });

    it('should handle load errors', async () => {
      const error = new Error('Load failed');
      (indexedDBService.getPlans as any).mockRejectedValue(error);
      
      const mockErrorListener = vi.fn();
      planService.on('error', mockErrorListener);

      await expect(planService.loadPlans('user-1')).rejects.toThrow('Load failed');
      expect(mockErrorListener).toHaveBeenCalledWith(error);
    });
  });

  describe('createPlan', () => {
    it('should create a plan successfully', async () => {
      const input = {
        title: 'New Plan',
        content: { originalText: 'New content' },
        userId: 'user-1',
      };

      const mockListener = vi.fn();
      planService.on('planCreated', mockListener);

      const result = await planService.createPlan(input);

      expect(result).toMatchObject({
        title: input.title,
        content: input.content,
        userId: input.userId,
        version: 1,
      });
      expect(indexedDBService.savePlan).toHaveBeenCalledWith(result);
      expect(mockListener).toHaveBeenCalledWith(result);
    });

    it('should add to sync queue when offline', async () => {
      // Mock offline state by modifying the planService's internal isOnline property
      (planService as any).isOnline = false;
      
      const input = {
        title: 'New Plan',
        content: { originalText: 'New content' },
        userId: 'user-1',
      };

      const result = await planService.createPlan(input);

      expect(indexedDBService.addToSyncQueue).toHaveBeenCalledWith({
        operation: 'create',
        planId: result.id,
        data: result,
      });

      // Reset online state
      (planService as any).isOnline = true;
    });

    it('should handle create errors', async () => {
      const error = new Error('Create failed');
      (indexedDBService.savePlan as any).mockRejectedValue(error);
      
      const mockErrorListener = vi.fn();
      planService.on('error', mockErrorListener);

      const input = {
        title: 'New Plan',
        content: { originalText: 'New content' },
        userId: 'user-1',
      };

      await expect(planService.createPlan(input)).rejects.toThrow('Create failed');
      expect(mockErrorListener).toHaveBeenCalledWith(error);
    });
  });

  describe('updatePlan', () => {
    it('should update a plan successfully', async () => {
      (indexedDBService.getPlan as any).mockResolvedValue(mockPlan);
      
      const input = {
        id: 'test-plan-1',
        title: 'Updated Plan',
      };

      const mockListener = vi.fn();
      planService.on('planUpdated', mockListener);

      const result = await planService.updatePlan(input);

      expect(result.title).toBe('Updated Plan');
      expect(result.version).toBe(mockPlan.version + 1);
      expect(indexedDBService.savePlan).toHaveBeenCalledWith(result);
      expect(mockListener).toHaveBeenCalledWith(result);
    });

    it('should handle plan not found', async () => {
      (indexedDBService.getPlan as any).mockResolvedValue(null);
      
      const input = {
        id: 'non-existent',
        title: 'Updated Plan',
      };

      await expect(planService.updatePlan(input)).rejects.toThrow('Plan not found');
    });
  });

  describe('deletePlan', () => {
    it('should delete a plan successfully', async () => {
      const mockListener = vi.fn();
      planService.on('planDeleted', mockListener);

      await planService.deletePlan('test-plan-1');

      expect(indexedDBService.deletePlan).toHaveBeenCalledWith('test-plan-1');
      expect(mockListener).toHaveBeenCalledWith('test-plan-1');
    });
  });

  describe('plan item operations', () => {
    const mockPlanWithItems: Plan = {
      ...mockPlan,
      structuredData: {
        ...mockPlan.structuredData,
        items: [
          {
            id: 'item-1',
            text: 'Test item',
            type: 'task',
            status: 'pending',
            aiGenerated: false,
            order: 0,
          },
        ],
      },
    };

    it('should add a plan item', async () => {
      (indexedDBService.getPlan as any).mockResolvedValue(mockPlan);
      
      const newItem = {
        text: 'New item',
        type: 'task' as const,
        status: 'pending' as const,
        aiGenerated: false,
      };

      const result = await planService.addPlanItem('test-plan-1', newItem);

      expect(result.structuredData.items).toHaveLength(1);
      expect(result.structuredData.items[0]).toMatchObject(newItem);
      expect(result.version).toBe(mockPlan.version + 1);
    });

    it('should update a plan item', async () => {
      (indexedDBService.getPlan as any).mockResolvedValue(mockPlanWithItems);
      
      const updates = { text: 'Updated item text' };

      const result = await planService.updatePlanItem('test-plan-1', 'item-1', updates);

      expect(result.structuredData.items[0].text).toBe('Updated item text');
      expect(result.version).toBe(mockPlanWithItems.version + 1);
    });

    it('should remove a plan item', async () => {
      (indexedDBService.getPlan as any).mockResolvedValue(mockPlanWithItems);

      const result = await planService.removePlanItem('test-plan-1', 'item-1');

      expect(result.structuredData.items).toHaveLength(0);
      expect(result.version).toBe(mockPlanWithItems.version + 1);
    });

    it('should handle item not found', async () => {
      (indexedDBService.getPlan as any).mockResolvedValue(mockPlan);

      await expect(
        planService.updatePlanItem('test-plan-1', 'non-existent', { text: 'Updated' })
      ).rejects.toThrow('Plan item not found');
    });
  });

  describe('sync queue status', () => {
    it('should get sync queue status', async () => {
      const mockSyncQueue = [
        {
          id: 'sync-1',
          operation: 'create' as const,
          planId: 'test-plan-1',
          timestamp: new Date(),
          retryCount: 0,
        },
      ];
      
      (indexedDBService as any).getSyncQueue = vi.fn().mockResolvedValue(mockSyncQueue);

      const status = await planService.getSyncQueueStatus();

      expect(status.pending).toBe(1);
      expect(status.items).toHaveLength(1);
      expect(status.items[0]).toMatchObject({
        id: 'sync-1',
        operation: 'create',
        planId: 'test-plan-1',
      });
    });

    it('should handle sync queue errors', async () => {
      (indexedDBService as any).getSyncQueue = vi.fn().mockRejectedValue(new Error('Sync error'));

      const status = await planService.getSyncQueueStatus();

      expect(status.pending).toBe(0);
      expect(status.items).toHaveLength(0);
    });
  });
});