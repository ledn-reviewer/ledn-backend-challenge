import logger from './logger';

/**
 * Interface for event data
 */
export interface EventData {
  id: string;
  type: string;
  direction: 'INBOUND' | 'OUTBOUND';
  data: Record<string, any>;
  timestamp: string;
}

/**
 * Event History Store
 * Stores events in memory for the application lifecycle
 */
export class EventHistoryStore {
  private static instance: EventHistoryStore;
  private events: EventData[] = [];
  private maxInMemoryEvents: number;

  private constructor(options?: {
    maxInMemoryEvents?: number;
  }) {
    this.maxInMemoryEvents = options?.maxInMemoryEvents || 1000;
  }

  public static getInstance(options?: {
    maxInMemoryEvents?: number;
  }): EventHistoryStore {
    if (!EventHistoryStore.instance) {
      EventHistoryStore.instance = new EventHistoryStore(options);
    }
    return EventHistoryStore.instance;
  }

  /**
   * Add an event to the store
   */
  public addEvent(event: EventData): void {
    // Add to memory
    this.events.push(event);

    // Trim if needed
    if (this.events.length > this.maxInMemoryEvents) {
      this.events = this.events.slice(-this.maxInMemoryEvents);
    }

    logger.debug({ event }, 'Event added to history');
  }

  /**
   * Get all events (optionally filtered)
   */
  public getEvents(filter?: {
    type?: string;
    direction?: 'INBOUND' | 'OUTBOUND';
    fromTimestamp?: string;
  }): EventData[] {
    if (!filter) {
      return [...this.events];
    }

    return this.events.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.direction && event.direction !== filter.direction) return false;
      if (filter.fromTimestamp && event.timestamp < filter.fromTimestamp) return false;
      return true;
    });
  }

  /**
   * Get event by ID
   */
  public getEventById(id: string): EventData | undefined {
    return this.events.find(event => event.id === id);
  }

  /**
   * Clear all events (for testing)
   */
  public clear(): void {
    this.events = [];
  }
}
