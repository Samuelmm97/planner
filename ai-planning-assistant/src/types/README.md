# Data Models and Type Definitions

This directory contains all TypeScript interfaces, types, and Zod validation schemas for the AI Planning Assistant application.

## Overview

The data models are organized into three main categories:

- **Plan Models** (`plan.ts`) - Core planning data structures
- **Enhancement Models** (`enhancement.ts`) - AI-generated changes and suggestions
- **User Models** (`user.ts`) - User preferences and behavior tracking

## Core Models

### Plan
The main data structure representing a user's plan:
```typescript
interface Plan {
  id: string;
  userId: string;
  title: string;
  content: NaturalLanguageContent;
  structuredData: StructuredPlanData;
  metadata: PlanMetadata;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### PlanItem
Individual items within a plan:
```typescript
interface PlanItem {
  id: string;
  text: string;
  type: 'task' | 'event' | 'note' | 'reminder';
  timing?: TimingInfo;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  aiGenerated: boolean;
  order: number;
}
```

### Enhancement
AI-generated suggestions for plan improvements:
```typescript
interface Enhancement {
  id: string;
  planId: string;
  type: 'structure' | 'schedule' | 'categorization' | 'optimization';
  changes: Change[];
  confidence: number;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}
```

### UserContext
User preferences and behavioral data:
```typescript
interface UserContext {
  userId: string;
  preferences: UserPreferences;
  planHistory: PlanHistory[];
  behaviorPatterns: BehaviorPattern[];
  goals: Goal[];
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}
```

## Validation

All models include corresponding Zod schemas for runtime validation:

```typescript
import { PlanSchema, validatePlan } from './types';

// Validate a plan object
const result = validatePlan(planData);
if (result.success) {
  console.log('Valid plan:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

## Utility Functions

The `validation.ts` file provides helper functions for common validation tasks:

- `validatePlan()` - Validate plan objects
- `validateArray()` - Validate arrays of objects
- `validatePartialUpdate()` - Validate partial updates
- Type guards: `isPlan()`, `isPlanItem()`, etc.
- Common validation patterns for UUIDs, emails, dates, etc.

## Usage Examples

### Creating a New Plan
```typescript
import { Plan, PlanSchema } from './types';

const newPlan: Plan = {
  id: crypto.randomUUID(),
  userId: 'user-123',
  title: 'Morning Routine',
  content: {
    originalText: 'I want to create a morning routine with exercise and meditation',
  },
  structuredData: {
    type: 'routine',
    items: [],
    tags: ['morning', 'health'],
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

// Validate before saving
const validation = PlanSchema.safeParse(newPlan);
if (validation.success) {
  // Save to database
}
```

### Working with Enhancements
```typescript
import { Enhancement, ChangeOperation } from './types';

const enhancement: Enhancement = {
  id: crypto.randomUUID(),
  planId: 'plan-123',
  type: 'structure',
  changes: [
    {
      operation: 'modify',
      target: 'items.0.text',
      oldValue: 'Exercise',
      newValue: 'Exercise for 30 minutes',
      description: 'Added specific duration',
    },
  ],
  confidence: 0.85,
  reasoning: 'Added specific durations to make tasks more actionable',
  status: 'pending',
  createdAt: new Date(),
};
```

## Testing

All models include comprehensive unit tests in the `__tests__` directory. Run tests with:

```bash
npm test -- src/types/__tests__
```

## Requirements Mapping

These data models fulfill the following requirements:

- **1.1, 1.3**: Natural language input processing and plan persistence
- **2.1**: AI enhancement and structuring capabilities  
- **4.1**: Persistent plan elements in UI
- **Requirements coverage**: All models support the core functionality outlined in the requirements document