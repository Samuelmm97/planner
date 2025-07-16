/**
 * Demo component to showcase plan storage and state management
 * This demonstrates the functionality implemented in task 5
 */

import React, { useState } from 'react';
import { usePlans } from '../hooks/usePlans';

const CURRENT_USER_ID = 'demo-user';

export default function PlanStorageDemo() {
  const {
    plans,
    loading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
    addTextItem,
    toggleItemCompletion,
    getCompletionPercentage,
    searchPlans,
    syncStatus,
    clearError,
  } = usePlans(CURRENT_USER_ID);

  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanContent, setNewPlanContent] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreatePlan = async () => {
    if (!newPlanTitle.trim() || !newPlanContent.trim()) return;
    
    try {
      await createPlan({
        title: newPlanTitle,
        content: newPlanContent,
        type: 'custom',
        tags: ['demo'],
      });
      setNewPlanTitle('');
      setNewPlanContent('');
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedPlanId || !newItemText.trim()) return;
    
    try {
      await addTextItem(selectedPlanId, newItemText);
      setNewItemText('');
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      try {
        await deletePlan(planId);
        if (selectedPlanId === planId) {
          setSelectedPlanId(null);
        }
      } catch (error) {
        console.error('Failed to delete plan:', error);
      }
    }
  };

  const filteredPlans = searchQuery ? searchPlans(searchQuery) : plans;
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Plan Storage & State Management Demo</h1>
      
      {/* Sync Status */}
      <div style={{ 
        padding: '10px', 
        marginBottom: '20px', 
        backgroundColor: syncStatus.isOnline ? '#d4edda' : '#f8d7da',
        border: `1px solid ${syncStatus.isOnline ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px'
      }}>
        <strong>Status:</strong> {syncStatus.isOnline ? 'Online' : 'Offline'} | 
        <strong> Pending Sync:</strong> {syncStatus.pendingSync} items
        {syncStatus.lastSync && (
          <span> | <strong>Last Sync:</strong> {syncStatus.lastSync.toLocaleTimeString()}</span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={clearError}
            style={{ marginLeft: '10px', padding: '2px 8px' }}
          >
            Clear
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Panel - Plan List */}
        <div>
          <h2>Plans ({plans.length})</h2>
          
          {/* Search */}
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
          </div>

          {/* Create New Plan */}
          <div style={{ 
            padding: '15px', 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            marginBottom: '15px' 
          }}>
            <h3>Create New Plan</h3>
            <input
              type="text"
              placeholder="Plan title..."
              value={newPlanTitle}
              onChange={(e) => setNewPlanTitle(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <textarea
              placeholder="Plan content..."
              value={newPlanContent}
              onChange={(e) => setNewPlanContent(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <button 
              onClick={handleCreatePlan}
              disabled={loading || !newPlanTitle.trim() || !newPlanContent.trim()}
              style={{ padding: '8px 16px' }}
            >
              {loading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>

          {/* Plan List */}
          <div>
            {loading && plans.length === 0 && <p>Loading plans...</p>}
            {filteredPlans.length === 0 && !loading && (
              <p>No plans found. {searchQuery && 'Try a different search term or '}Create your first plan above!</p>
            )}
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  padding: '15px',
                  border: selectedPlanId === plan.id ? '2px solid #007bff' : '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  backgroundColor: selectedPlanId === plan.id ? '#f8f9fa' : 'white'
                }}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <h4 style={{ margin: '0 0 8px 0' }}>{plan.title}</h4>
                <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                  {plan.content.originalText}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: '#888' }}>
                    {plan.structuredData.items.length} items • {getCompletionPercentage(plan.id)}% complete
                  </small>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan.id);
                    }}
                    style={{ 
                      padding: '4px 8px', 
                      backgroundColor: '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Plan Details */}
        <div>
          <h2>Plan Details</h2>
          {selectedPlan ? (
            <div>
              <div style={{ 
                padding: '15px', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                marginBottom: '15px' 
              }}>
                <h3>{selectedPlan.title}</h3>
                <p style={{ color: '#666' }}>{selectedPlan.content.originalText}</p>
                <div style={{ display: 'flex', gap: '15px', fontSize: '14px', color: '#888' }}>
                  <span>Type: {selectedPlan.structuredData.type}</span>
                  <span>Version: {selectedPlan.version}</span>
                  <span>Created: {selectedPlan.createdAt.toLocaleDateString()}</span>
                </div>
                {selectedPlan.structuredData.tags.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    {selectedPlan.structuredData.tags.map(tag => (
                      <span 
                        key={tag}
                        style={{ 
                          display: 'inline-block',
                          padding: '2px 6px',
                          backgroundColor: '#e9ecef',
                          borderRadius: '3px',
                          fontSize: '12px',
                          marginRight: '4px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Item */}
              <div style={{ 
                padding: '15px', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                marginBottom: '15px' 
              }}>
                <h4>Add Item</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="New item text..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    style={{ flex: 1, padding: '8px' }}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                  <button 
                    onClick={handleAddItem}
                    disabled={!newItemText.trim()}
                    style={{ padding: '8px 16px' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4>Items ({selectedPlan.structuredData.items.length})</h4>
                {selectedPlan.structuredData.items.length === 0 ? (
                  <p style={{ color: '#666', fontStyle: 'italic' }}>No items yet. Add one above!</p>
                ) : (
                  <div>
                    {selectedPlan.structuredData.items
                      .sort((a, b) => a.order - b.order)
                      .map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '10px',
                            border: '1px solid #eee',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            backgroundColor: item.status === 'completed' ? '#f8f9fa' : 'white'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.status === 'completed'}
                            onChange={() => toggleItemCompletion(selectedPlan.id, item.id)}
                          />
                          <span 
                            style={{ 
                              flex: 1,
                              textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                              color: item.status === 'completed' ? '#666' : 'black'
                            }}
                          >
                            {item.text}
                          </span>
                          <small style={{ color: '#888' }}>
                            {item.type} • {item.status}
                            {item.aiGenerated && ' • AI'}
                          </small>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              Select a plan from the list to view details and manage items.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}