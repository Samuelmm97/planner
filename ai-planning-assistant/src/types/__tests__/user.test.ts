import { describe, it, expect } from 'vitest';
import {
  UserContextSchema,
  UserPreferencesSchema,
  SchedulingPreferencesSchema,
  CalendarConfigSchema,
  BehaviorPatternSchema,
  PlanHistorySchema,
  type UserContext,
  type UserPreferences,
  type BehaviorPattern,
  type PlanHistory,
} from '../user.js';

describe('User Type Validation', () => {
  describe('SchedulingPreferencesSchema', () => {
    it('should validate valid scheduling preferences', () => {
      const validSchedulingPrefs = {
        preferredStartTime: '08:00',
        preferredEndTime: '18:00',
        workDays: [1, 2, 3, 4, 5], // Monday to Friday
        bufferTime: 15,
        allowOverlap: false,
        autoSchedule: true,
      };

      const result = SchedulingPreferencesSchema.safeParse(validSchedulingPrefs);
      expect(result.success).toBe(true);
    });

    it('should reject invalid time format', () => {
      const invalidSchedulingPrefs = {
        preferredStartTime: '25:00', // Invalid hour
        preferredEndTime: '18:00',
        workDays: [1, 2, 3, 4, 5],
        bufferTime: 15,
        allowOverlap: false,
        autoSchedule: true,
      };

      const result = SchedulingPreferencesSchema.safeParse(invalidSchedulingPrefs);
      expect(result.success).toBe(false);
    });

    it('should reject invalid work days', () => {
      const invalidSchedulingPrefs = {
        preferredStartTime: '08:00',
        preferredEndTime: '18:00',
        workDays: [1, 2, 3, 4, 5, 7], // Invalid day: 7
        bufferTime: 15,
        allowOverlap: false,
        autoSchedule: true,
      };

      const result = SchedulingPreferencesSchema.safeParse(invalidSchedulingPrefs);
      expect(result.success).toBe(false);
    });
  });

  describe('CalendarConfigSchema', () => {
    it('should validate complete calendar config', () => {
      const validCalendarConfig = {
        provider: 'google' as const,
        accountId: 'user@gmail.com',
        calendarId: 'primary',
        accessToken: 'encrypted_access_token',
        refreshToken: 'encrypted_refresh_token',
        isDefault: true,
        syncEnabled: true,
        lastSyncAt: new Date('2024-01-01T12:00:00Z'),
      };

      const result = CalendarConfigSchema.safeParse(validCalendarConfig);
      expect(result.success).toBe(true);
    });

    it('should validate minimal calendar config', () => {
      const minimalCalendarConfig = {
        provider: 'outlook' as const,
        accountId: 'user@outlook.com',
        calendarId: 'calendar-1',
        isDefault: false,
        syncEnabled: false,
      };

      const result = CalendarConfigSchema.safeParse(minimalCalendarConfig);
      expect(result.success).toBe(true);
    });
  });

  describe('UserPreferencesSchema', () => {
    it('should validate complete user preferences', () => {
      const validUserPreferences: UserPreferences = {
        planTypes: ['routine', 'workout', 'meal'],
        schedulingPreferences: {
          preferredStartTime: '07:00',
          preferredEndTime: '22:00',
          workDays: [1, 2, 3, 4, 5],
          bufferTime: 10,
          allowOverlap: false,
          autoSchedule: true,
        },
        aiAggressiveness: 'moderate',
        calendarIntegrations: [
          {
            provider: 'google',
            accountId: 'user@gmail.com',
            calendarId: 'primary',
            isDefault: true,
            syncEnabled: true,
          },
        ],
        notifications: {
          email: true,
          push: true,
          reminders: true,
          aiSuggestions: false,
        },
        privacy: {
          shareAnalytics: true,
          shareImprovements: false,
        },
        language: 'en',
        timezone: 'America/New_York',
      };

      const result = UserPreferencesSchema.safeParse(validUserPreferences);
      expect(result.success).toBe(true);
    });
  });

  describe('BehaviorPatternSchema', () => {
    it('should validate a complete behavior pattern', () => {
      const validBehaviorPattern: BehaviorPattern = {
        id: 'pattern-1',
        userId: 'user-1',
        pattern: 'User tends to skip morning workouts on Mondays',
        frequency: 0.8,
        context: ['monday', 'morning', 'workout'],
        impact: 'negative',
        confidence: 0.75,
        firstObserved: new Date('2024-01-01T00:00:00Z'),
        lastObserved: new Date('2024-01-15T00:00:00Z'),
        occurrences: 12,
      };

      const result = BehaviorPatternSchema.safeParse(validBehaviorPattern);
      expect(result.success).toBe(true);
    });

    it('should reject behavior pattern with invalid frequency', () => {
      const invalidBehaviorPattern = {
        id: 'pattern-1',
        userId: 'user-1',
        pattern: 'Some pattern',
        frequency: 1.5, // Invalid: > 1
        context: ['context'],
        impact: 'positive',
        confidence: 0.75,
        firstObserved: new Date(),
        lastObserved: new Date(),
        occurrences: 5,
      };

      const result = BehaviorPatternSchema.safeParse(invalidBehaviorPattern);
      expect(result.success).toBe(false);
    });

    it('should reject behavior pattern with zero occurrences', () => {
      const invalidBehaviorPattern = {
        id: 'pattern-1',
        userId: 'user-1',
        pattern: 'Some pattern',
        frequency: 0.5,
        context: ['context'],
        impact: 'positive',
        confidence: 0.75,
        firstObserved: new Date(),
        lastObserved: new Date(),
        occurrences: 0, // Invalid: must be at least 1
      };

      const result = BehaviorPatternSchema.safeParse(invalidBehaviorPattern);
      expect(result.success).toBe(false);
    });
  });

  describe('PlanHistorySchema', () => {
    it('should validate plan history with adherence score', () => {
      const validPlanHistory: PlanHistory = {
        id: 'history-1',
        planId: 'plan-1',
        userId: 'user-1',
        action: 'completed',
        timestamp: new Date('2024-01-01T18:00:00Z'),
        details: {
          completionRate: 0.85,
          timeSpent: 45,
        },
        adherenceScore: 0.85,
      };

      const result = PlanHistorySchema.safeParse(validPlanHistory);
      expect(result.success).toBe(true);
    });

    it('should validate minimal plan history', () => {
      const minimalPlanHistory: PlanHistory = {
        id: 'history-1',
        planId: 'plan-1',
        userId: 'user-1',
        action: 'created',
        timestamp: new Date('2024-01-01T08:00:00Z'),
      };

      const result = PlanHistorySchema.safeParse(minimalPlanHistory);
      expect(result.success).toBe(true);
    });

    it('should reject plan history with invalid adherence score', () => {
      const invalidPlanHistory = {
        id: 'history-1',
        planId: 'plan-1',
        userId: 'user-1',
        action: 'completed',
        timestamp: new Date(),
        adherenceScore: 1.2, // Invalid: > 1
      };

      const result = PlanHistorySchema.safeParse(invalidPlanHistory);
      expect(result.success).toBe(false);
    });
  });

  describe('UserContextSchema', () => {
    it('should validate complete user context', () => {
      const validUserContext: UserContext = {
        userId: 'user-1',
        preferences: {
          planTypes: ['routine'],
          schedulingPreferences: {
            preferredStartTime: '08:00',
            preferredEndTime: '18:00',
            workDays: [1, 2, 3, 4, 5],
            bufferTime: 15,
            allowOverlap: false,
            autoSchedule: true,
          },
          aiAggressiveness: 'moderate',
          calendarIntegrations: [],
          notifications: {
            email: true,
            push: false,
            reminders: true,
            aiSuggestions: true,
          },
          privacy: {
            shareAnalytics: false,
            shareImprovements: true,
          },
          language: 'en',
          timezone: 'UTC',
        },
        planHistory: [
          {
            id: 'history-1',
            planId: 'plan-1',
            userId: 'user-1',
            action: 'created',
            timestamp: new Date('2024-01-01T08:00:00Z'),
          },
        ],
        behaviorPatterns: [
          {
            id: 'pattern-1',
            userId: 'user-1',
            pattern: 'Consistent morning routine',
            frequency: 0.9,
            context: ['morning'],
            impact: 'positive',
            confidence: 0.8,
            firstObserved: new Date('2024-01-01T00:00:00Z'),
            lastObserved: new Date('2024-01-15T00:00:00Z'),
            occurrences: 15,
          },
        ],
        goals: [
          {
            id: 'goal-1',
            description: 'Maintain consistent exercise routine',
            priority: 'high',
            measurable: true,
          },
        ],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T00:00:00Z'),
        lastActiveAt: new Date('2024-01-15T12:00:00Z'),
      };

      const result = UserContextSchema.safeParse(validUserContext);
      expect(result.success).toBe(true);
    });
  });
});