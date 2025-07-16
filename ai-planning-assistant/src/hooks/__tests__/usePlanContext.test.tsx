/**
 * Tests for Plan Context
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { PlanProvider, usePlanContext, useSelectedPlan, usePlansByType } from '../usePlanContext.js';
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

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('PlanContext', () => {
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

  const mockWorkoutPlan: Plan = {
    ...mockPlan,
    id: 'workout-plan-1',
    title: 'Workout Plan',
    structuredData: {
      ...mockPlan.structuredData,
      type: 'workout',
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <PlanProvider userId="user-1">{children}</PlanProvider>
  );

  describe('PlanProvider', () => {
    it('should provide plan context', () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(result.current.state).toBeDefined();
      expect(result.current.actions).toBeDefined();
    });

    it('should load plans on mount', async () => {
      renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(planService.loadPlans).toHaveBeenCalledWith('user-1');
      });
    });

    it('should set up event listeners', () => {
      renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      expect(planService.on).toHaveBeenCalledWith('planCreated', expect.any(Function));
      expect(planService.on).toHaveBeenCalledWith('planUpdated', expect.any(Function));
      expect(planService.on).toHaveBeenCalledWith('planDeleted', expect.any(Function));
      expect(planService.on).toHaveBeenCalledWith('plansLoaded', expect.any(Function));
      expect(planService.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      unmount();

      expect(planService.off).toHaveBeenCalledWith('planCreated');
      expect(planService.off).toHaveBeenCalledWith('planUpdated');
      expect(planService.off).toHaveBeenCalledWith('planDeleted');
      expect(planService.off).toHaveBeenCalledWith('plansLoaded');
      expect(planService.off).toHaveBeenCalledWith('error');
    });
  });

  describe('usePlanContext hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => usePlanContext());
      }).toThrow('usePlanContext must be used within a PlanProvider');
    });

    it('should provide initial state', () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state).toEqual({
        plans: [],
        loading: true, // Loading is true initially because useEffect loads plans on mount
        error: null,
        selectedPlanId: null,
        syncStatus: {
          isOnline: true,
          pendingSync: 0,
          lastSync: null,
        },
      });
    });

    it('should handle plan creation', async () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      const createInput = {
        title: 'New Plan',
        content: { originalText: 'New content' },
        userId: 'user-1',
      };

      await act(async () => {
        await result.current.actions.createPlan(createInput);
      });

      expect(planService.createPlan).toHaveBeenCalledWith(createInput);
    });

    it('should handle plan updates with optimistic updates', async () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      // First add a plan to state
      act(() => {
        const mockOnPlanCreated = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'planCreated'
        )[1];
        mockOnPlanCreated(mockPlan);
      });

      const updateInput = {
        id: 'test-plan-1',
        title: 'Updated Plan',
      };

      await act(async () => {
        await result.current.actions.updatePlan(updateInput);
      });

      expect(planService.updatePlan).toHaveBeenCalledWith(updateInput);
    });

    it('should handle plan deletion with optimistic updates', async () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      // First add a plan to state
      act(() => {
        const mockOnPlanCreated = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'planCreated'
        )[1];
        mockOnPlanCreated(mockPlan);
      });

      await act(async () => {
        await result.current.actions.deletePlan('test-plan-1');
      });

      expect(planService.deletePlan).toHaveBeenCalledWith('test-plan-1');
    });

    it('should handle errors', async () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      const error = new Error('Test error');
      (planService.createPlan as any).mockRejectedValue(error);

      const createInput = {
        title: 'New Plan',
        content: { originalText: 'New content' },
        userId: 'user-1',
      };

      await act(async () => {
        try {
          await result.current.actions.createPlan(createInput);
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.state.error).toBe('Test error');
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      // Set an error first
      act(() => {
        const mockOnError = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'error'
        )[1];
        mockOnError(new Error('Test error'));
      });

      expect(result.current.state.error).toBe('Test error');

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });

    it('should handle plan selection', () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.actions.selectPlan('test-plan-1');
      });

      expect(result.current.state.selectedPlanId).toBe('test-plan-1');
    });

    it('should refresh sync status', async () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      const mockSyncStatus = { pending: 5, items: [] };
      (planService.getSyncQueueStatus as any).mockResolvedValue(mockSyncStatus);

      await act(async () => {
        await result.current.actions.refreshSyncStatus();
      });

      expect(result.current.state.syncStatus.pendingSync).toBe(5);
    });
  });

  describe('useSelectedPlan hook', () => {
    it('should return selected plan', () => {
      const { result } = renderHook(
        () => {
          const context = usePlanContext();
          const selectedPlan = useSelectedPlan();
          return { context, selectedPlan };
        },
        { wrapper: TestWrapper }
      );

      // Add plan and select it
      act(() => {
        const mockOnPlanCreated = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'planCreated'
        )[1];
        mockOnPlanCreated(mockPlan);
      });

      act(() => {
        result.current.context.actions.selectPlan('test-plan-1');
      });

      expect(result.current.selectedPlan).toEqual(mockPlan);
    });

    it('should return null when no plan selected', () => {
      const { result } = renderHook(() => useSelectedPlan(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeNull();
    });
  });

  describe('usePlansByType hook', () => {
    it('should return all plans when no type specified', () => {
      const { result } = renderHook(
        () => {
          const context = usePlanContext();
          const plansByType = usePlansByType();
          return { context, plansByType };
        },
        { wrapper: TestWrapper }
      );

      // Add plans
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan, mockWorkoutPlan]);
      });

      expect(result.current.plansByType).toHaveLength(2);
    });

    it('should filter plans by type', () => {
      const { result } = renderHook(
        () => {
          const context = usePlanContext();
          const workoutPlans = usePlansByType('workout');
          return { context, workoutPlans };
        },
        { wrapper: TestWrapper }
      );

      // Add plans
      act(() => {
        const mockOnPlansLoaded = (planService.on as any).mock.calls.find(
          (call: any) => call[0] === 'plansLoaded'
        )[1];
        mockOnPlansLoaded([mockPlan, mockWorkoutPlan]);
      });

      expect(result.current.workoutPlans).toHaveLength(1);
      expect(result.current.workoutPlans[0].structuredData.type).toBe('workout');
    });
  });

  describe('online/offline handling', () => {
    it('should update sync status when going online', () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        // Simulate going online
        Object.defineProperty(global.navigator, 'onLine', { value: true, writable: true });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.state.syncStatus.isOnline).toBe(true);
    });

    it('should update sync status when going offline', () => {
      const { result } = renderHook(() => usePlanContext(), {
        wrapper: TestWrapper,
      });

      act(() => {
        // Simulate going offline
        Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.state.syncStatus.isOnline).toBe(false);
    });
  });
});