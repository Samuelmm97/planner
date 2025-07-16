import { describe, it, expect } from 'vitest';
import {
  validatePlan,
  validatePlanItem,
  validateArray,
  validatePartialUpdate,
  isPlan,
  isPlanItem,
  formatValidationErrors,
  commonValidations,
} from '../validation.js';
import { PlanItemSchema } from '../plan.js';

describe('Validation Utilities', () => {
  describe('validatePlan', () => {
    it('should validate a complete plan successfully', () => {
      const validPlan = {
        id: 'plan-1',
        userId: 'user-1',
        title: 'Test Plan',
        content: {
          originalText: 'This is a test plan',
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

      const result = validatePlan(validPlan);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid plan', () => {
      const invalidPlan = {
        id: 'plan-1',
        // Missing required fields
      };

      const result = validatePlan(invalidPlan);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('validatePlanItem', () => {
    it('should validate a plan item successfully', () => {
      const validPlanItem = {
        id: 'item-1',
        text: 'Test task',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
        order: 1,
      };

      const result = validatePlanItem(validPlanItem);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('validateArray', () => {
    it('should validate array of plan items', () => {
      const planItems = [
        {
          id: 'item-1',
          text: 'Task 1',
          type: 'task',
          status: 'pending',
          aiGenerated: false,
          order: 1,
        },
        {
          id: 'item-2',
          text: 'Task 2',
          type: 'task',
          status: 'completed',
          aiGenerated: true,
          order: 2,
        },
      ];

      const result = validateArray(PlanItemSchema, planItems);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return errors for invalid items in array', () => {
      const planItems = [
        {
          id: 'item-1',
          text: 'Task 1',
          type: 'task',
          status: 'pending',
          aiGenerated: false,
          order: 1,
        },
        {
          id: 'item-2',
          text: '', // Invalid: empty text
          type: 'task',
          status: 'completed',
          aiGenerated: true,
          order: 2,
        },
      ];

      const result = validateArray(PlanItemSchema, planItems);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Item 1');
    });
  });

  describe('validatePartialUpdate', () => {
    it('should validate partial plan item update', () => {
      const partialUpdate = {
        text: 'Updated task text',
        status: 'completed',
      };

      const result = validatePartialUpdate(PlanItemSchema, partialUpdate);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify valid plan', () => {
      const validPlan = {
        id: 'plan-1',
        userId: 'user-1',
        title: 'Test Plan',
        content: {
          originalText: 'This is a test plan',
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

      expect(isPlan(validPlan)).toBe(true);
      expect(isPlan({ invalid: 'data' })).toBe(false);
    });

    it('should correctly identify valid plan item', () => {
      const validPlanItem = {
        id: 'item-1',
        text: 'Test task',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
        order: 1,
      };

      expect(isPlanItem(validPlanItem)).toBe(true);
      expect(isPlanItem({ invalid: 'data' })).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format multiple errors correctly', () => {
      const errors = [
        'title: Required',
        'content.originalText: String must contain at least 1 character(s)',
        'version: Expected number, received string',
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toBe('title: Required; content.originalText: String must contain at least 1 character(s); version: Expected number, received string');
    });
  });

  describe('commonValidations', () => {
    it('should validate UUID correctly', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const invalidUuid = 'not-a-uuid';

      expect(commonValidations.uuid.safeParse(validUuid).success).toBe(true);
      expect(commonValidations.uuid.safeParse(invalidUuid).success).toBe(false);
    });

    it('should validate email correctly', () => {
      const validEmail = 'user@example.com';
      const invalidEmail = 'not-an-email';

      expect(commonValidations.email.safeParse(validEmail).success).toBe(true);
      expect(commonValidations.email.safeParse(invalidEmail).success).toBe(false);
    });

    it('should validate percentage correctly', () => {
      expect(commonValidations.percentage.safeParse(0.5).success).toBe(true);
      expect(commonValidations.percentage.safeParse(0).success).toBe(true);
      expect(commonValidations.percentage.safeParse(1).success).toBe(true);
      expect(commonValidations.percentage.safeParse(1.5).success).toBe(false);
      expect(commonValidations.percentage.safeParse(-0.1).success).toBe(false);
    });

    it('should validate future date correctly', () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const pastDate = new Date(Date.now() - 86400000); // Yesterday

      expect(commonValidations.futureDate.safeParse(futureDate).success).toBe(true);
      expect(commonValidations.futureDate.safeParse(pastDate).success).toBe(false);
    });
  });
});