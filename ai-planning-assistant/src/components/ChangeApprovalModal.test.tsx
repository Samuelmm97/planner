import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChangeApprovalModal from './ChangeApprovalModal';
import type { Enhancement } from '../types/index.js';

// Mock enhancement data
const mockEnhancement: Enhancement = {
  id: 'enhancement-1',
  planId: 'plan-1',
  type: 'structure',
  changes: [
    {
      operation: 'add',
      target: 'structuredData.items',
      newValue: {
        id: 'item-1',
        text: 'New task',
        type: 'task',
        status: 'pending',
        aiGenerated: true,
        order: 0,
      },
      description: 'Add new task to plan',
      confidence: 0.9,
    },
    {
      operation: 'modify',
      target: 'structuredData.items.0.text',
      oldValue: 'Old task text',
      newValue: 'Updated task text',
      description: 'Update task description',
      confidence: 0.8,
    },
    {
      operation: 'remove',
      target: 'structuredData.items.1',
      oldValue: {
        id: 'item-2',
        text: 'Task to remove',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
        order: 1,
      },
      newValue: null,
      description: 'Remove unnecessary task',
      confidence: 0.7,
    },
  ],
  confidence: 0.8,
  reasoning: 'Plan structure can be improved',
  status: 'pending',
  createdAt: new Date('2024-01-01T10:00:00Z'),
};

describe('ChangeApprovalModal', () => {
  const mockOnClose = vi.fn();
  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();
  const mockOnEdit = vi.fn();

  const defaultProps = {
    isOpen: true,
    enhancement: mockEnhancement,
    onClose: mockOnClose,
    onApprove: mockOnApprove,
    onReject: mockOnReject,
    onEdit: mockOnEdit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders modal when open with enhancement', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      expect(screen.getByText('Review AI Enhancement')).toBeInTheDocument();
      expect(
        screen.getByText('Plan structure can be improved')
      ).toBeInTheDocument();
      expect(screen.getByText('80% confident')).toBeInTheDocument();
      expect(screen.getByText('Proposed Changes (3)')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<ChangeApprovalModal {...defaultProps} isOpen={false} />);

      expect(
        screen.queryByText('Review AI Enhancement')
      ).not.toBeInTheDocument();
    });

    it('does not render when no enhancement provided', () => {
      render(<ChangeApprovalModal {...defaultProps} enhancement={null} />);

      expect(
        screen.queryByText('Review AI Enhancement')
      ).not.toBeInTheDocument();
    });

    it('displays enhancement information correctly', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      expect(screen.getByText('Type:')).toBeInTheDocument();
      expect(screen.getByText('structure')).toBeInTheDocument();
      expect(screen.getByText('Reasoning:')).toBeInTheDocument();
      expect(
        screen.getByText('Plan structure can be improved')
      ).toBeInTheDocument();
      expect(screen.getByText('Overall Confidence:')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('Created:')).toBeInTheDocument();
    });

    it('displays all changes with correct information', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      // Check for operation icons
      expect(screen.getByText('➕')).toBeInTheDocument(); // Add operation
      expect(screen.getByText('✏️')).toBeInTheDocument(); // Modify operation
      expect(screen.getByText('🗑️')).toBeInTheDocument(); // Remove operation

      // Check for change descriptions
      expect(screen.getByText('Add new task to plan')).toBeInTheDocument();
      expect(screen.getByText('Update task description')).toBeInTheDocument();
      expect(screen.getByText('Remove unnecessary task')).toBeInTheDocument();

      // Check for confidence scores
      expect(screen.getByText('90% confident')).toBeInTheDocument();
      expect(screen.getByText('80% confident')).toBeInTheDocument();
      expect(screen.getByText('70% confident')).toBeInTheDocument();
    });

    it('shows all changes selected by default', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });

      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    });
  });

  describe('Change Selection', () => {
    it('allows toggling individual change selection', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');

      // Uncheck first change
      await user.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
      expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();

      // Check it again
      await user.click(checkboxes[0]);
      expect(checkboxes[0]).toBeChecked();
      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    });

    it('handles select all button', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');

      // Uncheck some changes first
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);
      expect(screen.getByText('1 of 3 selected')).toBeInTheDocument();

      // Click select all
      await user.click(screen.getByText('Select All'));
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();
    });

    it('handles select none button', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      // Click select none
      await user.click(screen.getByText('Select None'));

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
      expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
    });
  });

  describe('Change Editing', () => {
    it('allows editing change values', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      // Click edit button for first change
      const editButtons = screen.getAllByTitle('Edit this change');
      await user.click(editButtons[0]);

      // Should show textarea for editing
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();

      // Edit the value
      await user.clear(textarea);
      await user.type(textarea, 'Edited task text');

      // Save the edit
      await user.click(screen.getByText('Save'));

      expect(mockOnEdit).toHaveBeenCalledWith(
        'enhancement-1',
        'enhancement-1-change-0',
        'Edited task text'
      );
    });

    it('allows canceling edit', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      // Click edit button
      const editButtons = screen.getAllByTitle('Edit this change');
      await user.click(editButtons[0]);

      // Edit the value
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Some changes');

      // Cancel the edit
      await user.click(screen.getByText('Cancel'));

      // Should not call onEdit
      expect(mockOnEdit).not.toHaveBeenCalled();

      // Textarea should be gone
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('handles JSON editing for complex values', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      // Click edit button for first change (which has an object value)
      const editButtons = screen.getAllByTitle('Edit this change');
      await user.click(editButtons[0]);

      const textarea = screen.getByRole('textbox');
      const jsonValue =
        '{"id": "item-1", "text": "Edited task", "type": "task"}';

      await user.clear(textarea);
      await user.type(textarea, jsonValue);
      await user.click(screen.getByText('Save'));

      expect(mockOnEdit).toHaveBeenCalledWith(
        'enhancement-1',
        'enhancement-1-change-0',
        { id: 'item-1', text: 'Edited task', type: 'task' }
      );
    });
  });

  describe('Approval Actions', () => {
    it('approves selected changes', async () => {
      const user = userEvent.setup();
      mockOnApprove.mockResolvedValue(undefined);

      render(<ChangeApprovalModal {...defaultProps} />);

      // Unselect one change
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]);

      // Click approve
      await user.click(screen.getByText('Approve Selected (2)'));

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith('enhancement-1', [
          'enhancement-1-change-0',
          'enhancement-1-change-1',
        ]);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('rejects selected changes with feedback', async () => {
      const user = userEvent.setup();
      mockOnReject.mockResolvedValue(undefined);

      render(<ChangeApprovalModal {...defaultProps} />);

      // Add feedback
      const feedbackTextarea = screen.getByPlaceholderText(
        /Why are you rejecting/
      );
      await user.type(feedbackTextarea, 'These changes are not needed');

      // Click reject
      await user.click(screen.getByText('Reject Selected (3)'));

      await waitFor(() => {
        expect(mockOnReject).toHaveBeenCalledWith(
          'enhancement-1',
          [
            'enhancement-1-change-0',
            'enhancement-1-change-1',
            'enhancement-1-change-2',
          ],
          'These changes are not needed'
        );
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('disables action buttons when no changes selected', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      // Unselect all changes
      await user.click(screen.getByText('Select None'));

      const approveButton = screen.getByText('Approve Selected (0)');
      const rejectButton = screen.getByText('Reject Selected (0)');

      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });

    it('shows processing state during approval', async () => {
      const user = userEvent.setup();

      // Mock a delayed response
      mockOnApprove.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<ChangeApprovalModal {...defaultProps} />);

      await user.click(screen.getByText('Approve Selected (3)'));

      // Should show processing state
      expect(screen.getByText('Processing...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('handles approval errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockOnApprove.mockRejectedValue(new Error('Approval failed'));

      render(<ChangeApprovalModal {...defaultProps} />);

      await user.click(screen.getByText('Approve Selected (3)'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to approve changes:',
          expect.any(Error)
        );
      });

      // Modal should still be open
      expect(screen.getByText('Review AI Enhancement')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Modal Interaction', () => {
    it('closes modal when close button clicked', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      await user.click(screen.getByText('✕'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      await user.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when overlay clicked', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      // Click on the overlay (not the modal content)
      const overlay = screen
        .getByText('Review AI Enhancement')
        .closest('.modalOverlay');
      if (overlay) {
        await user.click(overlay);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('does not close modal when modal content clicked', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      // Click on the modal content
      await user.click(screen.getByText('Review AI Enhancement'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Diff Display', () => {
    it('shows old and new values for modify operations', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      // Should show both current and new values for modify operation
      expect(screen.getByText('Current:')).toBeInTheDocument();
      expect(screen.getByText('New:')).toBeInTheDocument();
      expect(screen.getByText('Old task text')).toBeInTheDocument();
      expect(screen.getByText('Updated task text')).toBeInTheDocument();
    });

    it('shows only new value for add operations', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      // For add operations, should show "Adding:" label
      expect(screen.getByText('Adding:')).toBeInTheDocument();
    });

    it('shows removing label for remove operations', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      // For remove operations, should show "Removing:" label
      expect(screen.getByText('Removing:')).toBeInTheDocument();
    });

    it('displays target paths for changes', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      expect(screen.getByText('structuredData.items')).toBeInTheDocument();
      expect(
        screen.getByText('structuredData.items.0.text')
      ).toBeInTheDocument();
      expect(screen.getByText('structuredData.items.1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ChangeApprovalModal {...defaultProps} />);

      // Check for proper form elements
      expect(screen.getByLabelText(/Optional feedback/)).toBeInTheDocument();

      // Check for proper button roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Check for checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ChangeApprovalModal {...defaultProps} />);

      // Tab through interactive elements
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('✕'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getAllByRole('checkbox')[0]);
    });
  });
});
