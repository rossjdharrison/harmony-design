/**
 * Tests for EventBus development mode integration
 * 
 * @module harmony-core/event-bus/__tests__/event-bus-with-dev-mode.test
 */

import { enhanceEventBusWithDevMode, ensureHasSubscribersMethod } from '../event-bus-with-dev-mode.js';
import { SchemaViolationError, MissingSubscriberError, enableDevMode, disableDevMode } from '../dev-mode.js';

describe('EventBus Development Mode Enhancement', () => {
  let mockEventBus;
  let mockValidate;
  
  beforeEach(() => {
    mockEventBus = {
      emit: jest.fn(),
      subscribers: {},
      hasSubscribers: jest.fn((eventType) => {
        return mockEventBus.subscribers[eventType]?.length > 0;
      })
    };
    
    mockValidate = jest.fn((eventType, payload) => ({
      valid: true,
      errors: []
    }));
    
    enableDevMode();
  });
  
  afterEach(() => {
    disableDevMode();
  });
  
  test('enhances emit method', () => {
    const originalEmit = mockEventBus.emit;
    enhanceEventBusWithDevMode(mockEventBus, mockValidate);
    
    expect(mockEventBus.emit).not.toBe(originalEmit);
  });
  
  test('calls validation on emit', () => {
    mockEventBus.subscribers['TestEvent'] = [jest.fn()];
    enhanceEventBusWithDevMode(mockEventBus, mockValidate);
    
    mockEventBus.emit('TestEvent', { data: 'test' }, 'TestComponent');
    
    expect(mockValidate).toHaveBeenCalledWith('TestEvent', { data: 'test' });
  });
  
  test('throws on schema violation in dev mode', () => {
    mockValidate.mockReturnValue({
      valid: false,
      errors: ['Invalid field']
    });
    
    enhanceEventBusWithDevMode(mockEventBus, mockValidate);
    
    expect(() => {
      mockEventBus.emit('TestEvent', { invalid: 'data' }, 'TestComponent');
    }).toThrow(SchemaViolationError);
  });
  
  test('throws on missing subscribers in dev mode', () => {
    mockEventBus.subscribers = {};
    mockEventBus.hasSubscribers.mockReturnValue(false);
    
    enhanceEventBusWithDevMode(mockEventBus, mockValidate);
    
    expect(() => {
      mockEventBus.emit('TestEvent', { data: 'test' }, 'TestComponent');
    }).toThrow(MissingSubscriberError);
  });
  
  test('allows valid events with subscribers', () => {
    mockEventBus.subscribers['TestEvent'] = [jest.fn()];
    const originalEmit = mockEventBus.emit;
    
    enhanceEventBusWithDevMode(mockEventBus, mockValidate);
    
    expect(() => {
      mockEventBus.emit('TestEvent', { data: 'test' }, 'TestComponent');
    }).not.toThrow();
    
    expect(originalEmit).toHaveBeenCalled();
  });
});

describe('ensureHasSubscribersMethod', () => {
  test('adds hasSubscribers if missing', () => {
    const eventBus = {
      subscribers: {
        'TestEvent': [jest.fn()]
      }
    };
    
    ensureHasSubscribersMethod(eventBus);
    
    expect(eventBus.hasSubscribers).toBeDefined();
    expect(eventBus.hasSubscribers('TestEvent')).toBe(true);
    expect(eventBus.hasSubscribers('MissingEvent')).toBe(false);
  });
  
  test('does not override existing hasSubscribers', () => {
    const customHasSubscribers = jest.fn();
    const eventBus = {
      hasSubscribers: customHasSubscribers
    };
    
    ensureHasSubscribersMethod(eventBus);
    
    expect(eventBus.hasSubscribers).toBe(customHasSubscribers);
  });
  
  test('handles _subscribers property', () => {
    const eventBus = {
      _subscribers: {
        'TestEvent': [jest.fn()]
      }
    };
    
    ensureHasSubscribersMethod(eventBus);
    
    expect(eventBus.hasSubscribers('TestEvent')).toBe(true);
  });
});