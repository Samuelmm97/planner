/**
 * Simplified hook for plan operations
 * Provides easy-to-use functions for common plan operations
 */

import { useCallback } from 'react';
import { usePlanContext } from './usePlanContext.js';
import type { Plan, PlanItem, NaturalLanguageContent } from '../types/index.js';

export interface CreatePlanOptions {
  title: string;
  content: string | NaturalLanguageContent;
  type?: 'routine' | 'meal' | 'workout' | 'schedule' | 'custom';
  tags?: string[];
}

export interface UpdatePlanOptions {
  title?: string;
  content?: string | NaturalLanguageContent;
  tags?: string[];
}

export function usePlans(userId: string) {
  const { state, actions } = usePlanContext();

  // Create a plan with simplified options
  const createPlan = useCallback(async (options: CreatePlanOptions): Promise<Plan> => {
    const content: NaturalLanguageContent = typeof options.content === 'string'
      ? { originalText: options.content }
      : options.content;

    return actions.createPlan({
      title: options.title,
      content,
      userId,
      structuredData: {
        type: options.type || 'custom',
        tags: options.tags || [],
        items: [],
      },
    });
  }, [actions, userId]);

  // Update a plan with simplified options
  const updatePlan = useCallback(async (planId: string, options: UpdatePlanOptions): Promise<Plan> => {
    const updates: any = { id: planId };
    
    if (options.title) {
      updates.title = options.title;
    }
    
    if (options.content) {
      updates.content = typeof options.content === 'string'
        ? { originalText: options.content }
        : options.content;
    }
    
    if (options.tags) {
      updates.structuredData = { tags: options.tags };
    }

    return actions.updatePlan(updates);
  }, [actions]);

  // Add a simple text item to a plan
  const addTextItem = useCallback(async (planId: string, text: string): Promise<Plan> => {
    return actions.addPlanItem(planId, {
      text,
      type: 'task',
      status: 'pending',
      aiGenerated: false,
    });
  }, [actions]);

  // Mark an item as completed
  const completeItem = useCallback(async (planId: string, itemId: string): Promise<Plan> => {
    return actions.updatePlanItem(planId, itemId, { status: 'completed' });
  }, [actions]);

  // Mark an item as pending
  const uncompleteItem = useCallback(async (planId: string, itemId: string): Promise<Plan> => {
    return actions.updatePlanItem(planId, itemId, { status: 'pending' });
  }, [actions]);

  // Toggle item completion
  const toggleItemCompletion = useCallback(async (planId: string, itemId: string): Promise<Plan> => {
    const plan = state.plans.find(p => p.id === planId);
    const item = plan?.structuredData.items.find(i => i.id === itemId);
    
    if (!item) {
      throw new Error('Item not found');
    }

    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    return actions.updatePlanItem(planId, itemId, { status: newStatus });
  }, [actions, state.plans]);

  // Update item text
  const updateItemText = useCallback(async (planId: string, itemId: string, text: string): Promise<Plan> => {
    return actions.updatePlanItem(planId, itemId, { text });
  }, [actions]);

  // Get plan by ID
  const getPlan = useCallback((planId: string): Plan | undefined => {
    return state.plans.find(plan => plan.id === planId);
  }, [state.plans]);

  // Get plans by tag
  const getPlansByTag = useCallback((tag: string): Plan[] => {
    return state.plans.filter(plan => 
      plan.structuredData.tags.includes(tag)
    );
  }, [state.plans]);

  // Get completed items count for a plan
  const getCompletedItemsCount = useCallback((planId: string): number => {
    const plan = getPlan(planId);
    if (!plan) return 0;
    return plan.structuredData.items.filter(item => item.status === 'completed').length;
  }, [getPlan]);

  // Get total items count for a plan
  const getTotalItemsCount = useCallback((planId: string): number => {
    const plan = getPlan(planId);
    if (!plan) return 0;
    return plan.structuredData.items.length;
  }, [getPlan]);

  // Get completion percentage for a plan
  const getCompletionPercentage = useCallback((planId: string): number => {
    const total = getTotalItemsCount(planId);
    if (total === 0) return 0;
    const completed = getCompletedItemsCount(planId);
    return Math.round((completed / total) * 100);
  }, [getCompletedItemsCount, getTotalItemsCount]);

  // Search plans by text
  const searchPlans = useCallback((query: string): Plan[] => {
    const lowercaseQuery = query.toLowerCase();
    return state.plans.filter(plan => 
      plan.title.toLowerCase().includes(lowercaseQuery) ||
      plan.content.originalText.toLowerCase().includes(lowercaseQuery) ||
      plan.structuredData.items.some(item => 
        item.text.toLowerCase().includes(lowercaseQuery)
      )
    );
  }, [state.plans]);

  return {
    // State
    plans: state.plans,
    loading: state.loading,
    error: state.error,
    selectedPlanId: state.selectedPlanId,
    syncStatus: state.syncStatus,

    // Basic CRUD operations
    createPlan,
    updatePlan,
    deletePlan: actions.deletePlan,
    selectPlan: actions.selectPlan,

    // Item operations
    addTextItem,
    addPlanItem: actions.addPlanItem,
    updatePlanItem: actions.updatePlanItem,
    removePlanItem: actions.removePlanItem,
    completeItem,
    uncompleteItem,
    toggleItemCompletion,
    updateItemText,

    // Utility functions
    getPlan,
    getPlansByTag,
    getCompletedItemsCount,
    getTotalItemsCount,
    getCompletionPercentage,
    searchPlans,

    // Actions
    clearError: actions.clearError,
    refreshSyncStatus: actions.refreshSyncStatus,
    loadPlans: () => actions.loadPlans(userId),
  };
}