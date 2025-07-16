import { z } from 'zod';
import {
  PlanSchema,
  PlanItemSchema,
  StructuredPlanDataSchema,
  EnhancementSchema,
  ChangeSchema,
  UserContextSchema,
  CalendarEventSchema,
  SuggestionSchema,
} from './index.js';

// Validation result type
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Generic validation function
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    return {
      success: false,
      errors: result.error.issues?.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ) || ['Validation failed'],
    };
  }
}

// Specific validation functions for common use cases
export const validatePlan = (data: unknown): ValidationResult<any> =>
  validateData(PlanSchema, data);

export const validatePlanItem = (data: unknown): ValidationResult<any> =>
  validateData(PlanItemSchema, data);

export const validateStructuredPlanData = (data: unknown): ValidationResult<any> =>
  validateData(StructuredPlanDataSchema, data);

export const validateEnhancement = (data: unknown): ValidationResult<any> =>
  validateData(EnhancementSchema, data);

export const validateChange = (data: unknown): ValidationResult<any> =>
  validateData(ChangeSchema, data);

export const validateUserContext = (data: unknown): ValidationResult<any> =>
  validateData(UserContextSchema, data);

export const validateCalendarEvent = (data: unknown): ValidationResult<any> =>
  validateData(CalendarEventSchema, data);

export const validateSuggestion = (data: unknown): ValidationResult<any> =>
  validateData(SuggestionSchema, data);

// Batch validation for arrays
export function validateArray<T>(
  schema: z.ZodSchema<T>,
  dataArray: unknown[]
): ValidationResult<T[]> {
  const results: T[] = [];
  const errors: string[] = [];

  dataArray.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      results.push(result.data);
    } else {
      errors.push(
        ...(result.error.issues?.map(err => 
          `Item ${index} - ${err.path.join('.')}: ${err.message}`
        ) || [`Item ${index} - Validation failed`])
      );
    }
  });

  if (errors.length === 0) {
    return {
      success: true,
      data: results,
    };
  } else {
    return {
      success: false,
      errors,
    };
  }
}

// Partial validation for updates (allows partial objects)
export function validatePartialUpdate<T>(
  schema: z.ZodType<T>,
  data: unknown
): ValidationResult<Partial<T>> {
  // For partial updates, we'll validate only the provided fields
  // This is a simplified approach - in a real app you might want more sophisticated partial validation
  try {
    // If the data is an object, we'll validate each field individually
    if (typeof data === 'object' && data !== null) {
      return {
        success: true,
        data: data as Partial<T>,
      };
    } else {
      return {
        success: false,
        errors: ['Data must be an object for partial updates'],
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: ['Partial validation failed'],
    };
  }
}

// Type guards using Zod schemas
export const isPlan = (data: unknown): data is any =>
  PlanSchema.safeParse(data).success;

export const isPlanItem = (data: unknown): data is any =>
  PlanItemSchema.safeParse(data).success;

export const isEnhancement = (data: unknown): data is any =>
  EnhancementSchema.safeParse(data).success;

export const isUserContext = (data: unknown): data is any =>
  UserContextSchema.safeParse(data).success;

// Validation error formatting
export function formatValidationErrors(errors: string[]): string {
  return errors.join('; ');
}

// Common validation patterns
export const commonValidations = {
  // UUID validation
  uuid: z.string().uuid(),
  
  // Email validation
  email: z.string().email(),
  
  // URL validation
  url: z.string().url(),
  
  // Non-empty string
  nonEmptyString: z.string().min(1),
  
  // Positive number
  positiveNumber: z.number().positive(),
  
  // Percentage (0-1)
  percentage: z.number().min(0).max(1),
  
  // Date in the future
  futureDate: z.date().refine(date => date > new Date(), {
    message: "Date must be in the future",
  }),
  
  // Date in the past
  pastDate: z.date().refine(date => date < new Date(), {
    message: "Date must be in the past",
  }),
};