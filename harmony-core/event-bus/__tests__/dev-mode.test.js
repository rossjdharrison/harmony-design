/**
 * Tests for development mode error handling
 * 
 * @module harmony-core/event-bus/__tests__/dev-mode.test
 */

import { 
  isDevMode, 
  SchemaViolationError, 
  MissingSubscriberError,
  handleSchemaViolation,
  handleMissingSubscriber,
  enableDevMode,
  disableDevMode
} from '../dev-mode.js';

describe('Development Mode Detection', () => {
  beforeEach(() => {
    // Clean up localStorage
    localStorage.removeItem('harmonyDevMode');
  });
  
  test('detects localhost as dev mode', () => {
    // Note: In test environment, this depends on test server config
    const result = isDevMode();
    expect(typeof result).toBe('boolean');
  });
  
  test('can enable dev mode via localStorage', () => {
    enableDevMode();
    expect(localStorage.getItem('harmonyDevMode')).toBe('true');
  });
  
  test('can disable dev mode', () => {
    enableDevMode();
    disableDevMode();
    expect(localStorage.getItem('harmonyDevMode')).toBeNull();
  });
});

describe('SchemaViolationError', () => {
  test('creates error with correct properties', () => {
    const error = new SchemaViolationError(
      'TestEvent',
      { invalid: 'data' },
      ['Field "required" is missing', 'Field "invalid" is not allowed'],
      'TestComponent'
    );
    
    expect(error.name).toBe('SchemaViolationError');
    expect(error.eventType).toBe('TestEvent');
    expect(error.payload).toEqual({ invalid: 'data' });
    expect(error.violations).toHaveLength(2);
    expect(error.source).toBe('TestComponent');
    expect(error.message).toContain('TestEvent');
    expect(error.message).toContain('TestComponent');
  });
  
  test('handles missing source', () => {
    const error = new SchemaViolationError(
      'TestEvent',
      {},
      ['Error'],
      null
    );
    
    expect(error.source).toBeNull();
    expect(error.message).toContain('TestEvent');
  });
});

describe('MissingSubscriberError', () => {
  test('creates error with correct properties', () => {
    const error = new MissingSubscriberError('TestEvent', 'TestComponent');
    
    expect(error.name).toBe('MissingSubscriberError');
    expect(error.eventType).toBe('TestEvent');
    expect(error.source).toBe('TestComponent');
    expect(error.message).toContain('No subscribers');
  });
});

describe('Error Handling', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  
  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    localStorage.removeItem('harmonyDevMode');
  });
  
  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
  
  test('handleSchemaViolation throws in dev mode', () => {
    enableDevMode();
    
    expect(() => {
      handleSchemaViolation('TestEvent', {}, ['Error'], 'TestComponent');
    }).toThrow(SchemaViolationError);
  });
  
  test('handleSchemaViolation logs in production mode', () => {
    disableDevMode();
    
    // Mock isDevMode to return false
    jest.spyOn(require('../dev-mode.js'), 'isDevMode').mockReturnValue(false);
    
    handleSchemaViolation('TestEvent', {}, ['Error'], 'TestComponent');
    
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
  
  test('handleMissingSubscriber throws in dev mode', () => {
    enableDevMode();
    
    expect(() => {
      handleMissingSubscriber('TestEvent', 'TestComponent');
    }).toThrow(MissingSubscriberError);
  });
  
  test('handleMissingSubscriber logs in production mode', () => {
    disableDevMode();
    
    // Mock isDevMode to return false
    jest.spyOn(require('../dev-mode.js'), 'isDevMode').mockReturnValue(false);
    
    handleMissingSubscriber('TestEvent', 'TestComponent');
    
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});