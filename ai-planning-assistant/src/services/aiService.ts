/**
 * AI Service for processing natural language input and enhancing plans
 * Provides interface for LLM integration with mock implementation
 */

import type {
  Plan,
  Enhancement,
  CalendarEvent,
  Suggestion,
  NaturalLanguageContent,
  StructuredPlanData,
  UserContext,
} from '../types/index.js';

// Additional interface for natural language input that includes language
export interface NaturalLanguageInput {
  text: string;
  language: string;
}

// Natural language processing result
export interface NaturalLanguageProcessingResult {
  structuredData: StructuredPlanData;
  confidence: number;
  extractedEntities: {
    dates?: Date[];
    times?: string[];
    locations?: string[];
    people?: string[];
    actions?: string[];
  };
  suggestedTitle?: string;
}

// AI processing options
export interface AIProcessingOptions {
  aggressiveness?: 'conservative' | 'moderate' | 'aggressive';
  includeScheduling?: boolean;
  includeCalendarEvents?: boolean;
  userContext?: UserContext;
}

// Error types for AI operations
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'API_ERROR' | 'PARSING_ERROR' | 'NETWORK_ERROR',
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// AI Service interface
export interface IAIService {
  processNaturalLanguage(
    input: NaturalLanguageContent,
    options?: AIProcessingOptions
  ): Promise<NaturalLanguageProcessingResult>;

  enhancePlan(
    plan: Plan,
    options?: AIProcessingOptions
  ): Promise<Enhancement[]>;

  generateCalendarEvents(
    plan: Plan,
    options?: AIProcessingOptions
  ): Promise<CalendarEvent[]>;

  generateSuggestions(
    plan: Plan,
    userContext?: UserContext
  ): Promise<Suggestion[]>;

  isHealthy(): Promise<boolean>;
}

// Mock AI Service implementation
export class MockAIService implements IAIService {
  private isOnline = true;
  private processingDelay = 500; // Simulate processing time

  constructor(
    private options: { simulateErrors?: boolean; delay?: number } = {}
  ) {
    this.processingDelay = options.delay ?? 500;
  }

  async processNaturalLanguage(
    input: NaturalLanguageContent,
    options?: AIProcessingOptions
  ): Promise<NaturalLanguageProcessingResult> {
    await this.simulateProcessing();

    if (this.options.simulateErrors && Math.random() < 0.1) {
      throw new AIServiceError('Simulated API error', 'API_ERROR', true);
    }

    // Basic natural language processing simulation
    // Handle both originalText and text properties for compatibility
    const text = (input.originalText || input.text || '').toLowerCase();
    const result: NaturalLanguageProcessingResult = {
      structuredData: this.extractStructuredData(text),
      confidence: this.calculateConfidence(text),
      extractedEntities: this.extractEntities(text),
      suggestedTitle: this.generateTitle(text),
    };

    return result;
  }

  async enhancePlan(
    plan: Plan,
    options?: AIProcessingOptions
  ): Promise<Enhancement[]> {
    await this.simulateProcessing();

    if (this.options.simulateErrors && Math.random() < 0.05) {
      throw new AIServiceError(
        'Enhancement processing failed',
        'PARSING_ERROR',
        true
      );
    }

    const enhancements: Enhancement[] = [];

    // Generate structure enhancement
    if (plan.structuredData.items.length > 0) {
      enhancements.push(this.generateStructureEnhancement(plan));
    }

    // Generate scheduling enhancement if requested
    if (options?.includeScheduling) {
      enhancements.push(this.generateScheduleEnhancement(plan));
    }

    return enhancements;
  }

  async generateCalendarEvents(
    plan: Plan,
    options?: AIProcessingOptions
  ): Promise<CalendarEvent[]> {
    await this.simulateProcessing();

    if (!options?.includeCalendarEvents) {
      return [];
    }

    const events: CalendarEvent[] = [];
    const now = new Date();

    // Generate events for time-sensitive plan items
    plan.structuredData.items.forEach((item, index) => {
      if (item.timing?.startTime || this.hasTimeReference(item.text)) {
        const startTime =
          item.timing?.startTime ||
          new Date(now.getTime() + (index + 1) * 24 * 60 * 60 * 1000);
        const endTime =
          item.timing?.endTime ||
          new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

        events.push({
          id: crypto.randomUUID(),
          planId: plan.id,
          planItemId: item.id,
          title: item.text,
          description: `Generated from plan: ${plan.title}`,
          startTime,
          endTime,
          status: 'pending',
        });
      }
    });

    return events;
  }

  async generateSuggestions(
    plan: Plan,
    userContext?: UserContext
  ): Promise<Suggestion[]> {
    await this.simulateProcessing();

    const suggestions: Suggestion[] = [];

    // Generate optimization suggestions
    if (plan.structuredData.items.length > 5) {
      suggestions.push({
        id: crypto.randomUUID(),
        planId: plan.id,
        type: 'optimization',
        title: 'Consider breaking down complex tasks',
        description:
          'Some of your plan items seem complex and could benefit from being broken into smaller, more manageable steps.',
        actionable: true,
        priority: 'medium',
        estimatedImpact: 'high',
        createdAt: new Date(),
        status: 'pending',
      });
    }

    // Generate scheduling suggestions
    const hasScheduling = plan.structuredData.items.some(
      (item) => item.timing?.startTime
    );
    if (!hasScheduling) {
      suggestions.push({
        id: crypto.randomUUID(),
        planId: plan.id,
        type: 'scheduling',
        title: 'Add time estimates to your tasks',
        description:
          'Adding time estimates and scheduling can help you better manage your plan execution.',
        actionable: true,
        priority: 'low',
        estimatedImpact: 'medium',
        createdAt: new Date(),
        status: 'pending',
      });
    }

    return suggestions;
  }

  async isHealthy(): Promise<boolean> {
    return this.isOnline;
  }

  // Simulate network/processing delay
  private async simulateProcessing(): Promise<void> {
    if (!this.isOnline) {
      throw new AIServiceError('AI service is offline', 'NETWORK_ERROR', true);
    }

    await new Promise((resolve) => setTimeout(resolve, this.processingDelay));
  }

  // Extract structured data from natural language text
  private extractStructuredData(text: string): StructuredPlanData {
    const items = this.extractPlanItems(text);
    const type = this.determinePlanType(text);
    const tags = this.extractTags(text);

    return {
      type,
      items,
      tags,
    };
  }

  // Extract individual plan items from text
  private extractPlanItems(text: string) {
    // Handle empty text
    if (!text.trim()) {
      return [];
    }

    // Simple extraction based on common patterns
    const lines = text.split('\n').filter((line) => line.trim());
    const items = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Check for list markers
        const cleanText = line
          .replace(/^[-*•]\s*/, '')
          .replace(/^\d+\.\s*/, '');

        // Skip if it's just a header or title (no list marker and first line)
        if (
          i === 0 &&
          !line.match(/^[-*•]\s*/) &&
          !line.match(/^\d+\.\s*/) &&
          lines.length > 1
        ) {
          continue;
        }

        items.push({
          id: crypto.randomUUID(),
          text: cleanText,
          type: this.determineItemType(cleanText),
          status: 'pending' as const,
          aiGenerated: false,
          order: items.length,
        });
      }
    }

    // If no clear items found, treat whole text as single item
    if (items.length === 0 && text.trim()) {
      items.push({
        id: crypto.randomUUID(),
        text: text.trim(),
        type: 'task' as const,
        status: 'pending' as const,
        aiGenerated: false,
        order: 0,
      });
    }

    return items;
  }

  // Determine plan type from content
  private determinePlanType(text: string): StructuredPlanData['type'] {
    const lowerText = text.toLowerCase();

    // Check for routine first (more specific patterns)
    if (
      lowerText.includes('routine') ||
      lowerText.includes('daily') ||
      lowerText.includes('morning routine') ||
      lowerText.includes('habit')
    ) {
      return 'routine';
    }
    if (
      lowerText.includes('workout') ||
      lowerText.includes('exercise') ||
      lowerText.includes('gym')
    ) {
      return 'workout';
    }
    if (
      lowerText.includes('meal') ||
      lowerText.includes('breakfast') ||
      lowerText.includes('lunch') ||
      lowerText.includes('dinner')
    ) {
      return 'meal';
    }
    if (
      lowerText.includes('schedule') ||
      lowerText.includes('meeting') ||
      lowerText.includes('appointment')
    ) {
      return 'schedule';
    }

    return 'custom';
  }

  // Determine item type from text
  private determineItemType(
    text: string
  ): 'task' | 'event' | 'note' | 'reminder' {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('remember') || lowerText.includes('remind')) {
      return 'reminder';
    }
    if (
      lowerText.includes('meeting') ||
      lowerText.includes('appointment') ||
      lowerText.includes('at ')
    ) {
      return 'event';
    }
    if (
      lowerText.includes('note:') ||
      lowerText.includes('note ') ||
      lowerText.startsWith('note')
    ) {
      return 'note';
    }

    return 'task';
  }

  // Extract tags from text
  private extractTags(text: string): string[] {
    const tags = [];
    const lowerText = text.toLowerCase();

    // Common tag patterns
    const tagPatterns = [
      'urgent',
      'important',
      'health',
      'work',
      'personal',
      'fitness',
      'nutrition',
      'learning',
      'social',
      'creative',
      'maintenance',
    ];

    tagPatterns.forEach((tag) => {
      if (lowerText.includes(tag)) {
        tags.push(tag);
      }
    });

    return tags;
  }

  // Calculate confidence score
  private calculateConfidence(text: string): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for structured text
    if (text.includes('\n') || text.includes('-') || text.includes('*')) {
      confidence += 0.2;
    }

    // Higher confidence for specific keywords
    const keywords = ['workout', 'meal', 'schedule', 'routine', 'task', 'goal'];
    const foundKeywords = keywords.filter((keyword) =>
      text.toLowerCase().includes(keyword)
    );
    confidence += foundKeywords.length * 0.1;

    // Lower confidence for very short or very long text
    if (text.length < 10) confidence -= 0.2;
    if (text.length > 1000) confidence -= 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Extract entities from text
  private extractEntities(text: string) {
    const entities: NaturalLanguageProcessingResult['extractedEntities'] = {};

    // Simple date extraction
    const datePatterns =
      /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})\b/gi;
    const dateMatches = text.match(datePatterns);
    if (dateMatches) {
      entities.dates = dateMatches
        .map((match) => this.parseDate(match))
        .filter(Boolean) as Date[];
    }

    // Simple time extraction
    const timePatterns = /\b(\d{1,2}:\d{2}\s*(am|pm)?|\d{1,2}\s*(am|pm))\b/gi;
    const timeMatches = text.match(timePatterns);
    if (timeMatches) {
      entities.times = timeMatches;
    }

    // Simple action extraction (verbs)
    const actionPatterns =
      /\b(run|walk|eat|drink|study|work|call|meet|buy|cook|clean|exercise)\b/gi;
    const actionMatches = text.match(actionPatterns);
    if (actionMatches) {
      entities.actions = [
        ...new Set(actionMatches.map((a) => a.toLowerCase())),
      ];
    }

    return entities;
  }

  // Generate title from text
  private generateTitle(text: string): string {
    const firstLine = text.split('\n')[0].trim();
    const words = firstLine.split(' ').slice(0, 6); // First 6 words
    let title = words.join(' ');

    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    return title || 'Untitled Plan';
  }

  // Check if text has time references
  private hasTimeReference(text: string): boolean {
    const timeKeywords = [
      'at',
      'by',
      'before',
      'after',
      'during',
      'am',
      'pm',
      ':',
      'morning',
      'afternoon',
      'evening',
    ];
    return timeKeywords.some((keyword) => text.toLowerCase().includes(keyword));
  }

  // Parse date string to Date object
  private parseDate(dateStr: string): Date | null {
    const now = new Date();
    const lowerStr = dateStr.toLowerCase();

    if (lowerStr === 'today') {
      return now;
    }
    if (lowerStr === 'tomorrow') {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    // Simple date parsing - in real implementation would use a proper date parsing library
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  // Generate structure enhancement
  private generateStructureEnhancement(plan: Plan): Enhancement {
    return {
      id: crypto.randomUUID(),
      planId: plan.id,
      type: 'structure',
      changes: [
        {
          operation: 'modify',
          target: 'structuredData.items',
          oldValue: plan.structuredData.items,
          newValue: plan.structuredData.items.map((item) => ({
            ...item,
            category: this.suggestCategory(item.text),
          })),
          description: 'Added categories to plan items for better organization',
          confidence: 0.8,
        },
      ],
      confidence: 0.8,
      reasoning: 'Plan items can be better organized with categories',
      status: 'pending',
      createdAt: new Date(),
    };
  }

  // Generate schedule enhancement
  private generateScheduleEnhancement(plan: Plan): Enhancement {
    const now = new Date();
    const scheduledItems = plan.structuredData.items.map((item, index) => ({
      ...item,
      timing: {
        ...item.timing,
        duration: 30, // 30 minutes default
        startTime: new Date(now.getTime() + (index + 1) * 60 * 60 * 1000), // Spread over hours
        endTime: new Date(
          now.getTime() + (index + 1) * 60 * 60 * 1000 + 30 * 60 * 1000
        ), // Add 30 minutes
      },
    }));

    return {
      id: crypto.randomUUID(),
      planId: plan.id,
      type: 'schedule',
      changes: [
        {
          operation: 'modify',
          target: 'structuredData.items',
          oldValue: plan.structuredData.items,
          newValue: scheduledItems,
          description: 'Added time estimates and scheduling to plan items',
          confidence: 0.7,
        },
      ],
      confidence: 0.7,
      reasoning: 'Adding time structure can improve plan execution',
      status: 'pending',
      createdAt: new Date(),
    };
  }

  // Suggest category for item
  private suggestCategory(text: string): string {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('exercise') ||
      lowerText.includes('workout') ||
      lowerText.includes('run')
    ) {
      return 'fitness';
    }
    if (
      lowerText.includes('eat') ||
      lowerText.includes('meal') ||
      lowerText.includes('cook')
    ) {
      return 'nutrition';
    }
    if (
      lowerText.includes('work') ||
      lowerText.includes('meeting') ||
      lowerText.includes('project')
    ) {
      return 'work';
    }
    if (
      lowerText.includes('learn') ||
      lowerText.includes('study') ||
      lowerText.includes('read')
    ) {
      return 'learning';
    }

    return 'general';
  }

  // Test utilities
  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  setProcessingDelay(delay: number): void {
    this.processingDelay = delay;
  }
}

// Real AI Service implementation (placeholder for actual LLM integration)
export class RealAIService implements IAIService {
  constructor(
    private config: {
      apiKey: string;
      baseUrl: string;
      model: string;
      maxRetries: number;
    }
  ) {}

  async processNaturalLanguage(
    input: NaturalLanguageContent,
    options?: AIProcessingOptions
  ): Promise<NaturalLanguageProcessingResult> {
    // TODO: Implement actual LLM API integration
    throw new Error('Real AI service not implemented yet');
  }

  async enhancePlan(
    plan: Plan,
    options?: AIProcessingOptions
  ): Promise<Enhancement[]> {
    // TODO: Implement actual LLM API integration
    throw new Error('Real AI service not implemented yet');
  }

  async generateCalendarEvents(
    plan: Plan,
    options?: AIProcessingOptions
  ): Promise<CalendarEvent[]> {
    // TODO: Implement actual LLM API integration
    throw new Error('Real AI service not implemented yet');
  }

  async generateSuggestions(
    plan: Plan,
    userContext?: UserContext
  ): Promise<Suggestion[]> {
    // TODO: Implement actual LLM API integration
    throw new Error('Real AI service not implemented yet');
  }

  async isHealthy(): Promise<boolean> {
    // TODO: Implement health check
    return false;
  }
}

// AI Service with retry logic
export class AIServiceWithRetry implements IAIService {
  constructor(
    private baseService: IAIService,
    private maxRetries: number = 3,
    private baseDelay: number = 1000
  ) {}

  async processNaturalLanguage(
    input: NaturalLanguageContent,
    options?: AIProcessingOptions
  ): Promise<NaturalLanguageProcessingResult> {
    return this.withRetry(() =>
      this.baseService.processNaturalLanguage(input, options)
    );
  }

  async enhancePlan(
    plan: Plan,
    options?: AIProcessingOptions
  ): Promise<Enhancement[]> {
    return this.withRetry(() => this.baseService.enhancePlan(plan, options));
  }

  async generateCalendarEvents(
    plan: Plan,
    options?: AIProcessingOptions
  ): Promise<CalendarEvent[]> {
    return this.withRetry(() =>
      this.baseService.generateCalendarEvents(plan, options)
    );
  }

  async generateSuggestions(
    plan: Plan,
    userContext?: UserContext
  ): Promise<Suggestion[]> {
    return this.withRetry(() =>
      this.baseService.generateSuggestions(plan, userContext)
    );
  }

  async isHealthy(): Promise<boolean> {
    return this.baseService.isHealthy();
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry non-retryable errors
        if (error instanceof AIServiceError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

// Export singleton instances
export const mockAIService = new MockAIService();
export const aiServiceWithRetry = new AIServiceWithRetry(mockAIService);

// Default export for easy importing
export const aiService = aiServiceWithRetry;
