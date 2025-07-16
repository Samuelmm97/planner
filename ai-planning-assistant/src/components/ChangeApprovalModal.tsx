import React, { useState, useCallback } from 'react';
import type { Enhancement, Change } from '../types/index.js';
import styles from './ChangeApprovalModal.module.css';

export interface ChangeApprovalModalProps {
  isOpen: boolean;
  enhancement: Enhancement | null;
  onClose: () => void;
  onApprove: (enhancementId: string, changeIds?: string[]) => Promise<void>;
  onReject: (
    enhancementId: string,
    changeIds?: string[],
    feedback?: string
  ) => Promise<void>;
  onEdit: (
    enhancementId: string,
    changeId: string,
    newValue: any
  ) => Promise<void>;
}

interface ChangeItemProps {
  change: Change;
  index: number;
  isSelected: boolean;
  onToggleSelect: (index: number) => void;
  onEdit: (newValue: any) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
}

const ChangeItem: React.FC<ChangeItemProps> = ({
  change,
  index,
  isSelected,
  onToggleSelect,
  onEdit,
  isEditing,
  onToggleEdit,
}) => {
  const [editValue, setEditValue] = useState(change.newValue);

  const handleSaveEdit = useCallback(() => {
    onEdit(editValue);
    onToggleEdit();
  }, [editValue, onEdit, onToggleEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditValue(change.newValue);
    onToggleEdit();
  }, [change.newValue, onToggleEdit]);

  const renderValue = (value: any) => {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'add':
        return '➕';
      case 'modify':
        return '✏️';
      case 'remove':
        return '🗑️';
      default:
        return '📝';
    }
  };

  return (
    <div
      className={`${styles.changeItem} ${isSelected ? styles.selected : ''}`}
    >
      <div className={styles.changeHeader}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(index)}
            className={styles.checkbox}
          />
          <span className={styles.operationIcon}>
            {getOperationIcon(change.operation)}
          </span>
          <span className={styles.changeDescription}>{change.description}</span>
        </label>
        <div className={styles.changeActions}>
          {change.confidence && (
            <span className={styles.confidence}>
              {Math.round(change.confidence * 100)}% confident
            </span>
          )}
          <button
            onClick={onToggleEdit}
            className={styles.editButton}
            title="Edit this change"
          >
            {isEditing ? '❌' : '✏️'}
          </button>
        </div>
      </div>

      <div className={styles.changeDetails}>
        <div className={styles.targetPath}>
          <strong>Target:</strong> {change.target}
        </div>

        {change.operation !== 'add' && change.oldValue !== undefined && (
          <div className={styles.diffSection}>
            <div className={styles.oldValue}>
              <strong>Current:</strong>
              <pre className={styles.valueDisplay}>
                {renderValue(change.oldValue)}
              </pre>
            </div>
          </div>
        )}

        <div className={styles.diffSection}>
          <div className={styles.newValue}>
            <strong>
              {change.operation === 'add'
                ? 'Adding:'
                : change.operation === 'remove'
                  ? 'Removing:'
                  : 'New:'}
            </strong>
            {isEditing ? (
              <div className={styles.editSection}>
                <textarea
                  value={
                    typeof editValue === 'string'
                      ? editValue
                      : JSON.stringify(editValue, null, 2)
                  }
                  onChange={(e) => {
                    try {
                      // Try to parse as JSON if it looks like JSON
                      if (
                        e.target.value.trim().startsWith('{') ||
                        e.target.value.trim().startsWith('[')
                      ) {
                        setEditValue(JSON.parse(e.target.value));
                      } else {
                        setEditValue(e.target.value);
                      }
                    } catch {
                      // If JSON parsing fails, treat as string
                      setEditValue(e.target.value);
                    }
                  }}
                  className={styles.editTextarea}
                  rows={4}
                />
                <div className={styles.editActions}>
                  <button
                    onClick={handleSaveEdit}
                    className={styles.saveButton}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <pre className={styles.valueDisplay}>
                {renderValue(change.newValue)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChangeApprovalModal: React.FC<ChangeApprovalModalProps> = ({
  isOpen,
  enhancement,
  onClose,
  onApprove,
  onReject,
  onEdit,
}) => {
  const [selectedChanges, setSelectedChanges] = useState<Set<number>>(
    new Set()
  );
  const [editingChange, setEditingChange] = useState<number | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal opens/closes or enhancement changes
  React.useEffect(() => {
    if (isOpen && enhancement) {
      setSelectedChanges(new Set(enhancement.changes.map((_, index) => index)));
      setEditingChange(null);
      setRejectionFeedback('');
    }
  }, [isOpen, enhancement]);

  const handleToggleSelect = useCallback((index: number) => {
    setSelectedChanges((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!enhancement) return;
    setSelectedChanges(new Set(enhancement.changes.map((_, index) => index)));
  }, [enhancement]);

  const handleSelectNone = useCallback(() => {
    setSelectedChanges(new Set());
  }, []);

  const handleApproveSelected = useCallback(async () => {
    if (!enhancement || selectedChanges.size === 0) return;

    setIsProcessing(true);
    try {
      const changeIds = Array.from(selectedChanges).map(
        (index) => `${enhancement.id}-change-${index}`
      );
      await onApprove(enhancement.id, changeIds);
      onClose();
    } catch (error) {
      console.error('Failed to approve changes:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [enhancement, selectedChanges, onApprove, onClose]);

  const handleRejectSelected = useCallback(async () => {
    if (!enhancement || selectedChanges.size === 0) return;

    setIsProcessing(true);
    try {
      const changeIds = Array.from(selectedChanges).map(
        (index) => `${enhancement.id}-change-${index}`
      );
      await onReject(enhancement.id, changeIds, rejectionFeedback);
      onClose();
    } catch (error) {
      console.error('Failed to reject changes:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [enhancement, selectedChanges, rejectionFeedback, onReject, onClose]);

  const handleEditChange = useCallback(
    async (changeIndex: number, newValue: any) => {
      if (!enhancement) return;

      try {
        const changeId = `${enhancement.id}-change-${changeIndex}`;
        await onEdit(enhancement.id, changeId, newValue);
      } catch (error) {
        console.error('Failed to edit change:', error);
      }
    },
    [enhancement, onEdit]
  );

  if (!isOpen || !enhancement) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Review AI Enhancement</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.enhancementInfo}>
          <div className={styles.enhancementType}>
            <strong>Type:</strong> {enhancement.type}
          </div>
          <div className={styles.enhancementReasoning}>
            <strong>Reasoning:</strong> {enhancement.reasoning}
          </div>
          <div className={styles.enhancementConfidence}>
            <strong>Overall Confidence:</strong>{' '}
            {Math.round(enhancement.confidence * 100)}%
          </div>
          <div className={styles.enhancementDate}>
            <strong>Created:</strong> {enhancement.createdAt.toLocaleString()}
          </div>
        </div>

        <div className={styles.changesSection}>
          <div className={styles.changesHeader}>
            <h3>Proposed Changes ({enhancement.changes.length})</h3>
            <div className={styles.selectionControls}>
              <button onClick={handleSelectAll} className={styles.selectButton}>
                Select All
              </button>
              <button
                onClick={handleSelectNone}
                className={styles.selectButton}
              >
                Select None
              </button>
              <span className={styles.selectedCount}>
                {selectedChanges.size} of {enhancement.changes.length} selected
              </span>
            </div>
          </div>

          <div className={styles.changesList}>
            {enhancement.changes.map((change, index) => (
              <ChangeItem
                key={index}
                change={change}
                index={index}
                isSelected={selectedChanges.has(index)}
                onToggleSelect={handleToggleSelect}
                onEdit={(newValue) => handleEditChange(index, newValue)}
                isEditing={editingChange === index}
                onToggleEdit={() =>
                  setEditingChange(editingChange === index ? null : index)
                }
              />
            ))}
          </div>
        </div>

        <div className={styles.feedbackSection}>
          <label htmlFor="rejectionFeedback" className={styles.feedbackLabel}>
            Optional feedback (helps improve AI suggestions):
          </label>
          <textarea
            id="rejectionFeedback"
            value={rejectionFeedback}
            onChange={(e) => setRejectionFeedback(e.target.value)}
            placeholder="Why are you rejecting these changes? This helps the AI learn..."
            className={styles.feedbackTextarea}
            rows={3}
          />
        </div>

        <div className={styles.modalActions}>
          <button
            onClick={handleApproveSelected}
            disabled={selectedChanges.size === 0 || isProcessing}
            className={styles.approveButton}
          >
            {isProcessing
              ? 'Processing...'
              : `Approve Selected (${selectedChanges.size})`}
          </button>
          <button
            onClick={handleRejectSelected}
            disabled={selectedChanges.size === 0 || isProcessing}
            className={styles.rejectButton}
          >
            {isProcessing
              ? 'Processing...'
              : `Reject Selected (${selectedChanges.size})`}
          </button>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeApprovalModal;
