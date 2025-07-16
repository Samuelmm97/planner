import { describe, it, expect } from 'vitest';
import {
  ChangeSchema,
  EnhancementSchema,
  CalendarEventSchema,
  SuggestionSchema,
  type Change,
  type Enhancement,
  type CalendarEvent,
  type Suggestion,
} from '../enhancement.js';

describe('Enhancement Type Validation', () => {
  describe('ChangeSchema', () => {
    it('should validate a valid change', () => {
      const validChange: Change = {
        operation: 'modify',
        target: 'items.0.text',
        oldValue: 'Old task description',
        newValue: 'Updated task description',
        description: 'Updated task text for clarity',
        confidence: 0.85,
      };

      const result = ChangeSchema.safeParse(validChange);
      expect(result.success).toBe(true);
    });

    it('should validate add operation without oldValue', () => {
      const addChange: Change = {
        operation: 'add',
        target: 'items.1',
        newValue: {
          id: 'item-2',
          text: 'New task',
          type: 'task',
          status: 'pending',
          aiGenerated: true,
          order: 2,
        },
        description: 'Added new task based on plan analysis',
      };

      const result = ChangeSchema.safeParse(addChange);
      expect(result.success).toBe(true);
    });

    it('should reject change with empty target', () => {
      const invalidChange = {
        operation: 'modify',
        target: '',
        newValue: 'some value',
        description: 'Some description',
      };

      const result = ChangeSchema.safeParse(invalidChange);
      expect(result.success).toBe(false);
    });

    it('should reject change with empty description', () => {
      const invalidChange = {
        operation: 'modify',
        target: 'items.0.text',
        newValue: 'some value',
        description: '',
      };

      const result = ChangeSchema.safeParse(invalidChange);
      expect(result.success).toBe(false);
    });
  });

  describe('EnhancementSchema', () => {
    it('should validate a complete enhancement', () => {
      const validEnhancement: Enhancement = {
        id: 'enhancement-1',
        planId: 'plan-1',
        type: 'structure',
        changes: [
          {
            operation: 'modify',
            target: 'items.0.text',
            oldValue: 'Exercise',
            newValue: 'Exercise for 30 minutes',
            description: 'Added specific duration to exercise task',
            confidence: 0.9,
          },
        ],
        confidence: 0.85,
        reasoning: 'Added specific durations to make the plan more actionable',
        status: 'pending',
        createdAt: new Date('2024-01-01T09:00:00Z'),
      };

      const result = EnhancementSchema.safeParse(validEnhancement);
      expect(result.success).toBe(true);
    });

    it('should validate enhancement with user feedback', () => {
      const enhancementWithFeedback: Enhancement = {
        id: 'enhancement-1',
        planId: 'plan-1',
        type: 'optimization',
        changes: [],
        confidence: 0.7,
        reasoning: 'Suggested reordering tasks for better flow',
        status: 'rejected',
        createdAt: new Date('2024-01-01T09:00:00Z'),
        rejectedAt: new Date('2024-01-01T09:30:00Z'),
        userFeedback: 'I prefer the original order',
      };

      const result = EnhancementSchema.safeParse(enhancementWithFeedback);
      expect(result.success).toBe(true);
    });

    it('should reject enhancement with invalid confidence', () => {
      const invalidEnhancement = {
        id: 'enhancement-1',
        planId: 'plan-1',
        type: 'structure',
        changes: [],
        confidence: 1.5, // Invalid: > 1
        reasoning: 'Some reasoning',
        status: 'pending',
        createdAt: new Date(),
      };

      const result = EnhancementSchema.safeParse(invalidEnhancement);
      expect(result.success).toBe(false);
    });
  });

  describe('CalendarEventSchema', () => {
    it('should validate a complete calendar event', () => {
      const validCalendarEvent: CalendarEvent = {
        id: 'event-1',
        planId: 'plan-1',
        planItemId: 'item-1',
        title: 'Morning Workout',
        description: 'Daily exercise routine',
        startTime: new Date('2024-01-01T07:00:00Z'),
        endTime: new Date('2024-01-01T08:00:00Z'),
        location: 'Home Gym',
        attendees: ['user@example.com'],
        recurrence: {
          pattern: 'daily',
          interval: 1,
          endDate: new Date('2024-12-31T23:59:59Z'),
        },
        status: 'pending',
        calendarProvider: 'google',
      };

      const result = CalendarEventSchema.safeParse(validCalendarEvent);
      expect(result.success).toBe(true);
    });

    it('should validate minimal calendar event', () => {
      const minimalCalendarEvent: CalendarEvent = {
        id: 'event-1',
        planId: 'plan-1',
        title: 'Task',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        status: 'pending',
      };

      const result = CalendarEventSchema.safeParse(minimalCalendarEvent);
      expect(result.success).toBe(true);
    });

    it('should reject calendar event with empty title', () => {
      const invalidCalendarEvent = {
        id: 'event-1',
        planId: 'plan-1',
        title: '',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T10:00:00Z'),
        status: 'pending',
      };

      const result = CalendarEventSchema.safeParse(invalidCalendarEvent);
      expect(result.success).toBe(false);
    });
  });

  describe('SuggestionSchema', () => {
    it('should validate a complete suggestion', () => {
      const validSuggestion: Suggestion = {
        id: 'suggestion-1',
        planId: 'plan-1',
        type: 'optimization',
        title: 'Reorder tasks for better flow',
        description: 'Consider moving the meditation task before exercise for better mental preparation',
        actionable: true,
        priority: 'medium',
        estimatedImpact: 'high',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        status: 'pending',
      };

      const result = SuggestionSchema.safeParse(validSuggestion);
      expect(result.success).toBe(true);
    });

    it('should reject suggestion with empty title', () => {
      const invalidSuggestion = {
        id: 'suggestion-1',
        planId: 'plan-1',
        type: 'optimization',
        title: '',
        description: 'Some description',
        actionable: true,
        priority: 'medium',
        estimatedImpact: 'high',
        createdAt: new Date(),
        status: 'pending',
      };

      const result = SuggestionSchema.safeParse(invalidSuggestion);
      expect(result.success).toBe(false);
    });

    it('should reject suggestion with empty description', () => {
      const invalidSuggestion = {
        id: 'suggestion-1',
        planId: 'plan-1',
        type: 'optimization',
        title: 'Some title',
        description: '',
        actionable: true,
        priority: 'medium',
        estimatedImpact: 'high',
        createdAt: new Date(),
        status: 'pending',
      };

      const result = SuggestionSchema.safeParse(invalidSuggestion);
      expect(result.success).toBe(false);
    });
  });
});