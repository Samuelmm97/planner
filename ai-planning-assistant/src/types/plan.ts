import { z } from 'zod';

// Enums and basic types
export type PlanType = 'routine' | 'meal' | 'workout' | 'schedule' | 'custom';
export type ItemType = 'task' | 'event' | 'note' | 'reminder';
export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type EnhancementType = 'structure' | 'schedule' | 'categorization' | 'optimization';

// Zod schemas for validation
export const PlanTypeSchema = z.enum(['routine', 'meal', 'workout', 'schedule', 'custom']);
export const ItemTypeSchema = z.enum(['task', 'event', 'note', 'reminder']);
export const ItemStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export const EnhancementTypeSchema = z.enum(['structure', 'schedule', 'categorization', 'optimization']);

// Timing and Schedule interfaces
export interface TimingInfo {
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in minutes
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number;
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    endDate?: Date;
  };
}

export const TimingInfoSchema = z.object({
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  duration: z.number().positive().optional(),
  recurrence: z.object({
    pattern: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    interval: z.number().positive(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    endDate: z.date().optional(),
  }).optional(),
});

export interface ScheduleInfo {
  startDate: Date;
  endDate?: Date;
  timeZone: string;
  flexibility: 'strict' | 'moderate' | 'flexible';
}

export const ScheduleInfoSchema = z.object({
  startDate: z.date(),
  endDate: z.date().optional(),
  timeZone: z.string(),
  flexibility: z.enum(['strict', 'moderate', 'flexible']),
});

export interface Goal {
  id: string;
  description: string;
  targetDate?: Date;
  priority: 'low' | 'medium' | 'high';
  measurable: boolean;
}

export const GoalSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  targetDate: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  measurable: z.boolean(),
});

// Plan Item interface
export interface PlanItem {
  id: string;
  text: string;
  type: ItemType;
  timing?: TimingInfo;
  status: ItemStatus;
  aiGenerated: boolean;
  parentId?: string; // for nested items
  order: number;
}

export const PlanItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  type: ItemTypeSchema,
  timing: TimingInfoSchema.optional(),
  status: ItemStatusSchema,
  aiGenerated: z.boolean(),
  parentId: z.string().optional(),
  order: z.number(),
});

// Structured Plan Data interface
export interface StructuredPlanData {
  type: PlanType;
  items: PlanItem[];
  schedule?: ScheduleInfo;
  goals?: Goal[];
  tags: string[];
  category?: string;
  estimatedDuration?: number; // in minutes
}

export const StructuredPlanDataSchema = z.object({
  type: PlanTypeSchema,
  items: z.array(PlanItemSchema),
  schedule: ScheduleInfoSchema.optional(),
  goals: z.array(GoalSchema).optional(),
  tags: z.array(z.string()),
  category: z.string().optional(),
  estimatedDuration: z.number().positive().optional(),
});

// Plan Metadata interface
export interface PlanMetadata {
  source: 'user_input' | 'ai_generated' | 'imported';
  language: string;
  complexity: 'simple' | 'moderate' | 'complex';
  lastAiProcessed?: Date;
  processingVersion?: string;
}

export const PlanMetadataSchema = z.object({
  source: z.enum(['user_input', 'ai_generated', 'imported']),
  language: z.string(),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  lastAiProcessed: z.date().optional(),
  processingVersion: z.string().optional(),
});

// Natural Language Content interface
export interface NaturalLanguageContent {
  originalText: string;
  processedText?: string;
  confidence?: number; // 0-1, confidence in AI processing
  ambiguities?: string[]; // areas that need clarification
}

export const NaturalLanguageContentSchema = z.object({
  originalText: z.string().min(1),
  processedText: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  ambiguities: z.array(z.string()).optional(),
});

// Main Plan interface
export interface Plan {
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

export const PlanSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1),
  content: NaturalLanguageContentSchema,
  structuredData: StructuredPlanDataSchema,
  metadata: PlanMetadataSchema,
  version: z.number().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
});