import { describe, it, expect } from 'vitest';
import {
  PlanSchema,
  PlanItemSchema,
  StructuredPlanDataSchema,
  TimingInfoSchema,
  GoalSchema,
  type Plan,
  type PlanItem,
  type StructuredPlanData,
} from '../plan.js';

describe('Plan Type Validation', () => {
  describe('PlanItemSchema', () => {
    it('should validate a valid plan item', () => {
      const validPlanItem: PlanItem = {
        id: 'item-1',
        text: 'Complete morning workout',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
        order: 1,
      };

      const result = PlanItemSchema.safeParse(validPlanItem);
      expect(result.success).toBe(true);
    });

    it('should reject plan item with empty text', () => {
      const invalidPlanItem = {
        id: 'item-1',
        text: '',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
        order: 1,
      };

      const result = PlanItemSchema.safeParse(invalidPlanItem);
      expect(result.success).toBe(false);
    });

    it('should validate plan item with timing info', () => {
      const planItemWithTiming: PlanItem = {
        id: 'item-1',
        text: 'Morning meeting',
        type: 'event',
        status: 'pending',
        aiGenerated: true,
        order: 1,
        timing: {
          startTime: new Date('2024-01-01T09:00:00Z'),
          endTime: new Date('2024-01-01T10:00:00Z'),
          duration: 60,
        },
      };

      const result = PlanItemSchema.safeParse(planItemWithTiming);
      expect(result.success).toBe(true);
    });

    it('should reject invalid item type', () => {
      const invalidPlanItem = {
        id: 'item-1',
        text: 'Test item',
        type: 'invalid-type',
        status: 'pending',
        aiGenerated: false,
        order: 1,
      };

      const result = PlanItemSchema.safeParse(invalidPlanItem);
      expect(result.success).toBe(false);
    });
  });

  describe('TimingInfoSchema', () => {
    it('should validate timing with recurrence', () => {
      const timingWithRecurrence = {
        startTime: new Date('2024-01-01T09:00:00Z'),
        duration: 30,
        recurrence: {
          pattern: 'weekly' as const,
          interval: 1,
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
        },
      };

      const result = TimingInfoSchema.safeParse(timingWithRecurrence);
      expect(result.success).toBe(true);
    });

    it('should reject invalid days of week', () => {
      const invalidTiming = {
        recurrence: {
          pattern: 'weekly' as const,
          interval: 1,
          daysOfWeek: [7, 8], // Invalid days
        },
      };

      const result = TimingInfoSchema.safeParse(invalidTiming);
      expect(result.success).toBe(false);
    });
  });

  describe('GoalSchema', () => {
    it('should validate a complete goal', () => {
      const validGoal = {
        id: 'goal-1',
        description: 'Lose 10 pounds',
        targetDate: new Date('2024-06-01'),
        priority: 'high' as const,
        measurable: true,
      };

      const result = GoalSchema.safeParse(validGoal);
      expect(result.success).toBe(true);
    });

    it('should reject goal with empty description', () => {
      const invalidGoal = {
        id: 'goal-1',
        description: '',
        priority: 'high' as const,
        measurable: true,
      };

      const result = GoalSchema.safeParse(invalidGoal);
      expect(result.success).toBe(false);
    });
  });

  describe('StructuredPlanDataSchema', () => {
    it('should validate complete structured plan data', () => {
      const validStructuredData: StructuredPlanData = {
        type: 'workout',
        items: [
          {
            id: 'item-1',
            text: 'Warm up',
            type: 'task',
            status: 'pending',
            aiGenerated: false,
            order: 1,
          },
        ],
        tags: ['fitness', 'morning'],
        schedule: {
          startDate: new Date('2024-01-01'),
          timeZone: 'America/New_York',
          flexibility: 'moderate',
        },
        goals: [
          {
            id: 'goal-1',
            description: 'Build strength',
            priority: 'high',
            measurable: true,
          },
        ],
      };

      const result = StructuredPlanDataSchema.safeParse(validStructuredData);
      expect(result.success).toBe(true);
    });

    it('should validate minimal structured plan data', () => {
      const minimalStructuredData: StructuredPlanData = {
        type: 'custom',
        items: [],
        tags: [],
      };

      const result = StructuredPlanDataSchema.safeParse(minimalStructuredData);
      expect(result.success).toBe(true);
    });
  });

  describe('PlanSchema', () => {
    it('should validate a complete plan', () => {
      const validPlan: Plan = {
        id: 'plan-1',
        userId: 'user-1',
        title: 'Morning Routine',
        content: {
          originalText: 'I want to create a morning routine with exercise and meditation',
          confidence: 0.9,
        },
        structuredData: {
          type: 'routine',
          items: [
            {
              id: 'item-1',
              text: 'Exercise for 30 minutes',
              type: 'task',
              status: 'pending',
              aiGenerated: true,
              order: 1,
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
        createdAt: new Date('2024-01-01T08:00:00Z'),
        updatedAt: new Date('2024-01-01T08:00:00Z'),
      };

      const result = PlanSchema.safeParse(validPlan);
      expect(result.success).toBe(true);
    });

    it('should reject plan with empty title', () => {
      const invalidPlan = {
        id: 'plan-1',
        userId: 'user-1',
        title: '',
        content: {
          originalText: 'Some content',
        },
        structuredData: {
          type: 'custom',
          items: [],
          tags: [],
        },
        metadata: {
          source: 'user_input',
          language: 'en',
          complexity: 'simple',
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = PlanSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });
  });
});