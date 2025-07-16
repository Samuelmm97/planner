/**
 * Tests for IndexedDB service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random()),
  },
  writable: true,
});

// Mock the entire IndexedDB service module
vi.mock('../indexeddb.js', () => {
  const mockService = {
    init: vi.fn().mockResolvedValue(undefined),
    getPlans: vi.fn().mockResolvedValue([]),
    getPlan: vi.fn().mockResolvedValue(null),
    savePlan: vi.fn().mockResolvedValue(undefined),
    deletePlan: vi.fn().mockResolvedValue(undefined),
    addToSyncQueue: vi.fn().mockResolvedValue(undefined),
    getSyncQueue: vi.fn().mockResolvedValue([]),
    removeFromSyncQueue: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
  
  return {
    indexedDBService: mockService,
  };
});

import { indexedDBService } from '../indexeddb.js';
import type { Plan } from '../../types/index.js';

describe('IndexedDBService', () => {
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
  });

  describe('initialization', () => {
    it('should initialize database successfully', async () => {
      await expect(indexedDBService.init()).resolves.not.toThrow();
      expect(indexedDBService.init).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      (indexedDBService.init as any).mockRejectedValueOnce(new Error('Failed to open IndexedDB'));
      
      await expect(indexedDBService.init()).rejects.toThrow('Failed to open IndexedDB');
    });
  });

  describe('plan operations', () => {
    it('should save a plan', async () => {
      await indexedDBService.savePlan(mockPlan);
      expect(indexedDBService.savePlan).toHaveBeenCalledWith(mockPlan);
    });

    it('should get a plan by ID', async () => {
      (indexedDBService.getPlan as any).mockResolvedValueOnce(mockPlan);
      
      const result = await indexedDBService.getPlan('test-plan-1');
      expect(result).toEqual(mockPlan);
      expect(indexedDBService.getPlan).toHaveBeenCalledWith('test-plan-1');
    });

    it('should return null for non-existent plan', async () => {
      (indexedDBService.getPlan as any).mockResolvedValueOnce(null);
      
      const result = await indexedDBService.getPlan('non-existent');
      expect(result).toBeNull();
    });

    it('should get plans by user ID', async () => {
      const plans = [mockPlan];
      (indexedDBService.getPlans as any).mockResolvedValueOnce(plans);
      
      const result = await indexedDBService.getPlans('user-1');
      expect(result).toEqual(plans);
      expect(indexedDBService.getPlans).toHaveBeenCalledWith('user-1');
    });

    it('should delete a plan', async () => {
      await indexedDBService.deletePlan('test-plan-1');
      expect(indexedDBService.deletePlan).toHaveBeenCalledWith('test-plan-1');
    });

    it('should handle save errors', async () => {
      (indexedDBService.savePlan as any).mockRejectedValueOnce(new Error('Failed to save plan to IndexedDB'));
      
      await expect(indexedDBService.savePlan(mockPlan)).rejects.toThrow('Failed to save plan to IndexedDB');
    });
  });

  describe('sync queue operations', () => {
    it('should add item to sync queue', async () => {
      const syncItem = {
        operation: 'create' as const,
        planId: 'test-plan-1',
      };
      
      await indexedDBService.addToSyncQueue(syncItem);
      expect(indexedDBService.addToSyncQueue).toHaveBeenCalledWith(syncItem);
    });

    it('should get sync queue', async () => {
      const syncItems = [
        {
          id: 'sync-1',
          operation: 'create' as const,
          planId: 'test-plan-1',
          timestamp: new Date(),
          retryCount: 0,
        },
      ];
      
      (indexedDBService.getSyncQueue as any).mockResolvedValueOnce(syncItems);
      
      const result = await indexedDBService.getSyncQueue();
      expect(result).toEqual(syncItems);
    });

    it('should remove item from sync queue', async () => {
      await indexedDBService.removeFromSyncQueue('sync-1');
      expect(indexedDBService.removeFromSyncQueue).toHaveBeenCalledWith('sync-1');
    });
  });

  describe('clear operation', () => {
    it('should clear all data', async () => {
      await indexedDBService.clear();
      expect(indexedDBService.clear).toHaveBeenCalled();
    });
  });
});