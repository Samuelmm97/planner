import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import PlansPage from './PlansPage';
import { PlanProvider } from '../hooks/usePlanContext';

// Mock plan service
vi.mock('../services/planService.js', () => ({
  planService: {
    on: vi.fn(),
    off: vi.fn(),
    loadPlans: vi.fn().mockResolvedValue([]),
    createPlan: vi.fn(),
    updatePlan: vi.fn(),
    deletePlan: vi.fn(),
    addPlanItem: vi.fn(),
    updatePlanItem: vi.fn(),
    removePlanItem: vi.fn(),
    getSyncQueueStatus: vi.fn().mockResolvedValue({ pending: 0, items: [] }),
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PlanProvider userId="test-user">{children}</PlanProvider>
);

describe('PlansPage', () => {
  it('renders plan storage demo', () => {
    render(<PlansPage />, { wrapper: TestWrapper });
    
    expect(screen.getByText('Plan Storage & State Management Demo')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
  });

  it('shows plan creation form', () => {
    render(<PlansPage />, { wrapper: TestWrapper });
    
    expect(screen.getByText('Create New Plan')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Plan title...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Plan content...')).toBeInTheDocument();
  });
});