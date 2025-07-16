import { z } from 'zod';
import type { PlanType, Goal } from './plan.js';
import { GoalSchema } from './plan.js';

// User preference types
export type AIAggressiveness = 'conservative' | 'moderate' | 'aggressive';
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'custom';

export const AIAggressivenessSchema = z.enum(['conservative', 'moderate', 'aggressive']);
export const CalendarProviderSchema = z.enum(['google', 'outlook', 'apple', 'custom']);

// Scheduling preferences
export interface SchedulingPreferences {
  preferredStartTime: string; // HH:MM format
  preferredEndTime: string; // HH:MM format
  workDays: number[]; // 0-6, Sunday = 0
  bufferTime: number; // minutes between activities
  allowOverlap: boolean;
  autoSchedule: boolean;
}

export const SchedulingPreferencesSchema = z.object({
  preferredStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  preferredEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  workDays: z.array(z.number().min(0).max(6)),
  bufferTime: z.number().min(0),
  allowOverlap: z.boolean(),
  autoSchedule: z.boolean(),
});

// Calendar configuration
export interface CalendarConfig {
  provider: CalendarProvider;
  accountId: string;
  calendarId: string;
  accessToken?: string; // encrypted
  refreshToken?: string; // encrypted
  isDefault: boolean;
  syncEnabled: boolean;
  lastSyncAt?: Date;
}

export const CalendarConfigSchema = z.object({
  provider: CalendarProviderSchema,
  accountId: z.string(),
  calendarId: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  isDefault: z.boolean(),
  syncEnabled: z.boolean(),
  lastSyncAt: z.date().optional(),
});

// User preferences
export interface UserPreferences {
  planTypes: PlanType[];
  schedulingPreferences: SchedulingPreferences;
  aiAggressiveness: AIAggressiveness;
  calendarIntegrations: CalendarConfig[];
  notifications: {
    email: boolean;
    push: boolean;
    reminders: boolean;
    aiSuggestions: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    shareImprovements: boolean;
  };
  language: string;
  timezone: string;
}

export const UserPreferencesSchema = z.object({
  planTypes: z.array(z.enum(['routine', 'meal', 'workout', 'schedule', 'custom'])),
  schedulingPreferences: SchedulingPreferencesSchema,
  aiAggressiveness: AIAggressivenessSchema,
  calendarIntegrations: z.array(CalendarConfigSchema),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    reminders: z.boolean(),
    aiSuggestions: z.boolean(),
  }),
  privacy: z.object({
    shareAnalytics: z.boolean(),
    shareImprovements: z.boolean(),
  }),
  language: z.string(),
  timezone: z.string(),
});

// Behavior pattern tracking
export interface BehaviorPattern {
  id: string;
  userId: string;
  pattern: string; // description of the pattern
  frequency: number; // how often this pattern occurs (0-1)
  context: string[]; // tags or contexts where this pattern appears
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1, confidence in pattern detection
  firstObserved: Date;
  lastObserved: Date;
  occurrences: number;
}

export const BehaviorPatternSchema = z.object({
  id: z.string(),
  userId: z.string(),
  pattern: z.string().min(1),
  frequency: z.number().min(0).max(1),
  context: z.array(z.string()),
  impact: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  firstObserved: z.date(),
  lastObserved: z.date(),
  occurrences: z.number().min(1),
});

// Plan history for tracking user patterns
export interface PlanHistory {
  id: string;
  planId: string;
  userId: string;
  action: 'created' | 'modified' | 'completed' | 'abandoned' | 'ai_enhanced';
  timestamp: Date;
  details?: Record<string, any>;
  adherenceScore?: number; // 0-1, how well user followed the plan
}

export const PlanHistorySchema = z.object({
  id: z.string(),
  planId: z.string(),
  userId: z.string(),
  action: z.enum(['created', 'modified', 'completed', 'abandoned', 'ai_enhanced']),
  timestamp: z.date(),
  details: z.record(z.string(), z.unknown()).optional(),
  adherenceScore: z.number().min(0).max(1).optional(),
});

// Main UserContext interface
export interface UserContext {
  userId: string;
  preferences: UserPreferences;
  planHistory: PlanHistory[];
  behaviorPatterns: BehaviorPattern[];
  goals: Goal[];
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export const UserContextSchema = z.object({
  userId: z.string(),
  preferences: UserPreferencesSchema,
  planHistory: z.array(PlanHistorySchema),
  behaviorPatterns: z.array(BehaviorPatternSchema),
  goals: z.array(GoalSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastActiveAt: z.date(),
});