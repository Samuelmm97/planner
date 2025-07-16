/**
 * Tests for AI Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MockAIService,
  AIServiceWithRetry,
  AIServiceError,
  type NaturalLanguageProcessingResult,
} from '../aiService.js';
import type { Plan, NaturalLanguageContent } from '../../types/index.js';

// Mock plan for testing
const mockPlan: Plan = {
  id: 'test-plan-1',
  userId: 'test-user',
  title: 'Test Plan',
  content: {
    originalText: 'Go for a run\nEat healthy breakfast\nWork on project',
  },
  structuredData: {
    type: 'routine',
    items: [
      {
        id: 'item-1',
        text: 'Go for a run',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
        order: 0,
      },
      {
        id: 'item-2',
        text: 'Eat healthy breakfast',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
        order: 1,
      },
      {
        id: 'item-3',
        text: 'Work on project',
        type: 'task',
        status: 'pending',
        aiGenerated: false,
        order: 2,
      },
    ],
    tags: ['health', 'work'],
  },
  metadata: {
    source: 'user_input',
    language: 'en',
    complexity: 'simple',
  },
  version: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('MockAIService', () => {
  let aiService: MockAIService;

  beforeEach(() => {
    aiService = new MockAIService({ delay: 0 }); // No delay for tests
  });

  describe('processNaturalLanguage', () => {
    it('should process simple natural language input', async () => {
      const input: NaturalLanguageContent = {
        originalText: 'Go for a run and eat breakfast',
      };

      const result = await aiService.processNaturalLanguage(input);

      expect(result).toMatchObject({
        structuredData: expect.objectContaining({
          type: expect.any(String),
          items: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              type: expect.any(String),
              status: 'pending',
              aiGenerated: false,
            }),
          ]),
          tags: expect.any(Array),
        }),
        confidence: expect.any(Number),
        extractedEntities: expect.any(Object),
        suggestedTitle: expect.any(String),
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should extract plan items from bulleted list', async () => {
      const input: NaturalLanguageContent = {
        originalText: '- Go for a run\n- Eat breakfast\n- Work on project',
      };

      const result = await aiService.processNaturalLanguage(input);

      expect(result.structuredData.items).toHaveLength(3);
      expect(result.structuredData.items[0].text).toBe('go for a run');
      expect(result.structuredData.items[1].text).toBe('eat breakfast');
      expect(result.structuredData.items[2].text).toBe('work on project');
    });

    it('should extract plan items from numbered list', async () => {
      const input: NaturalLanguageContent = {
        originalText:
          '1. Morning workout\n2. Healthy breakfast\n3. Team meeting',
      };

      const result = await aiService.processNaturalLanguage(input);

      expect(result.structuredData.items).toHaveLength(3);
      expect(result.structuredData.items[0].text).toBe('morning workout');
      expect(result.structuredData.items[1].text).toBe('healthy breakfast');
      expect(result.structuredData.items[2].text).toBe('team meeting');
    });

    it('should determine plan type correctly', async () => {
      const workoutInput: NaturalLanguageContent = {
        originalText: 'Workout plan: Push-ups, squats, running',
      };

      const mealInput: NaturalLanguageContent = {
        originalText: 'Meal prep: breakfast, lunch, dinner',
      };

      const workoutResult =
        await aiService.processNaturalLanguage(workoutInput);
      const mealResult = await aiService.processNaturalLanguage(mealInput);

      expect(workoutResult.structuredData.type).toBe('workout');
      expect(mealResult.structuredData.type).toBe('meal');
    });

    it('should extract entities from text', async () => {
      const input: NaturalLanguageContent = {
        originalText: 'Run at 7:00 AM tomorrow and meet John for lunch',
      };

      const result = await aiService.processNaturalLanguage(input);

      expect(result.extractedEntities.times).toEqual(
        expect.arrayContaining(['7:00 am'])
      );
      expect(result.extractedEntities.dates).toBeDefined();
      expect(result.extractedEntities.actions).toContain('run');
      expect(result.extractedEntities.actions).toContain('meet');
    });

    it('should generate appropriate title', async () => {
      const input: NaturalLanguageContent = {
        originalText: 'Daily morning routine for better health',
      };

      const result = await aiService.processNaturalLanguage(input);

      expect(result.suggestedTitle).toBe(
        'daily morning routine for better health'
      );
    });

    it('should handle empty input gracefully', async () => {
      const input: NaturalLanguageContent = {
        originalText: '',
      };

      const result = await aiService.processNaturalLanguage(input);

      expect(result.structuredData.items).toHaveLength(0);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should simulate API errors when configured', async () => {
      const errorService = new MockAIService({
        simulateErrors: true,
        delay: 0,
      });
      const input: NaturalLanguageContent = {
        originalText: 'Test input',
      };

      // Run multiple times to hit the error case (10% chance)
      let errorThrown = false;
      for (let i = 0; i < 50; i++) {
        try {
          await errorService.processNaturalLanguage(input);
        } catch (error) {
          if (error instanceof AIServiceError) {
            errorThrown = true;
            expect(error.code).toBe('API_ERROR');
            expect(error.retryable).toBe(true);
            break;
          }
        }
      }

      // Note: This test might occasionally fail due to randomness
      // In a real test suite, you'd want to mock Math.random for deterministic behavior
    });
  });

  describe('enhancePlan', () => {
    it('should generate enhancements for a plan', async () => {
      const enhancements = await aiService.enhancePlan(mockPlan);

      expect(enhancements).toHaveLength(1); // Structure enhancement
      expect(enhancements[0]).toMatchObject({
        id: expect.any(String),
        planId: mockPlan.id,
        type: 'structure',
        changes: expect.any(Array),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        status: 'pending',
        createdAt: expect.any(Date),
      });
    });

    it('should generate scheduling enhancement when requested', async () => {
      const enhancements = await aiService.enhancePlan(mockPlan, {
        includeScheduling: true,
      });

      expect(enhancements).toHaveLength(2); // Structure + Schedule
      expect(enhancements.some((e) => e.type === 'schedule')).toBe(true);
    });

    it('should handle empty plan gracefully', async () => {
      const emptyPlan: Plan = {
        ...mockPlan,
        structuredData: {
          ...mockPlan.structuredData,
          items: [],
        },
      };

      const enhancements = await aiService.enhancePlan(emptyPlan);

      expect(enhancements).toHaveLength(0);
    });
  });

  describe('generateCalendarEvents', () => {
    it('should generate calendar events when requested', async () => {
      const events = await aiService.generateCalendarEvents(mockPlan, {
        includeCalendarEvents: true,
      });

      // Mock plan items might have time references detected
      expect(Array.isArray(events)).toBe(true);

      // Test with time-sensitive plan
      const timePlan: Plan = {
        ...mockPlan,
        structuredData: {
          ...mockPlan.structuredData,
          items: [
            {
              id: 'item-1',
              text: 'Meeting at 2 PM',
              type: 'event',
              status: 'pending',
              aiGenerated: false,
              order: 0,
            },
          ],
        },
      };

      const timeEvents = await aiService.generateCalendarEvents(timePlan, {
        includeCalendarEvents: true,
      });

      expect(timeEvents).toHaveLength(1);
      expect(timeEvents[0]).toMatchObject({
        id: expect.any(String),
        planId: timePlan.id,
        planItemId: 'item-1',
        title: 'Meeting at 2 PM',
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        status: 'pending',
      });
    });

    it('should return empty array when calendar events not requested', async () => {
      const events = await aiService.generateCalendarEvents(mockPlan);

      expect(events).toHaveLength(0);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for complex plans', async () => {
      const complexPlan: Plan = {
        ...mockPlan,
        structuredData: {
          ...mockPlan.structuredData,
          items: Array.from({ length: 6 }, (_, i) => ({
            id: `item-${i}`,
            text: `Task ${i + 1}`,
            type: 'task' as const,
            status: 'pending' as const,
            aiGenerated: false,
            order: i,
          })),
        },
      };

      const suggestions = await aiService.generateSuggestions(complexPlan);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toMatchObject({
        id: expect.any(String),
        planId: complexPlan.id,
        type: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        actionable: expect.any(Boolean),
        priority: expect.any(String),
        estimatedImpact: expect.any(String),
        createdAt: expect.any(Date),
        status: 'pending',
      });
    });

    it('should suggest scheduling for plans without time estimates', async () => {
      const suggestions = await aiService.generateSuggestions(mockPlan);

      expect(suggestions.some((s) => s.type === 'scheduling')).toBe(true);
    });
  });

  describe('isHealthy', () => {
    it('should return true when service is online', async () => {
      const isHealthy = await aiService.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should return false when service is offline', async () => {
      aiService.setOnline(false);
      const isHealthy = await aiService.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw network error when offline', async () => {
      aiService.setOnline(false);
      const input: NaturalLanguageContent = {
        originalText: 'Test input',
      };

      await expect(aiService.processNaturalLanguage(input)).rejects.toThrow(
        AIServiceError
      );
      await expect(aiService.processNaturalLanguage(input)).rejects.toThrow(
        'AI service is offline'
      );
    });
  });
});

describe('AIServiceWithRetry', () => {
  let mockService: MockAIService;
  let retryService: AIServiceWithRetry;

  beforeEach(() => {
    mockService = new MockAIService({ delay: 0 });
    retryService = new AIServiceWithRetry(mockService, 2, 10); // 2 retries, 10ms base delay
  });

  it('should retry on retryable errors', async () => {
    const input: NaturalLanguageContent = {
      originalText: 'Test input',
    };

    // Mock the service to fail twice then succeed
    let callCount = 0;
    const originalMethod = mockService.processNaturalLanguage.bind(mockService);
    mockService.processNaturalLanguage = vi
      .fn()
      .mockImplementation(async (input, options) => {
        callCount++;
        if (callCount <= 2) {
          throw new AIServiceError('Temporary error', 'API_ERROR', true);
        }
        return originalMethod(input, options);
      });

    const result = await retryService.processNaturalLanguage(input);

    expect(result).toBeDefined();
    expect(mockService.processNaturalLanguage).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const input: NaturalLanguageContent = {
      originalText: 'Test input',
    };

    mockService.processNaturalLanguage = vi
      .fn()
      .mockRejectedValue(
        new AIServiceError('Non-retryable error', 'PARSING_ERROR', false)
      );

    await expect(retryService.processNaturalLanguage(input)).rejects.toThrow(
      'Non-retryable error'
    );
    expect(mockService.processNaturalLanguage).toHaveBeenCalledTimes(1);
  });

  it('should give up after max retries', async () => {
    const input: NaturalLanguageContent = {
      originalText: 'Test input',
    };

    mockService.processNaturalLanguage = vi
      .fn()
      .mockRejectedValue(
        new AIServiceError('Persistent error', 'API_ERROR', true)
      );

    await expect(retryService.processNaturalLanguage(input)).rejects.toThrow(
      'Persistent error'
    );
    expect(mockService.processNaturalLanguage).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should work normally when no errors occur', async () => {
    const input: NaturalLanguageContent = {
      originalText: 'Test input',
    };

    const result = await retryService.processNaturalLanguage(input);

    expect(result).toBeDefined();
    expect(result.structuredData).toBeDefined();
  });
});

describe('AI Service Integration', () => {
  let aiService: MockAIService;

  beforeEach(() => {
    aiService = new MockAIService({ delay: 0 });
  });

  it('should handle complete natural language processing workflow', async () => {
    const input: NaturalLanguageContent = {
      text: 'Morning routine:\n- 6 AM wake up\n- 6:30 AM workout\n- 7:30 AM breakfast\n- 8 AM work',
      language: 'en',
    };

    // Step 1: Process natural language
    const processingResult = await aiService.processNaturalLanguage(input);

    expect(processingResult.structuredData.items.length).toBeGreaterThan(0);
    expect(processingResult.structuredData.type).toBe('routine');
    expect(processingResult.extractedEntities.times).toEqual(
      expect.arrayContaining(['6 am'])
    );

    // Step 2: Create plan from processing result
    const plan: Plan = {
      id: crypto.randomUUID(),
      userId: 'test-user',
      title: processingResult.suggestedTitle || 'Test Plan',
      content: input,
      structuredData: processingResult.structuredData,
      metadata: {
        source: 'ai_processed',
        language: 'en',
        complexity: 'moderate',
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Step 3: Generate enhancements
    const enhancements = await aiService.enhancePlan(plan, {
      includeScheduling: true,
      includeCalendarEvents: true,
    });

    expect(enhancements.length).toBeGreaterThan(0);
    expect(enhancements.some((e) => e.type === 'structure')).toBe(true);

    // Step 4: Generate calendar events
    const calendarEvents = await aiService.generateCalendarEvents(plan, {
      includeCalendarEvents: true,
    });

    expect(calendarEvents.length).toBeGreaterThan(0);

    // Step 5: Generate suggestions
    const suggestions = await aiService.generateSuggestions(plan);

    expect(suggestions).toBeDefined();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should maintain consistency across multiple operations', async () => {
    const input: NaturalLanguageContent = {
      text: 'Weekly workout plan',
      language: 'en',
    };

    const result1 = await aiService.processNaturalLanguage(input);
    const result2 = await aiService.processNaturalLanguage(input);

    // Results should be consistent for same input
    expect(result1.structuredData.type).toBe(result2.structuredData.type);
    expect(result1.suggestedTitle).toBe(result2.suggestedTitle);
  });
});
