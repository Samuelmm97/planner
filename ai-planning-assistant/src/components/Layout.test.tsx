import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Layout from './Layout';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Layout', () => {
  it('renders header and main content area', () => {
    renderWithRouter(<Layout />);

    // Check if header is rendered (brand link should be present)
    expect(screen.getByText('AI Planning Assistant')).toBeInTheDocument();
    
    // Check if navigation links are present
    expect(screen.getByText('Plans')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    const { container } = renderWithRouter(<Layout />);
    
    // Check for semantic HTML elements
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(container.querySelector('nav')).toBeInTheDocument();
  });
});