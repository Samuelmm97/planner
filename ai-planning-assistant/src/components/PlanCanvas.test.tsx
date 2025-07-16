/**
 * Tests for PlanCanvas component
 * Testing masonry layout, in-place editing, drag-and-drop, filtering, and search
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import PlanCanvas from './PlanCanvas';
import { PlanContextProvider } from '../hooks/usePlanContext';
import type { Plan } from '../types/index.js';

// Mock the usePlans hook
const mockUsePlans = {
  plans: [],
  loading: false,
  error: null,
  updatePlan: vi.fn(),
  deletePlan: vi.fn(),
  addTextItem: vi.fn(),
  updatePlanItem: vi.fn(),
  removePlanItem: vi.fn(),
  toggleItemCompletion: vi.fn(),
  updateItemText: vi.fn(),
  getCompletionPercentage: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../hooks/usePlans', () => ({
  usePlans: () => mockUsePlans,
}));

// Mock data
const mockPlans: Plan[] = [
  {
    id: 'plan-1',
    userId: 'user-1',
    title: 'Morning Routine',
    content: {
      originalText: 'Wake up early, exercise, and have breakfast',
    },
    structuredData: {
      type: 'routine',
      items: [
        {
          id: 'item-1',
          text: 'Wake up at 6 AM',
          type: 'task',
          status: 'completed',
          aiGenerated: false,
          order: 1,
        },
        {
          id: 'item-2',
          text: 'Exercise for 30 minutes',
          type: 'task',
          status: 'pending',
          aiGenerated: false,
          order: 2,
        },
      ],
      tags: ['morning', 'health'],
    },
    metadata: {
      source: 'user_input',
      language: 'en',
      complexity: 'simple',
    },
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'plan-2',
    userId: 'user-1',
    title: 'Meal Prep Sunday',
    content: {
      originalText: 'Prepare meals for the week',
    },
    structuredData: {
      type: 'meal',
      items: [
        {
          id: 'item-3',
          text: 'Buy groceries',
          type: 'task',
          status: 'completed',
          aiGenerated: false,
          order: 1,
        },
        {
          id: 'item-4',
          text: 'Cook chicken and rice',
          type: 'task',
          status: 'completed',
          aiGenerated: false,
          order: 2,
        },
      ],
      tags: ['meal', 'prep'],
    },
    metadata: {
      source: 'user_input',
      language: 'en',
      complexity: 'moderate',
    },
    version: 1,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'plan-3',
    userId: 'user-1',
    title: 'Workout Plan',
    content: {
      originalText: 'Weekly workout schedule',
    },
    structuredData: {
      type: 'workout',
      items: [],
      tags: ['fitness', 'health'],
    },
    metadata: {
      source: 'user_input',
      language: 'en',
      complexity: 'simple',
    },
    version: 1,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
];

describe('PlanCanvas', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePlans.plans = [...mockPlans];
    mockUsePlans.loading = false;
    mockUsePlans.error = null;
    mockUsePlans.getCompletionPercentage.mockImplementation((planId: string) => {
      const plan = mockPlans.find(p => p.id === planId);
      if (!plan) return 0;
      const completed = plan.structuredData.items.filter(item => item.status === 'completed').length;
      const total = plan.structuredData.items.length;
      return total === 0 ? 0 : Math.round((completed / total) * 100);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPlanCanvas = (props = {}) => {
    return render(
      <PlanContextProvider>
        <PlanCanvas userId="user-1" {...props} />
      </PlanContextProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      renderPlanCanvas();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('displays loading state when loading', () => {
      mockUsePlans.loading = true;
      mockUsePlans.plans = [];
      renderPlanCanvas();
      expect(screen.getByText('Loading plans...')).toBeInTheDocument();
    });

    it('displays error message when there is an error', () => {
      mockUsePlans.error = 'Failed to load plans';
      renderPlanCanvas();
      expect(screen.getByText(/Error: Failed to load plans/)).toBeInTheDocument();
    });

    it('displays empty state when no plans exist', () => {
      mockUsePlans.plans = [];
      renderPlanCanvas();
      expect(screen.getByText(/No plans yet/)).toBeInTheDocument();
    });

    it('renders all plans in a grid layout', () => {
      renderPlanCanvas();
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
      expect(screen.getByText('Meal Prep Sunday')).toBeInTheDocument();
      expect(screen.getByText('Workout Plan')).toBeInTheDocument();
    });
  });

  describe('Plan Display', () => {
    it('displays plan titles, content, and metadata', () => {
      renderPlanCanvas();
      
      // Check plan titles
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
      expect(screen.getByText('Meal Prep Sunday')).toBeInTheDocument();
      
      // Check plan content
      expect(screen.getByText('Wake up early, exercise, and have breakfast')).toBeInTheDocument();
      expect(screen.getByText('Prepare meals for the week')).toBeInTheDocument();
      
      // Check plan types
      expect(screen.getByText('routine')).toBeInTheDocument();
      expect(screen.getByText('meal')).toBeInTheDocument();
    });

    it('displays completion percentages correctly', () => {
      renderPlanCanvas();
      expect(screen.getByText('50% complete')).toBeInTheDocument(); // Morning Routine: 1/2 completed
      expect(screen.getByText('100% complete')).toBeInTheDocument(); // Meal Prep: 2/2 completed
      expect(screen.getByText('0% complete')).toBeInTheDocument(); // Workout: 0/0 completed
    });

    it('displays plan items with correct status', () => {
      renderPlanCanvas();
      
      const morningRoutineCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      expect(morningRoutineCard).toBeInTheDocument();
      
      if (morningRoutineCard) {
        expect(within(morningRoutineCard).getByText('Wake up at 6 AM')).toBeInTheDocument();
        expect(within(morningRoutineCard).getByText('Exercise for 30 minutes')).toBeInTheDocument();
        
        // Check checkboxes
        const checkboxes = within(morningRoutineCard).getAllByRole('checkbox');
        expect(checkboxes[0]).toBeChecked(); // Wake up at 6 AM is completed
        expect(checkboxes[1]).not.toBeChecked(); // Exercise is pending
      }
    });

    it('displays plan tags', () => {
      renderPlanCanvas();
      expect(screen.getByText('morning')).toBeInTheDocument();
      expect(screen.getByText('health')).toBeInTheDocument();
      expect(screen.getByText('meal')).toBeInTheDocument();
      expect(screen.getByText('prep')).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('filters plans by type', async () => {
      renderPlanCanvas();
      
      const typeSelect = screen.getByLabelText('Type:');
      await user.selectOptions(typeSelect, 'routine');
      
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
      expect(screen.queryByText('Meal Prep Sunday')).not.toBeInTheDocument();
      expect(screen.queryByText('Workout Plan')).not.toBeInTheDocument();
    });

    it('filters plans by completion status', async () => {
      renderPlanCanvas();
      
      const statusSelect = screen.getByLabelText('Status:');
      await user.selectOptions(statusSelect, 'completed');
      
      expect(screen.queryByText('Morning Routine')).not.toBeInTheDocument(); // 50% complete
      expect(screen.getByText('Meal Prep Sunday')).toBeInTheDocument(); // 100% complete
      expect(screen.queryByText('Workout Plan')).not.toBeInTheDocument(); // 0% complete
    });

    it('searches plans by text content', async () => {
      renderPlanCanvas();
      
      const searchInput = screen.getByLabelText('Search:');
      await user.type(searchInput, 'exercise');
      
      expect(screen.getByText('Morning Routine')).toBeInTheDocument(); // Contains "exercise"
      expect(screen.queryByText('Meal Prep Sunday')).not.toBeInTheDocument();
      expect(screen.queryByText('Workout Plan')).not.toBeInTheDocument();
    });

    it('filters plans by tags', async () => {
      renderPlanCanvas();
      
      const healthTagCheckbox = screen.getByLabelText('health');
      await user.click(healthTagCheckbox);
      
      expect(screen.getByText('Morning Routine')).toBeInTheDocument(); // Has "health" tag
      expect(screen.queryByText('Meal Prep Sunday')).not.toBeInTheDocument();
      expect(screen.getByText('Workout Plan')).toBeInTheDocument(); // Has "health" tag
    });

    it('shows empty state when no plans match filters', async () => {
      renderPlanCanvas();
      
      const searchInput = screen.getByLabelText('Search:');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText(/No plans match your current filters/)).toBeInTheDocument();
    });
  });

  describe('In-Place Editing', () => {
    it('allows editing plan titles', async () => {
      renderPlanCanvas();
      
      const planTitle = screen.getByText('Morning Routine');
      await user.click(planTitle);
      
      const titleInput = screen.getByDisplayValue('Morning Routine');
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).toHaveFocus();
      
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Morning Routine');
      await user.keyboard('{Enter}');
      
      expect(mockUsePlans.updatePlan).toHaveBeenCalledWith('plan-1', {
        title: 'Updated Morning Routine',
      });
    });

    it('allows editing item text', async () => {
      renderPlanCanvas();
      
      const itemText = screen.getByText('Wake up at 6 AM');
      await user.click(itemText);
      
      const itemInput = screen.getByDisplayValue('Wake up at 6 AM');
      expect(itemInput).toBeInTheDocument();
      expect(itemInput).toHaveFocus();
      
      await user.clear(itemInput);
      await user.type(itemInput, 'Wake up at 5:30 AM');
      await user.keyboard('{Enter}');
      
      expect(mockUsePlans.updateItemText).toHaveBeenCalledWith('plan-1', 'item-1', 'Wake up at 5:30 AM');
    });

    it('cancels editing on Escape key', async () => {
      renderPlanCanvas();
      
      const planTitle = screen.getByText('Morning Routine');
      await user.click(planTitle);
      
      const titleInput = screen.getByDisplayValue('Morning Routine');
      await user.clear(titleInput);
      await user.type(titleInput, 'Changed Title');
      await user.keyboard('{Escape}');
      
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
      expect(mockUsePlans.updatePlan).not.toHaveBeenCalled();
    });
  });

  describe('Item Management', () => {
    it('toggles item completion status', async () => {
      renderPlanCanvas();
      
      const morningRoutineCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      if (morningRoutineCard) {
        const checkboxes = within(morningRoutineCard).getAllByRole('checkbox');
        const pendingItemCheckbox = checkboxes[1]; // Exercise item
        
        await user.click(pendingItemCheckbox);
        
        expect(mockUsePlans.toggleItemCompletion).toHaveBeenCalledWith('plan-1', 'item-2');
      }
    });

    it('adds new items to a plan', async () => {
      renderPlanCanvas();
      
      const morningRoutineCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      if (morningRoutineCard) {
        const addButton = within(morningRoutineCard).getByText('+ Add Item');
        await user.click(addButton);
        
        const addInput = within(morningRoutineCard).getByPlaceholderText('New item...');
        await user.type(addInput, 'Drink water');
        await user.keyboard('{Enter}');
        
        expect(mockUsePlans.addTextItem).toHaveBeenCalledWith('plan-1', 'Drink water');
      }
    });

    it('removes items from a plan', async () => {
      renderPlanCanvas();
      
      const morningRoutineCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      if (morningRoutineCard) {
        const removeButtons = within(morningRoutineCard).getAllByTitle('Remove item');
        await user.click(removeButtons[0]);
        
        expect(mockUsePlans.removePlanItem).toHaveBeenCalledWith('plan-1', 'item-1');
      }
    });

    it('cancels adding item on Escape key', async () => {
      renderPlanCanvas();
      
      const morningRoutineCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      if (morningRoutineCard) {
        const addButton = within(morningRoutineCard).getByText('+ Add Item');
        await user.click(addButton);
        
        const addInput = within(morningRoutineCard).getByPlaceholderText('New item...');
        await user.type(addInput, 'New item');
        await user.keyboard('{Escape}');
        
        expect(within(morningRoutineCard).getByText('+ Add Item')).toBeInTheDocument();
        expect(mockUsePlans.addTextItem).not.toHaveBeenCalled();
      }
    });
  });

  describe('Plan Management', () => {
    it('deletes a plan with confirmation', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      renderPlanCanvas();
      
      const morningRoutineCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      if (morningRoutineCard) {
        const deleteButton = within(morningRoutineCard).getByTitle('Delete plan');
        await user.click(deleteButton);
        
        expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Morning Routine"?');
        expect(mockUsePlans.deletePlan).toHaveBeenCalledWith('plan-1');
      }
      
      confirmSpy.mockRestore();
    });

    it('cancels plan deletion when not confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      renderPlanCanvas();
      
      const morningRoutineCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      if (morningRoutineCard) {
        const deleteButton = within(morningRoutineCard).getByTitle('Delete plan');
        await user.click(deleteButton);
        
        expect(confirmSpy).toHaveBeenCalled();
        expect(mockUsePlans.deletePlan).not.toHaveBeenCalled();
      }
      
      confirmSpy.mockRestore();
    });
  });

  describe('Drag and Drop', () => {
    it('handles drag start event', async () => {
      renderPlanCanvas();
      
      const planCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      if (planCard) {
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        });
        
        fireEvent(planCard, dragStartEvent);
        
        expect(planCard).toHaveClass('dragging');
      }
    });

    it('handles drag over event', async () => {
      renderPlanCanvas();
      
      const sourceCard = screen.getByText('Morning Routine').closest('[class*="planCard"]');
      const targetCard = screen.getByText('Meal Prep Sunday').closest('[class*="planCard"]');
      
      if (sourceCard && targetCard) {
        // Start dragging
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        });
        fireEvent(sourceCard, dragStartEvent);
        
        // Drag over target
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        });
        fireEvent(targetCard, dragOverEvent);
        
        expect(targetCard).toHaveClass('dragOver');
      }
    });
  });

  describe('Error Handling', () => {
    it('displays and clears error messages', async () => {
      mockUsePlans.error = 'Network error';
      renderPlanCanvas();
      
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      
      const clearButton = screen.getByText('×');
      await user.click(clearButton);
      
      expect(mockUsePlans.clearError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation for editing', async () => {
      renderPlanCanvas();
      
      const planTitle = screen.getByText('Morning Routine');
      planTitle.focus();
      await user.keyboard('{Enter}');
      
      const titleInput = screen.getByDisplayValue('Morning Routine');
      expect(titleInput).toHaveFocus();
    });

    it('has proper ARIA labels and roles', () => {
      renderPlanCanvas();
      
      expect(screen.getByLabelText('Type:')).toBeInTheDocument();
      expect(screen.getByLabelText('Status:')).toBeInTheDocument();
      expect(screen.getByLabelText('Search:')).toBeInTheDocument();
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      renderPlanCanvas();
      
      // The component should render without errors on mobile
      expect(screen.getByText('Morning Routine')).toBeInTheDocument();
    });
  });
});