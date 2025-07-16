/**
 * PlanCanvas component for displaying and managing multiple plans
 * Features: masonry layout, in-place editing, drag-and-drop, filtering, search
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { usePlans } from '../hooks/usePlans';
import type { Plan, PlanItem, PlanType } from '../types/index.js';
import styles from './PlanCanvas.module.css';

interface PlanCanvasProps {
  userId: string;
  className?: string;
}

interface FilterOptions {
  type?: PlanType | 'all';
  status?: 'all' | 'active' | 'completed';
  tags?: string[];
  searchQuery?: string;
}

interface DragState {
  isDragging: boolean;
  draggedPlanId: string | null;
  dragOverPlanId: string | null;
  dragStartPosition: { x: number; y: number } | null;
}

const PlanCanvas: React.FC<PlanCanvasProps> = ({ userId, className }) => {
  const {
    plans,
    loading,
    error,
    updatePlan,
    deletePlan,
    addTextItem,
    updatePlanItem,
    removePlanItem,
    toggleItemCompletion,
    updateItemText,
    getCompletionPercentage,
    clearError,
  } = usePlans(userId);

  // State for filtering and search
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    status: 'all',
    tags: [],
    searchQuery: '',
  });

  // State for drag and drop
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedPlanId: null,
    dragOverPlanId: null,
    dragStartPosition: null,
  });

  // State for in-place editing
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ planId: string; itemId: string } | null>(null);
  const [editValues, setEditValues] = useState<{ title?: string; itemText?: string }>({});

  // Refs for managing focus and scroll
  const canvasRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPlan, editingItem]);

  // Filter and search plans
  const filteredPlans = useMemo(() => {
    let filtered = [...plans];

    // Filter by type
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(plan => plan.structuredData.type === filters.type);
    }

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(plan => {
        const completionPercentage = getCompletionPercentage(plan.id);
        if (filters.status === 'completed') {
          return completionPercentage === 100;
        } else if (filters.status === 'active') {
          return completionPercentage < 100;
        }
        return true;
      });
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(plan =>
        filters.tags!.some(tag => plan.structuredData.tags.includes(tag))
      );
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.title.toLowerCase().includes(query) ||
        plan.content.originalText.toLowerCase().includes(query) ||
        plan.structuredData.items.some(item =>
          item.text.toLowerCase().includes(query)
        )
      );
    }

    return filtered;
  }, [plans, filters, getCompletionPercentage]);

  // Get all unique tags from plans
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    plans.forEach(plan => {
      plan.structuredData.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [plans]);

  // Handle plan title editing
  const handleStartEditingPlan = useCallback((planId: string, currentTitle: string) => {
    setEditingPlan(planId);
    setEditValues({ title: currentTitle });
  }, []);

  const handleSavePlanTitle = useCallback(async (planId: string) => {
    if (!editValues.title?.trim()) return;
    
    try {
      await updatePlan(planId, { title: editValues.title.trim() });
      setEditingPlan(null);
      setEditValues({});
    } catch (error) {
      console.error('Failed to update plan title:', error);
    }
  }, [updatePlan, editValues.title]);

  const handleCancelPlanEdit = useCallback(() => {
    setEditingPlan(null);
    setEditValues({});
  }, []);

  // Handle item text editing
  const handleStartEditingItem = useCallback((planId: string, itemId: string, currentText: string) => {
    setEditingItem({ planId, itemId });
    setEditValues({ itemText: currentText });
  }, []);

  const handleSaveItemText = useCallback(async (planId: string, itemId: string) => {
    if (!editValues.itemText?.trim()) return;
    
    try {
      await updateItemText(planId, itemId, editValues.itemText.trim());
      setEditingItem(null);
      setEditValues({});
    } catch (error) {
      console.error('Failed to update item text:', error);
    }
  }, [updateItemText, editValues.itemText]);

  const handleCancelItemEdit = useCallback(() => {
    setEditingItem(null);
    setEditValues({});
  }, []);

  // Handle drag and drop
  const handleDragStart = useCallback((e: React.DragEvent, planId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({
      isDragging: true,
      draggedPlanId: planId,
      dragOverPlanId: null,
      dragStartPosition: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
    });
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', planId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, planId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (dragState.draggedPlanId !== planId) {
      setDragState(prev => ({ ...prev, dragOverPlanId: planId }));
    }
  }, [dragState.draggedPlanId]);

  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({ ...prev, dragOverPlanId: null }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetPlanId: string) => {
    e.preventDefault();
    const draggedPlanId = e.dataTransfer.getData('text/plain');
    
    if (draggedPlanId && draggedPlanId !== targetPlanId) {
      // Here you would implement plan reordering logic
      // For now, we'll just log the action
      console.log(`Reorder plan ${draggedPlanId} to position of ${targetPlanId}`);
    }
    
    setDragState({
      isDragging: false,
      draggedPlanId: null,
      dragOverPlanId: null,
      dragStartPosition: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedPlanId: null,
      dragOverPlanId: null,
      dragStartPosition: null,
    });
  }, []);

  // Handle adding new items
  const handleAddItem = useCallback(async (planId: string, text: string) => {
    if (!text.trim()) return;
    
    try {
      await addTextItem(planId, text.trim());
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }, [addTextItem]);

  // Handle removing items
  const handleRemoveItem = useCallback(async (planId: string, itemId: string) => {
    try {
      await removePlanItem(planId, itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  }, [removePlanItem]);

  // Handle keyboard events for editing
  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (editingPlan) handleCancelPlanEdit();
      if (editingItem) handleCancelItemEdit();
    }
  }, [editingPlan, editingItem, handleCancelPlanEdit, handleCancelItemEdit]);

  if (loading && plans.length === 0) {
    return (
      <div className={`${styles.canvas} ${className || ''}`}>
        <div className={styles.loading}>Loading plans...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.canvas} ${className || ''}`} ref={canvasRef}>
      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <span>Error: {error}</span>
          <button onClick={clearError} className={styles.errorClose}>
            ×
          </button>
        </div>
      )}

      {/* Filter Controls */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label>Type:</label>
          <select
            value={filters.type || 'all'}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              type: e.target.value === 'all' ? 'all' : e.target.value as PlanType 
            }))}
          >
            <option value="all">All Types</option>
            <option value="routine">Routine</option>
            <option value="meal">Meal</option>
            <option value="workout">Workout</option>
            <option value="schedule">Schedule</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Status:</label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => setFilters(prev => ({ 
              ...prev, 
              status: e.target.value as 'all' | 'active' | 'completed'
            }))}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search plans..."
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            className={styles.searchInput}
          />
        </div>

        {availableTags.length > 0 && (
          <div className={styles.filterGroup}>
            <label>Tags:</label>
            <div className={styles.tagFilters}>
              {availableTags.map(tag => (
                <label key={tag} className={styles.tagFilter}>
                  <input
                    type="checkbox"
                    checked={filters.tags?.includes(tag) || false}
                    onChange={(e) => {
                      const newTags = e.target.checked
                        ? [...(filters.tags || []), tag]
                        : (filters.tags || []).filter(t => t !== tag);
                      setFilters(prev => ({ ...prev, tags: newTags }));
                    }}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className={styles.plansGrid}>
        {filteredPlans.length === 0 ? (
          <div className={styles.emptyState}>
            {filters.searchQuery || filters.type !== 'all' || (filters.tags && filters.tags.length > 0) ? (
              <p>No plans match your current filters.</p>
            ) : (
              <p>No plans yet. Create your first plan to get started!</p>
            )}
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isEditing={editingPlan === plan.id}
              editingItem={editingItem?.planId === plan.id ? editingItem.itemId : null}
              editValues={editValues}
              isDragging={dragState.draggedPlanId === plan.id}
              isDragOver={dragState.dragOverPlanId === plan.id}
              completionPercentage={getCompletionPercentage(plan.id)}
              onStartEditingPlan={handleStartEditingPlan}
              onSavePlanTitle={handleSavePlanTitle}
              onCancelPlanEdit={handleCancelPlanEdit}
              onStartEditingItem={handleStartEditingItem}
              onSaveItemText={handleSaveItemText}
              onCancelItemEdit={handleCancelItemEdit}
              onEditValueChange={setEditValues}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onToggleItemCompletion={toggleItemCompletion}
              onDeletePlan={deletePlan}
              onKeyDown={handleKeyDown}
              editInputRef={editInputRef}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Separate PlanCard component for better organization
interface PlanCardProps {
  plan: Plan;
  isEditing: boolean;
  editingItem: string | null;
  editValues: { title?: string; itemText?: string };
  isDragging: boolean;
  isDragOver: boolean;
  completionPercentage: number;
  onStartEditingPlan: (planId: string, currentTitle: string) => void;
  onSavePlanTitle: (planId: string) => void;
  onCancelPlanEdit: () => void;
  onStartEditingItem: (planId: string, itemId: string, currentText: string) => void;
  onSaveItemText: (planId: string, itemId: string) => void;
  onCancelItemEdit: () => void;
  onEditValueChange: React.Dispatch<React.SetStateAction<{ title?: string; itemText?: string }>>;
  onDragStart: (e: React.DragEvent, planId: string) => void;
  onDragOver: (e: React.DragEvent, planId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, planId: string) => void;
  onDragEnd: () => void;
  onAddItem: (planId: string, text: string) => void;
  onRemoveItem: (planId: string, itemId: string) => void;
  onToggleItemCompletion: (planId: string, itemId: string) => void;
  onDeletePlan: (planId: string) => void;
  onKeyDown: (e: React.KeyboardEvent, action: () => void) => void;
  editInputRef: React.RefObject<HTMLInputElement>;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isEditing,
  editingItem,
  editValues,
  isDragging,
  isDragOver,
  completionPercentage,
  onStartEditingPlan,
  onSavePlanTitle,
  onCancelPlanEdit,
  onStartEditingItem,
  onSaveItemText,
  onCancelItemEdit,
  onEditValueChange,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onAddItem,
  onRemoveItem,
  onToggleItemCompletion,
  onDeletePlan,
  onKeyDown,
  editInputRef,
}) => {
  const [newItemText, setNewItemText] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);

  const handleAddItemSubmit = () => {
    if (newItemText.trim()) {
      onAddItem(plan.id, newItemText.trim());
      setNewItemText('');
      setShowAddItem(false);
    }
  };

  const handleDeletePlan = () => {
    if (confirm(`Are you sure you want to delete "${plan.title}"?`)) {
      onDeletePlan(plan.id);
    }
  };

  return (
    <div
      className={`${styles.planCard} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, plan.id)}
      onDragOver={(e) => onDragOver(e, plan.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, plan.id)}
      onDragEnd={onDragEnd}
    >
      {/* Plan Header */}
      <div className={styles.planHeader}>
        <div className={styles.planTitle}>
          {isEditing ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValues.title || ''}
              onChange={(e) => onEditValueChange(prev => ({ ...prev, title: e.target.value }))}
              onKeyDown={(e) => onKeyDown(e, () => onSavePlanTitle(plan.id))}
              onBlur={() => onSavePlanTitle(plan.id)}
              className={styles.titleInput}
            />
          ) : (
            <h3 onClick={() => onStartEditingPlan(plan.id, plan.title)}>
              {plan.title}
            </h3>
          )}
        </div>
        
        <div className={styles.planActions}>
          <button
            onClick={handleDeletePlan}
            className={styles.deleteButton}
            title="Delete plan"
          >
            ×
          </button>
        </div>
      </div>

      {/* Plan Meta */}
      <div className={styles.planMeta}>
        <span className={`${styles.planType} ${styles[plan.structuredData.type]}`}>
          {plan.structuredData.type}
        </span>
        <span className={styles.completionBadge}>
          {completionPercentage}% complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Plan Content */}
      <div className={styles.planContent}>
        <p>{plan.content.originalText}</p>
      </div>

      {/* Plan Items */}
      <div className={styles.planItems}>
        {plan.structuredData.items
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <div key={item.id} className={styles.planItem}>
              <input
                type="checkbox"
                checked={item.status === 'completed'}
                onChange={() => onToggleItemCompletion(plan.id, item.id)}
                className={styles.itemCheckbox}
              />
              
              <div className={styles.itemContent}>
                {editingItem === item.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editValues.itemText || ''}
                    onChange={(e) => onEditValueChange(prev => ({ ...prev, itemText: e.target.value }))}
                    onKeyDown={(e) => onKeyDown(e, () => onSaveItemText(plan.id, item.id))}
                    onBlur={() => onSaveItemText(plan.id, item.id)}
                    className={styles.itemInput}
                  />
                ) : (
                  <span
                    className={`${styles.itemText} ${item.status === 'completed' ? styles.completed : ''}`}
                    onClick={() => onStartEditingItem(plan.id, item.id, item.text)}
                  >
                    {item.text}
                  </span>
                )}
              </div>

              <button
                onClick={() => onRemoveItem(plan.id, item.id)}
                className={styles.removeItemButton}
                title="Remove item"
              >
                ×
              </button>
            </div>
          ))}
      </div>

      {/* Add Item */}
      <div className={styles.addItemSection}>
        {showAddItem ? (
          <div className={styles.addItemForm}>
            <input
              type="text"
              placeholder="New item..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddItemSubmit();
                } else if (e.key === 'Escape') {
                  setShowAddItem(false);
                  setNewItemText('');
                }
              }}
              className={styles.addItemInput}
              autoFocus
            />
            <div className={styles.addItemActions}>
              <button onClick={handleAddItemSubmit} className={styles.addItemSave}>
                Add
              </button>
              <button 
                onClick={() => {
                  setShowAddItem(false);
                  setNewItemText('');
                }}
                className={styles.addItemCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddItem(true)}
            className={styles.addItemButton}
          >
            + Add Item
          </button>
        )}
      </div>

      {/* Plan Tags */}
      {plan.structuredData.tags.length > 0 && (
        <div className={styles.planTags}>
          {plan.structuredData.tags.map(tag => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlanCanvas;