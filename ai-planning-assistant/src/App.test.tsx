import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock plan service
vi.mock('./services/planService.js', () => ({
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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('App', () => {
  it('renders without crashing', () => {
    renderWithRouter(<App />);
    expect(screen.getByText('AI Planning Assistant')).toBeInTheDocument();
  });

  it('renders the plans page by default', () => {
    renderWithRouter(<App />);
    expect(screen.getByText('Plan Storage & State Management Demo')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
  });
});
