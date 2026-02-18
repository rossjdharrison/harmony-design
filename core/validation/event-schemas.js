/**
 * @fileoverview Zod schemas for EventBus events
 * @module core/validation/event-schemas
 * 
 * Defines validation schemas for all events in the Harmony Design System.
 * Used by EventBus to validate event payloads at runtime.
 * 
 * Related: See DESIGN_SYSTEM.md § Event System
 */

import { z } from './zod-lite.js';

/**
 * Base event metadata schema
 */
export const EventMetadataSchema = z.object({
  timestamp: z.number(),
  source: z.string().optional(),
  correlationId: z.string().optional(),
});

/**
 * Playback command events
 */
export const PlayEventSchema = z.object({
  type: z.literal('audio:play'),
  payload: z.object({
    trackId: z.string().optional(),
    position: z.number().min(0).optional(),
  }),
  metadata: EventMetadataSchema.optional(),
});

export const PauseEventSchema = z.object({
  type: z.literal('audio:pause'),
  payload: z.object({}).optional(),
  metadata: EventMetadataSchema.optional(),
});

export const StopEventSchema = z.object({
  type: z.literal('audio:stop'),
  payload: z.object({}).optional(),
  metadata: EventMetadataSchema.optional(),
});

export const SeekEventSchema = z.object({
  type: z.literal('audio:seek'),
  payload: z.object({
    position: z.number().min(0),
  }),
  metadata: EventMetadataSchema.optional(),
});

/**
 * Playback state events
 */
export const PlaybackStartedEventSchema = z.object({
  type: z.literal('audio:playback-started'),
  payload: z.object({
    trackId: z.string(),
    duration: z.number().min(0),
  }),
  metadata: EventMetadataSchema.optional(),
});

export const PlaybackPausedEventSchema = z.object({
  type: z.literal('audio:playback-paused'),
  payload: z.object({
    position: z.number().min(0),
  }),
  metadata: EventMetadataSchema.optional(),
});

export const PlaybackStoppedEventSchema = z.object({
  type: z.literal('audio:playback-stopped'),
  payload: z.object({}).optional(),
  metadata: EventMetadataSchema.optional(),
});

export const PlaybackProgressEventSchema = z.object({
  type: z.literal('audio:playback-progress'),
  payload: z.object({
    position: z.number().min(0),
    duration: z.number().min(0),
    percentage: z.number().min(0).max(100),
  }),
  metadata: EventMetadataSchema.optional(),
});

/**
 * UI interaction events
 */
export const ButtonClickEventSchema = z.object({
  type: z.literal('ui:button-click'),
  payload: z.object({
    buttonId: z.string(),
    variant: z.enum(['primary', 'secondary', 'tertiary']).optional(),
  }),
  metadata: EventMetadataSchema.optional(),
});

export const ToggleChangeEventSchema = z.object({
  type: z.literal('ui:toggle-change'),
  payload: z.object({
    toggleId: z.string(),
    checked: z.boolean(),
  }),
  metadata: EventMetadataSchema.optional(),
});

export const SliderChangeEventSchema = z.object({
  type: z.literal('ui:slider-change'),
  payload: z.object({
    sliderId: z.string(),
    value: z.number(),
    min: z.number(),
    max: z.number(),
  }),
  metadata: EventMetadataSchema.optional(),
});

/**
 * Design token events
 */
export const TokenUpdatedEventSchema = z.object({
  type: z.literal('design:token-updated'),
  payload: z.object({
    tokenPath: z.string(),
    oldValue: z.string().optional(),
    newValue: z.string(),
  }),
  metadata: EventMetadataSchema.optional(),
});

export const ThemeChangedEventSchema = z.object({
  type: z.literal('design:theme-changed'),
  payload: z.object({
    theme: z.enum(['light', 'dark', 'auto']),
  }),
  metadata: EventMetadataSchema.optional(),
});

/**
 * Error events
 */
export const ErrorEventSchema = z.object({
  type: z.literal('system:error'),
  payload: z.object({
    message: z.string(),
    code: z.string().optional(),
    context: z.object({}).optional(),
    stack: z.string().optional(),
  }),
  metadata: EventMetadataSchema.optional(),
});

/**
 * Map of event types to their schemas
 */
export const EventSchemaRegistry = {
  'audio:play': PlayEventSchema,
  'audio:pause': PauseEventSchema,
  'audio:stop': StopEventSchema,
  'audio:seek': SeekEventSchema,
  'audio:playback-started': PlaybackStartedEventSchema,
  'audio:playback-paused': PlaybackPausedEventSchema,
  'audio:playback-stopped': PlaybackStoppedEventSchema,
  'audio:playback-progress': PlaybackProgressEventSchema,
  'ui:button-click': ButtonClickEventSchema,
  'ui:toggle-change': ToggleChangeEventSchema,
  'ui:slider-change': SliderChangeEventSchema,
  'design:token-updated': TokenUpdatedEventSchema,
  'design:theme-changed': ThemeChangedEventSchema,
  'system:error': ErrorEventSchema,
};

/**
 * Validate an event against its registered schema
 * @param {Object} event - Event to validate
 * @returns {{success: boolean, data?: Object, error?: Object}}
 */
export function validateEvent(event) {
  if (!event || !event.type) {
    return {
      success: false,
      error: { issues: [{ message: 'Event must have a type', path: [] }] }
    };
  }

  const schema = EventSchemaRegistry[event.type];
  if (!schema) {
    // Unknown event types are allowed but logged
    console.warn(`No schema registered for event type: ${event.type}`);
    return { success: true, data: event };
  }

  return schema.safeParse(event);
}