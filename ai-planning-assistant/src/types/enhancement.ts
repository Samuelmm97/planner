import { z } from 'zod';

// Change operation types
export type ChangeOperation = 'add' | 'modify' | 'remove';
export type EnhancementStatus = 'pending' | 'approved' | 'rejected';

export const ChangeOperationSchema = z.enum(['add', 'modify', 'remove']);
export const EnhancementStatusSchema = z.enum(['pending', 'approved', 'rejected']);

// Change interface
export interface Change {
  operation: ChangeOperation;
  target: string; // path to the element being changed (e.g., "items.0.text", "schedule.startDate")
  oldValue?: any;
  newValue: any;
  description: string;
  confidence?: number; // 0-1, AI confidence in this change
}

export const ChangeSchema = z.object({
  operation: ChangeOperationSchema,
  target: z.string().min(1),
  oldValue: z.any().optional(),
  newValue: z.any(),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

// Enhancement interface
export interface Enhancement {
  id: string;
  planId: string;
  type: 'structure' | 'schedule' | 'categorization' | 'optimization';
  changes: Change[];
  confidence: number; // 0-1, overall confidence in enhancement
  reasoning: string;
  status: EnhancementStatus;
  createdAt: Date;
  appliedAt?: Date;
  rejectedAt?: Date;
  userFeedback?: string;
}

export const EnhancementSchema = z.object({
  id: z.string(),
  planId: z.string(),
  type: z.enum(['structure', 'schedule', 'categorization', 'optimization']),
  changes: z.array(ChangeSchema),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  status: EnhancementStatusSchema,
  createdAt: z.date(),
  appliedAt: z.date().optional(),
  rejectedAt: z.date().optional(),
  userFeedback: z.string().optional(),
});

// Calendar Event interface for AI-generated calendar entries
export interface CalendarEvent {
  id: string;
  planId: string;
  planItemId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
  status: 'pending' | 'approved' | 'rejected' | 'synced';
  calendarProvider?: string; // 'google', 'outlook', etc.
  externalId?: string; // ID from external calendar service
}

export const CalendarEventSchema = z.object({
  id: z.string(),
  planId: z.string(),
  planItemId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  recurrence: z.object({
    pattern: z.enum(['daily', 'weekly', 'monthly']),
    interval: z.number().positive(),
    endDate: z.date().optional(),
  }).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'synced']),
  calendarProvider: z.string().optional(),
  externalId: z.string().optional(),
});

// Suggestion interface for AI recommendations
export interface Suggestion {
  id: string;
  planId: string;
  type: 'optimization' | 'scheduling' | 'breakdown' | 'motivation';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: 'low' | 'medium' | 'high';
  createdAt: Date;
  status: 'pending' | 'accepted' | 'dismissed';
}

export const SuggestionSchema = z.object({
  id: z.string(),
  planId: z.string(),
  type: z.enum(['optimization', 'scheduling', 'breakdown', 'motivation']),
  title: z.string().min(1),
  description: z.string().min(1),
  actionable: z.boolean(),
  priority: z.enum(['low', 'medium', 'high']),
  estimatedImpact: z.enum(['low', 'medium', 'high']),
  createdAt: z.date(),
  status: z.enum(['pending', 'accepted', 'dismissed']),
});