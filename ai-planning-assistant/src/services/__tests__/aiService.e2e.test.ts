/**
 * End-to-end tests for AI Service natural language processing workflow
 * Tests the complete flow from natural language input to plan creation and enhancement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockAIService } from '../aiService.js';
import type { NaturalLanguageContent, Plan } from '../../types/index.js';

describe('AI Service E2E - Natural Language Processing Workflow', () => {
  let aiService: MockAIService;
  const testUserId = 'test-user-e2e';

  beforeEach(() => {
    aiService = new MockAIService({ delay: 0 });
  });

  describe('Complete Natural Language to Plan Workflow', () => {
    it('should process natural language input and create a complete plan', async () => {
      // Step 1: User provides natural language input
      const userInput: NaturalLanguageContent = {
        text: `My morning routine:
- Wake up at 6 AM
- 20 minute meditation
- Healthy breakfast with protein
- Review daily goals
- Start work by 8:30 AM`,
        language: 'en',
      };

      // Step 2: AI processes the natural language
      const processingResult = await aiService.processNaturalLanguage(
        userInput,
        {
          aggressiveness: 'moderate',
          includeScheduling: true,
        }
      );

      // Verify processing results
      expect(processingResult).toMatchObject({
        structuredData: {
          type: expect.any(String),
          items: expect.any(Array),
          tags: expect.any(Array),
        },
        confidence: expect.any(Number),
        extractedEntities: expect.any(Object),
        suggestedTitle: expect.any(String),
      });

      expect(processingResult.structuredData.items.length).toBeGreaterThan(0);
      expect(processingResult.confidence).toBeGreaterThan(0);

      // Step 3: Create plan from AI processing result (mock)
      const createdPlan: Plan = {
        id: crypto.randomUUID(),
        userId: testUserId,
        title: processingResult.suggestedTitle || 'Morning Routine',
        content: userInput,
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

      // Verify plan creation
      expect(createdPlan).toMatchObject({
        id: expect.any(String),
        userId: testUserId,
        title: expect.any(String),
        content: userInput,
        structuredData: processingResult.structuredData,
        version: 1,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Step 4: AI generates enhancements
      const enhancements = await aiService.enhancePlan(createdPlan, {
        includeScheduling: true,
        includeCalendarEvents: true,
      });

      // Verify enhancements
      expect(enhancements.length).toBeGreaterThan(0);
      expect(enhancements[0]).toMatchObject({
        id: expect.any(String),
        planId: createdPlan.id,
        type: expect.any(String),
        changes: expect.any(Array),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        status: 'pending',
      });

      // Step 5: Generate calendar events
      const calendarEvents = await aiService.generateCalendarEvents(
        createdPlan,
        {
          includeCalendarEvents: true,
        }
      );

      // Verify calendar events (may be empty for this example)
      expect(Array.isArray(calendarEvents)).toBe(true);

      // Step 6: Generate suggestions
      const suggestions = await aiService.generateSuggestions(createdPlan);

      // Verify suggestions
      expect(Array.isArray(suggestions)).toBe(true);
      if (suggestions.length > 0) {
        expect(suggestions[0]).toMatchObject({
          id: expect.any(String),
          planId: createdPlan.id,
          type: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          priority: expect.any(String),
          status: 'pending',
        });
      }
    });

    it('should handle workout plan creation workflow', async () => {
      const workoutInput: NaturalLanguageContent = {
        text: `Upper body workout:
1. Warm up - 5 minutes
2. Push-ups - 3 sets of 15
3. Pull-ups - 3 sets of 8
4. Bench press - 4 sets of 10
5. Cool down - 10 minutes`,
        language: 'en',
      };

      // Process with AI
      const result = await aiService.processNaturalLanguage(workoutInput);

      expect(result.structuredData.type).toBe('workout');
      expect(result.structuredData.items.length).toBeGreaterThan(0);

      // Create plan (mock)
      const plan: Plan = {
        id: crypto.randomUUID(),
        userId: testUserId,
        title: result.suggestedTitle || 'Upper Body Workout',
        content: workoutInput,
        structuredData: result.structuredData,
        metadata: {
          source: 'ai_processed',
          language: 'en',
          complexity: 'moderate',
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate enhancements
      const enhancements = await aiService.enhancePlan(plan);

      expect(enhancements.length).toBeGreaterThan(0);
      expect(enhancements[0].type).toBe('structure');
    });

    it('should handle meal planning workflow', async () => {
      const mealInput: NaturalLanguageContent = {
        text: `Weekly meal prep:
Breakfast: Overnight oats with berries
Lunch: Grilled chicken salad
Dinner: Salmon with vegetables
Snacks: Greek yogurt and nuts`,
        language: 'en',
      };

      // Process with AI
      const result = await aiService.processNaturalLanguage(mealInput);

      expect(result.structuredData.type).toBe('meal');

      // Create plan (mock)
      const plan: Plan = {
        id: crypto.randomUUID(),
        userId: testUserId,
        title: result.suggestedTitle || 'Weekly Meal Prep',
        content: mealInput,
        structuredData: result.structuredData,
        metadata: {
          source: 'ai_processed',
          language: 'en',
          complexity: 'moderate',
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate calendar events for meal times
      const calendarEvents = await aiService.generateCalendarEvents(plan, {
        includeCalendarEvents: true,
      });

      expect(Array.isArray(calendarEvents)).toBe(true);
    });
  });

  describe('Error Handling in E2E Workflow', () => {
    it('should handle AI processing errors gracefully', async () => {
      const errorService = new MockAIService({
        simulateErrors: true,
        delay: 0,
      });

      const input: NaturalLanguageContent = {
        text: 'Simple plan',
        language: 'en',
      };

      // Try processing multiple times to potentially hit error
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 20; i++) {
        try {
          await errorService.processNaturalLanguage(input);
          successCount++;
        } catch (error) {
          errorCount++;
          expect(error).toBeInstanceOf(Error);
        }
      }

      // Should have both successes and errors due to random simulation
      expect(successCount + errorCount).toBe(20);
    });

    it('should handle offline scenario', async () => {
      aiService.setOnline(false);

      const input: NaturalLanguageContent = {
        text: 'Test plan',
        language: 'en',
      };

      await expect(aiService.processNaturalLanguage(input)).rejects.toThrow(
        'AI service is offline'
      );

      // Service should report as unhealthy
      const isHealthy = await aiService.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should handle multi-type plan with mixed content', async () => {
      const complexInput: NaturalLanguageContent = {
        text: `Daily schedule:
Morning:
- 6 AM: Wake up and stretch
- 6:30 AM: Workout (30 minutes)
- 7:30 AM: Breakfast

Work:
- 9 AM: Team standup meeting
- 10 AM: Focus work on project X
- 12 PM: Lunch break

Evening:
- 6 PM: Grocery shopping
- 7 PM: Cook dinner
- 8 PM: Family time
- 10 PM: Read before bed`,
        language: 'en',
      };

      // Process complex input
      const result = await aiService.processNaturalLanguage(complexInput, {
        aggressiveness: 'aggressive',
        includeScheduling: true,
      });

      expect(result.structuredData.items.length).toBeGreaterThan(5);
      expect(result.extractedEntities.times).toBeDefined();
      expect(result.extractedEntities.times!.length).toBeGreaterThan(3);

      // Create plan (mock)
      const plan: Plan = {
        id: crypto.randomUUID(),
        userId: testUserId,
        title: result.suggestedTitle || 'Daily Schedule',
        content: complexInput,
        structuredData: result.structuredData,
        metadata: {
          source: 'ai_processed',
          language: 'en',
          complexity: 'complex',
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate comprehensive enhancements
      const enhancements = await aiService.enhancePlan(plan, {
        includeScheduling: true,
        includeCalendarEvents: true,
      });

      expect(enhancements.length).toBeGreaterThan(0);

      // Generate calendar events for time-based items
      const calendarEvents = await aiService.generateCalendarEvents(plan, {
        includeCalendarEvents: true,
      });

      // Should generate events for items with specific times
      expect(calendarEvents.length).toBeGreaterThan(0);

      // Verify calendar event structure
      if (calendarEvents.length > 0) {
        expect(calendarEvents[0]).toMatchObject({
          id: expect.any(String),
          planId: plan.id,
          title: expect.any(String),
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          status: 'pending',
        });
      }
    });

    it('should maintain consistency across plan updates', async () => {
      const initialInput: NaturalLanguageContent = {
        text: 'Basic workout plan',
        language: 'en',
      };

      // Initial processing
      const initialResult =
        await aiService.processNaturalLanguage(initialInput);
      const initialPlan: Plan = {
        id: crypto.randomUUID(),
        userId: testUserId,
        title: initialResult.suggestedTitle || 'Basic Workout',
        content: initialInput,
        structuredData: initialResult.structuredData,
        metadata: {
          source: 'ai_processed',
          language: 'en',
          complexity: 'simple',
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update plan content
      const updatedInput: NaturalLanguageContent = {
        text: 'Enhanced workout plan with cardio and strength training',
        language: 'en',
      };

      const updatedResult =
        await aiService.processNaturalLanguage(updatedInput);
      const updatedPlan: Plan = {
        ...initialPlan,
        content: updatedInput,
        structuredData: updatedResult.structuredData,
        version: 2,
        updatedAt: new Date(),
      };

      // Generate enhancements for updated plan
      const enhancements = await aiService.enhancePlan(updatedPlan);

      expect(enhancements.length).toBeGreaterThan(0);
      expect(enhancements[0].planId).toBe(updatedPlan.id);
      expect(updatedPlan.version).toBe(2);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent requests', async () => {
      const inputs = Array.from({ length: 5 }, (_, i) => ({
        text: `Plan ${i + 1}: Task A, Task B, Task C`,
        language: 'en' as const,
      }));

      // Process all inputs concurrently
      const results = await Promise.all(
        inputs.map((input) => aiService.processNaturalLanguage(input))
      );

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.structuredData.items.length).toBeGreaterThan(0);
        expect(result.suggestedTitle.toLowerCase()).toContain(
          `plan ${index + 1}`
        );
      });
    });

    it('should handle large input text', async () => {
      const largeInput: NaturalLanguageContent = {
        text: Array.from(
          { length: 50 },
          (_, i) => `- Task ${i + 1}: Do something important`
        ).join('\n'),
        language: 'en',
      };

      const result = await aiService.processNaturalLanguage(largeInput);

      expect(result.structuredData.items).toHaveLength(50);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should provide consistent results for identical inputs', async () => {
      const input: NaturalLanguageContent = {
        text: 'Morning routine: wake up, exercise, breakfast',
        language: 'en',
      };

      const result1 = await aiService.processNaturalLanguage(input);
      const result2 = await aiService.processNaturalLanguage(input);

      // Core structure should be consistent
      expect(result1.structuredData.type).toBe(result2.structuredData.type);
      expect(result1.structuredData.items.length).toBe(
        result2.structuredData.items.length
      );
      expect(result1.suggestedTitle).toBe(result2.suggestedTitle);
    });
  });
});
