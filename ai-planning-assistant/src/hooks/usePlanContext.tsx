/**
 * Plan Context for global state management
 * Provides centralized plan state with optimistic updates and sync
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { Plan, PlanItem } from '../types/index.js';
import { planService, type CreatePlanInput, type UpdatePlanInput } from '../services/planService.js';

// State interface
export interface PlanState {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  selectedPlanId: string | null;
  syncStatus: {
    isOnline: boolean;
    pendingSync: number;
    lastSync: Date | null;
  };
}

// Action types
export type PlanAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PLANS'; payload: Plan[] }
  | { type: 'ADD_PLAN'; payload: Plan }
  | { type: 'UPDATE_PLAN'; payload: Plan }
  | { type: 'REMOVE_PLAN'; payload: string }
  | { type: 'SELECT_PLAN'; payload: string | null }
  | { type: 'SET_SYNC_STATUS'; payload: Partial<PlanState['syncStatus']> }
  | { type: 'OPTIMISTIC_UPDATE'; payload: { planId: string; updates: Partial<Plan> } }
  | { type: 'REVERT_OPTIMISTIC'; payload: string };

// Context interface
export interface PlanContextValue {
  state: PlanState;
  actions: {
    loadPlans: (userId: string) => Promise<void>;
    createPlan: (input: CreatePlanInput) => Promise<Plan>;
    updatePlan: (input: UpdatePlanInput) => Promise<Plan>;
    deletePlan: (planId: string) => Promise<void>;
    addPlanItem: (planId: string, item: Omit<PlanItem, 'id' | 'order'>) => Promise<Plan>;
    updatePlanItem: (planId: string, itemId: string, updates: Partial<PlanItem>) => Promise<Plan>;
    removePlanItem: (planId: string, itemId: string) => Promise<Plan>;
    selectPlan: (planId: string | null) => void;
    clearError: () => void;
    refreshSyncStatus: () => Promise<void>;
  };
}

// Initial state
const initialState: PlanState = {
  plans: [],
  loading: false,
  error: null,
  selectedPlanId: null,
  syncStatus: {
    isOnline: navigator.onLine,
    pendingSync: 0,
    lastSync: null,
  },
};

// Reducer
function planReducer(state: PlanState, action: PlanAction): PlanState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_PLANS':
      return { ...state, plans: action.payload, loading: false, error: null };

    case 'ADD_PLAN':
      return {
        ...state,
        plans: [action.payload, ...state.plans],
        loading: false,
        error: null,
      };

    case 'UPDATE_PLAN':
      return {
        ...state,
        plans: state.plans.map(plan =>
          plan.id === action.payload.id ? action.payload : plan
        ),
        loading: false,
        error: null,
      };

    case 'REMOVE_PLAN':
      return {
        ...state,
        plans: state.plans.filter(plan => plan.id !== action.payload),
        selectedPlanId: state.selectedPlanId === action.payload ? null : state.selectedPlanId,
        loading: false,
        error: null,
      };

    case 'SELECT_PLAN':
      return { ...state, selectedPlanId: action.payload };

    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: { ...state.syncStatus, ...action.payload },
      };

    case 'OPTIMISTIC_UPDATE':
      return {
        ...state,
        plans: state.plans.map(plan =>
          plan.id === action.payload.planId
            ? { ...plan, ...action.payload.updates }
            : plan
        ),
      };

    case 'REVERT_OPTIMISTIC':
      // In a real app, you'd store the original state to revert to
      // For now, we'll just trigger a reload
      return state;

    default:
      return state;
  }
}

// Create context
const PlanContext = createContext<PlanContextValue | null>(null);

// Provider component
export interface PlanProviderProps {
  children: React.ReactNode;
  userId: string;
}

export function PlanProvider({ children, userId }: PlanProviderProps) {
  const [state, dispatch] = useReducer(planReducer, initialState);

  // Set up event listeners for plan service
  useEffect(() => {
    const handlePlanCreated = (plan: Plan) => {
      dispatch({ type: 'ADD_PLAN', payload: plan });
    };

    const handlePlanUpdated = (plan: Plan) => {
      dispatch({ type: 'UPDATE_PLAN', payload: plan });
    };

    const handlePlanDeleted = (planId: string) => {
      dispatch({ type: 'REMOVE_PLAN', payload: planId });
    };

    const handlePlansLoaded = (plans: Plan[]) => {
      dispatch({ type: 'SET_PLANS', payload: plans });
    };

    const handleError = (error: Error) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    };

    // Subscribe to plan service events
    planService.on('planCreated', handlePlanCreated);
    planService.on('planUpdated', handlePlanUpdated);
    planService.on('planDeleted', handlePlanDeleted);
    planService.on('plansLoaded', handlePlansLoaded);
    planService.on('error', handleError);

    return () => {
      // Cleanup event listeners
      planService.off('planCreated');
      planService.off('planUpdated');
      planService.off('planDeleted');
      planService.off('plansLoaded');
      planService.off('error');
    };
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      dispatch({
        type: 'SET_SYNC_STATUS',
        payload: { isOnline: true, lastSync: new Date() },
      });
    };

    const handleOffline = () => {
      dispatch({
        type: 'SET_SYNC_STATUS',
        payload: { isOnline: false },
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load plans on mount
  useEffect(() => {
    if (userId) {
      loadPlans(userId);
    }
  }, [userId]);

  // Actions
  const loadPlans = useCallback(async (userId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await planService.loadPlans(userId);
      // Plans will be set via the event listener
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load plans',
      });
    }
  }, []);

  const createPlan = useCallback(async (input: CreatePlanInput): Promise<Plan> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const plan = await planService.createPlan(input);
      // Plan will be added via the event listener
      return plan;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to create plan',
      });
      throw error;
    }
  }, []);

  const updatePlan = useCallback(async (input: UpdatePlanInput): Promise<Plan> => {
    // Optimistic update
    const optimisticUpdates: Partial<Plan> = {
      ...input,
      updatedAt: new Date(),
    };
    dispatch({
      type: 'OPTIMISTIC_UPDATE',
      payload: { planId: input.id, updates: optimisticUpdates },
    });

    try {
      const plan = await planService.updatePlan(input);
      // Plan will be updated via the event listener
      return plan;
    } catch (error) {
      // Revert optimistic update
      dispatch({ type: 'REVERT_OPTIMISTIC', payload: input.id });
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update plan',
      });
      throw error;
    }
  }, []);

  const deletePlan = useCallback(async (planId: string): Promise<void> => {
    // Optimistic removal
    const originalPlans = state.plans;
    dispatch({ type: 'REMOVE_PLAN', payload: planId });

    try {
      await planService.deletePlan(planId);
      // Plan will be removed via the event listener
    } catch (error) {
      // Revert optimistic removal
      dispatch({ type: 'SET_PLANS', payload: originalPlans });
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to delete plan',
      });
      throw error;
    }
  }, [state.plans]);

  const addPlanItem = useCallback(async (
    planId: string,
    item: Omit<PlanItem, 'id' | 'order'>
  ): Promise<Plan> => {
    try {
      const plan = await planService.addPlanItem(planId, item);
      // Plan will be updated via the event listener
      return plan;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to add plan item',
      });
      throw error;
    }
  }, []);

  const updatePlanItem = useCallback(async (
    planId: string,
    itemId: string,
    updates: Partial<PlanItem>
  ): Promise<Plan> => {
    try {
      const plan = await planService.updatePlanItem(planId, itemId, updates);
      // Plan will be updated via the event listener
      return plan;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update plan item',
      });
      throw error;
    }
  }, []);

  const removePlanItem = useCallback(async (planId: string, itemId: string): Promise<Plan> => {
    try {
      const plan = await planService.removePlanItem(planId, itemId);
      // Plan will be updated via the event listener
      return plan;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to remove plan item',
      });
      throw error;
    }
  }, []);

  const selectPlan = useCallback((planId: string | null) => {
    dispatch({ type: 'SELECT_PLAN', payload: planId });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const refreshSyncStatus = useCallback(async () => {
    try {
      const syncStatus = await planService.getSyncQueueStatus();
      dispatch({
        type: 'SET_SYNC_STATUS',
        payload: { pendingSync: syncStatus.pending },
      });
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    }
  }, []);

  const contextValue: PlanContextValue = {
    state,
    actions: {
      loadPlans,
      createPlan,
      updatePlan,
      deletePlan,
      addPlanItem,
      updatePlanItem,
      removePlanItem,
      selectPlan,
      clearError,
      refreshSyncStatus,
    },
  };

  return (
    <PlanContext.Provider value={contextValue}>
      {children}
    </PlanContext.Provider>
  );
}

// Hook to use plan context
export function usePlanContext(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlanContext must be used within a PlanProvider');
  }
  return context;
}

// Hook to get selected plan
export function useSelectedPlan(): Plan | null {
  const { state } = usePlanContext();
  return state.plans.find(plan => plan.id === state.selectedPlanId) || null;
}

// Hook to get plans by type
export function usePlansByType(type?: string): Plan[] {
  const { state } = usePlanContext();
  if (!type) return state.plans;
  return state.plans.filter(plan => plan.structuredData.type === type);
}