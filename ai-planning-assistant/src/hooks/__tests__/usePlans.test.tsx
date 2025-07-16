/**
 * Tests for usePlans hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { usePlans } from '../usePlans.js';
import { PlanProvider } from '../usePlanContext.js';
import { planService } from '../../services/planService.js';
import type { Plan } from '../../types/index.js';

// Mock plan service
vi.mock('../../services/planService.js', () => ({
  planService: {
    on: vi.fn(),
    off: vi.fn(),
    loadPlans: vi.fn(),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    addPlanItem: vi.fn(),
    updatePlanItem: vi.fn(),
    removePlanItem: vi.fn(),
    getSyncQueueStatus: vi.fn(),
  },
}));

describe('usePlans hook', () => {
  const mockPlan: Plan = {
    id: 'test-plan-1',
    userId: 'user-1',
    title: 'Test Plan',
    content: { originalText: 'Test content' },
    structuredData: {
      type: 'custom',
      items: [
        {
          id: 'item-1',
          text: 'Test item',
          type: 'task',
          status: 'pending',
          aiGenerated: false,
          order: 0,
        },
        {
          id: 'item-2',
          text: 'Completed item',
          type: 'task',
          status: 'completed',
          aiGenerated: false,
          order: 1,
        },
      ],
      tags: ['test', 'important'],
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

  const mockWorkoutPlan: Plan = {
    ...mockPlan,
    id: 'workout-plan-1',
    title: 'Workout Plan',
    content: { originalText: 'Workout content' },
    structuredData: {
      type: 'workout',
      items: [
        {
          id: 'workout-item-1',
          text: 'Push ups',
          type: 'task',
          status: 'pending',
          aiGenerated: false,
          order: 0,
        },
      ],
      tags: ['fitness', 'health'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock returns
    (planService.loadPlans as any).mockResolvedValue([]);
    (planService.createPlan as any).mockResolvedValue(mockPlan);
    (planService.updatePlan as any).mockResolvedValue(mockPlan);
    (planService.deletePlan as any).mockResolvedValue(undefined);
    (planService.addPlanItem as any).mockResolvedValue(mockPlan);
    (planService.updatePlanItem as any).mockResolvedValue(mockPlan);
    (planService.removePlanItem as any).mockResolvedValue(mockPlan);
    (planService.getSyncQueueStatus as any).mockResolvedValue({ pending: 0, items: [] });
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <PlanProvider userId="user-1">{children}</PlanProvider>
  );

  describe('basic functionality', () => {
    it('should provide plans state and actions', () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      expect(result.current.plans).toEqual([]);
      expect(result.current.loading).toBe(true); // Loading is true initially because useEffect loads plans on mount
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createPlan).toBe('function');
      expect(typeof result.current.updatePlan).toBe('function');
      expect(typeof result.current.deletePlan).toBe('function');
    });
  });

  describe('createPlan', () => {
    it('should create plan with string content', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      const options = {
        title: 'New Plan',
        content: 'Plan content',
        type: 'routine' as const,
        tags: ['daily'],
      };

      await act(async () => {
        await result.current.createPlan(options);
      });

      expect(planService.createPlan).toHaveBeenCalledWith({
        title: 'New Plan',
        content: { originalText: 'Plan content' },
        userId: 'user-1',
        structuredData: {
          type: 'routine',
          tags: ['daily'],
          items: [],
        },
      });
    });

    it('should create plan with NaturalLanguageContent', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      const content = {
        originalText: 'Plan content',
        confidence: 0.9,
      };

      const options = {
        title: 'New Plan',
        content,
      };

      await act(async () => {
        await result.current.createPlan(options);
      });

      expect(planService.createPlan).toHaveBeenCalledWith({
        title: 'New Plan',
        content,
        userId: 'user-1',
        structuredData: {
          type: 'custom',
          tags: [],
          items: [],
        },
      });
    });
  });

  describe('updatePlan', () => {
    it('should update plan with partial data', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      const options = {
        title: 'Updated Plan',
        tags: ['updated'],
      };

      await act(async () => {
        await result.current.updatePlan('test-plan-1', options);
      });

      expect(planService.updatePlan).toHaveBeenCalledWith({
        id: 'test-plan-1',
        title: 'Updated Plan',
        structuredData: { tags: ['updated'] },
      });
    });
  });

  describe('item operations', () => {
    it('should add text item', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.addTextItem('test-plan-1', 'New task');
      });

      expect(planService.addPlanItem).toHaveBeenCalledWith('test-plan-1', {
        text: 'New task',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
      });
    });

    it('should complete item', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.completeItem('test-plan-1', 'item-1');
      });

      expect(planService.updatePlanItem).toHaveBeenCalledWith('test-plan-1', 'item-1', {
        status: 'completed',
      });
    });

    it('should uncomplete item', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.uncompleteItem('test-plan-1', 'item-1');
      });

      expect(planService.updatePlanItem).toHaveBeenCalledWith('test-plan-1', 'item-1', {
        status: 'pending',
      });
    });

    it('should toggle item completion', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // First add the plan to state
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan]);
      });

      // Toggle pending item to completed
      await act(async () => {
        await result.current.toggleItemCompletion('test-plan-1', 'item-1');
      });

      expect(planService.updatePlanItem).toHaveBeenCalledWith('test-plan-1', 'item-1', {
        status: 'completed',
      });
    });

    it('should update item text', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      await act(async () => {
        await result.current.updateItemText('test-plan-1', 'item-1', 'Updated text');
      });

      expect(planService.updatePlanItem).toHaveBeenCalledWith('test-plan-1', 'item-1', {
        text: 'Updated text',
      });
    });
  });

  describe('utility functions', () => {
    beforeEach(() => {
      // Setup plans in state for utility function tests
    });

    it('should get plan by ID', () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // Add plans to state
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan, mockWorkoutPlan]);
      });

      const plan = result.current.getPlan('test-plan-1');
      expect(plan).toEqual(mockPlan);

      const nonExistent = result.current.getPlan('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    it('should get plans by tag', () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // Add plans to state
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan, mockWorkoutPlan]);
      });

      const testPlans = result.current.getPlansByTag('test');
      expect(testPlans).toHaveLength(1);
      expect(testPlans[0].id).toBe('test-plan-1');

      const fitnessPlans = result.current.getPlansByTag('fitness');
      expect(fitnessPlans).toHaveLength(1);
      expect(fitnessPlans[0].id).toBe('workout-plan-1');
    });

    it('should get completed items count', () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // Add plans to state
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan]);
      });

      const completedCount = result.current.getCompletedItemsCount('test-plan-1');
      expect(completedCount).toBe(1); // One completed item in mockPlan
    });

    it('should get total items count', () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // Add plans to state
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan]);
      });

      const totalCount = result.current.getTotalItemsCount('test-plan-1');
      expect(totalCount).toBe(2); // Two items in mockPlan
    });

    it('should get completion percentage', () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // Add plans to state
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan]);
      });

      const percentage = result.current.getCompletionPercentage('test-plan-1');
      expect(percentage).toBe(50); // 1 completed out of 2 total = 50%
    });

    it('should search plans by text', () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // Add plans to state
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan, mockWorkoutPlan]);
      });

      // Search by title (both plans have "Test" in title/content, so search for more specific term)
      const testResults = result.current.searchPlans('Test Plan');
      expect(testResults).toHaveLength(1);
      expect(testResults[0].id).toBe('test-plan-1');

      // Search by content
      const workoutResults = result.current.searchPlans('Workout');
      expect(workoutResults).toHaveLength(1);
      expect(workoutResults[0].id).toBe('workout-plan-1');

      // Search by item text
      const itemResults = result.current.searchPlans('Test item');
      expect(itemResults).toHaveLength(1);
      expect(itemResults[0].id).toBe('test-plan-1');
    });

    it('should handle empty search results', () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // Add plans to state
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan, mockWorkoutPlan]);
      });

      const results = result.current.searchPlans('nonexistent');
      expect(results).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle toggle completion error when item not found', async () => {
      const { result } = renderHook(() => usePlans('user-1'), {
        wrapper: TestWrapper,
      });

      // Add plan without the item we're looking for
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([{ ...mockPlan, structuredData: { ...mockPlan.structuredData, items: [] } }]);
      });

      await expect(
        result.current.toggleItemCompletion('test-plan-1', 'non-existent-item')
      ).rejects.toThrow('Item not found');
    });
  });
});