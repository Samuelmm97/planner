// Export all plan-related types and schemas
export * from './plan.js';
export * from './enhancement.js';
export * from './user.js';
export * from './validation.js';

// Re-export commonly used types for convenience
export type {
  Plan,
  PlanItem,
  StructuredPlanData,
} from './plan.js';

export type {
  Enhancement,
  Change,
  CalendarEvent,
  Suggestion,
  ChangeOperation,
  EnhancementStatus,
} from './enhancement.js';

export type {
  UserContext,
  UserPreferences,
  AIAggressiveness,
  CalendarProvider,
  BehaviorPattern,
  PlanHistory,
} from './user.js';

// Re-export commonly used schemas
export {
  PlanSchema,
  PlanItemSchema,
  StructuredPlanDataSchema,
} from './plan.js';

export {
  EnhancementSchema,
  ChangeSchema,
  CalendarEventSchema,
  SuggestionSchema,
} from './enhancement.js';

export {
  UserContextSchema,
  UserPreferencesSchema,
} from './user.js';