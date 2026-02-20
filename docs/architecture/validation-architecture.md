# Validation Architecture

**Status:** Active  
**Last Updated:** 2025-01-XX  
**Owner:** Architecture Team

## Overview

This document defines validation responsibilities across the three primary layers of the Harmony Design System: UI Layer, Configuration Layer, and Bounded Context Layer. Each layer has distinct validation concerns and responsibilities to ensure data integrity, user experience, and system reliability.

## Validation Layers

### 1. UI Layer Validation

**Purpose:** Immediate user feedback and basic input sanitization

**Responsibilities:**
- Input format validation (e.g., email format, number ranges)
- Required field checking
- Real-time feedback during user interaction
- Client-side constraint validation (min/max, pattern matching)
- Visual error state management
- Accessibility announcements for validation errors

**Implementation Location:**
- `harmony-web-components/` - Web Component validators
- `primitives/` - Primitive component validation logic
- `components/` - Composite component validation orchestration

**Validation Timing:**
- `onInput` - Real-time validation as user types
- `onBlur` - Field-level validation when focus leaves
- `onSubmit` - Form-level validation before event publication

**Rules:**
- MUST NOT perform business logic validation
- MUST NOT make network requests for validation
- MUST provide immediate visual feedback (<100ms)
- MUST publish validation events, not call BCs directly
- MUST use Web Component constraint validation API

**Example Event Pattern:**
```javascript
// UI publishes validation request
eventBus.publish('validation:request', {
  field: 'tempo',
  value: 120,
  constraints: { min: 20, max: 999 }
});

// UI listens for validation response
eventBus.subscribe('validation:response', (result) => {
  if (!result.valid) {
    showError(result.errors);
  }
});
```

**Related Files:**
- `harmony-web-components/form-field.js` - Base field validation
- `primitives/input/input-validator.js` - Input validation utilities
- `core/validation/ui-validators.js` - Reusable UI validators

---

### 2. Configuration Layer Validation

**Purpose:** Schema conformance and cross-field validation

**Responsibilities:**
- JSON Schema validation against defined schemas
- Type checking and coercion
- Cross-field dependency validation
- Configuration completeness checking
- Default value application
- Migration validation for schema versions

**Implementation Location:**
- `harmony-schemas/` - JSON Schema definitions (Rust)
- `config/validators/` - Configuration validation logic
- `core/schema-validator.js` - Runtime schema validation

**Validation Timing:**
- On configuration load from storage
- Before configuration save to storage
- During configuration import/export
- On schema migration

**Rules:**
- MUST validate against JSON Schema definitions
- MUST handle schema version migrations
- MUST provide detailed error paths (e.g., `config.audio.sampleRate`)
- MUST NOT perform I/O operations during validation
- MUST be synchronous for performance

**Schema Definition Pattern:**
```rust
// In harmony-schemas/src/config/audio_config.rs
pub struct AudioConfig {
    #[validate(range(min = 44100, max = 192000))]
    pub sample_rate: u32,
    
    #[validate(range(min = 64, max = 8192))]
    pub buffer_size: u32,
}
```

**Related Files:**
- `harmony-schemas/src/config/` - Schema definitions
- `config/validators/schema-validator.js` - Schema validation runtime
- `core/config-loader.js` - Configuration loading with validation

---

### 3. Bounded Context Layer Validation

**Purpose:** Business logic validation and domain rules

**Responsibilities:**
- Domain-specific business rules
- State transition validation
- Resource availability checking
- Permission and authorization validation
- Consistency validation across aggregates
- Temporal validation (e.g., scheduling conflicts)

**Implementation Location:**
- `bounded-contexts/*/validators/` - Domain-specific validators
- `harmony-dev/crates/*/validation/` - Rust validation logic
- `workers/*-worker.js` - WASM-based validation

**Validation Timing:**
- Before command execution
- During state transitions
- Before event publication
- On aggregate persistence

**Rules:**
- MUST validate business invariants
- MUST be idempotent (same input → same result)
- MUST NOT depend on UI state
- MUST publish validation failure events
- MUST log validation failures with context

**Command Validation Pattern:**
```javascript
// BC receives command via EventBus
eventBus.subscribe('audio:play', async (command) => {
  // 1. Validate command structure
  const structureValid = validateCommandStructure(command);
  if (!structureValid.valid) {
    eventBus.publish('audio:play:failed', {
      reason: 'invalid_command',
      errors: structureValid.errors
    });
    return;
  }
  
  // 2. Validate business rules
  const businessValid = await validatePlaybackRules(command);
  if (!businessValid.valid) {
    eventBus.publish('audio:play:failed', {
      reason: 'business_rule_violation',
      errors: businessValid.errors
    });
    return;
  }
  
  // 3. Execute command
  const result = await executePlay(command);
  eventBus.publish('audio:play:success', result);
});
```

**Related Files:**
- `bounded-contexts/audio/validators/playback-validator.js`
- `bounded-contexts/composition/validators/track-validator.js`
- `harmony-dev/crates/audio_bc/src/validation.rs`

---

## Validation Flow

### Complete Validation Pipeline

```
User Input
    ↓
[UI Layer Validation]
    ├─ Format check
    ├─ Required fields
    └─ Client constraints
    ↓
UI publishes event
    ↓
[Config Layer Validation]
    ├─ Schema conformance
    ├─ Type checking
    └─ Cross-field rules
    ↓
EventBus routes to BC
    ↓
[BC Layer Validation]
    ├─ Business rules
    ├─ State transitions
    └─ Domain invariants
    ↓
Command Execution
```

### Example: Tempo Change Validation

**UI Layer:**
```javascript
// primitives/tempo-input.js
validateInput(value) {
  // Format: must be a number
  if (isNaN(value)) return { valid: false, error: 'Must be a number' };
  
  // Range: 20-999 BPM
  if (value < 20 || value > 999) {
    return { valid: false, error: 'Tempo must be between 20 and 999 BPM' };
  }
  
  return { valid: true };
}
```

**Config Layer:**
```javascript
// config/validators/tempo-validator.js
validateTempoConfig(config) {
  const schema = {
    type: 'object',
    properties: {
      tempo: { type: 'number', minimum: 20, maximum: 999 },
      timeSignature: { type: 'string', pattern: '^\\d+/\\d+$' }
    },
    required: ['tempo', 'timeSignature']
  };
  
  return validateSchema(config, schema);
}
```

**BC Layer:**
```javascript
// bounded-contexts/composition/validators/tempo-validator.js
async validateTempoChange(command) {
  const { tempo, trackId } = command.payload;
  
  // Business rule: Tempo change during recording is not allowed
  const track = await getTrack(trackId);
  if (track.isRecording) {
    return {
      valid: false,
      error: 'Cannot change tempo during recording',
      code: 'TEMPO_CHANGE_WHILE_RECORDING'
    };
  }
  
  // Business rule: Automation conflicts
  if (track.hasTempoAutomation) {
    return {
      valid: false,
      error: 'Track has tempo automation. Disable automation first.',
      code: 'TEMPO_AUTOMATION_CONFLICT'
    };
  }
  
  return { valid: true };
}
```

---

## Validation Error Handling

### Error Structure

All validation errors follow a consistent structure:

```typescript
interface ValidationError {
  valid: boolean;
  errors?: Array<{
    field: string;          // Field path (e.g., 'config.audio.sampleRate')
    message: string;        // Human-readable error message
    code: string;           // Machine-readable error code
    context?: any;          // Additional context for debugging
  }>;
}
```

### Error Propagation

**UI Layer Errors:**
- Display inline with form field
- Announce via ARIA live region
- Prevent form submission
- Do NOT publish events for invalid data

**Config Layer Errors:**
- Log to console with full context
- Show notification to user
- Revert to last valid configuration
- Trigger recovery flow if needed

**BC Layer Errors:**
- Publish failure event with error details
- Log to EventBus error stream
- Update UI via event subscription
- Maintain system consistency

---

## Performance Considerations

### UI Layer
- **Target:** <16ms validation time (single frame)
- **Strategy:** Synchronous, in-memory checks only
- **Debouncing:** 300ms for expensive validations (e.g., regex)

### Config Layer
- **Target:** <50ms validation time
- **Strategy:** Synchronous schema validation
- **Caching:** Cache compiled schemas

### BC Layer
- **Target:** <100ms validation time
- **Strategy:** Asynchronous, can query state
- **Optimization:** Use WASM for complex validation logic

---

## Testing Requirements

### UI Layer Tests
- Test all input constraints
- Test error message display
- Test accessibility announcements
- Test debouncing behavior

### Config Layer Tests
- Test schema conformance
- Test migration paths
- Test error path reporting
- Test default value application

### BC Layer Tests
- Test all business rules
- Test state transition guards
- Test error event publication
- Test validation idempotence

**Test Location:**
- `tests/validation/ui-validation.test.js`
- `tests/validation/config-validation.test.js`
- `tests/validation/bc-validation.test.js`

---

## Integration with EventBus

All validation across layers integrates with the EventBus for consistency:

```javascript
// Validation request pattern
eventBus.publish('validation:request', {
  layer: 'ui' | 'config' | 'bc',
  validator: 'tempo-validator',
  data: { /* data to validate */ }
});

// Validation response pattern
eventBus.subscribe('validation:response', (result) => {
  if (result.valid) {
    // Proceed with operation
  } else {
    // Handle errors
  }
});

// Validation error logging
eventBus.subscribe('validation:error', (error) => {
  console.error('[Validation Error]', error);
  // Log to monitoring system
});
```

---

## Common Validation Patterns

### Required Field Validation
```javascript
function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return {
      valid: false,
      errors: [{
        field: fieldName,
        message: `${fieldName} is required`,
        code: 'REQUIRED_FIELD'
      }]
    };
  }
  return { valid: true };
}
```

### Range Validation
```javascript
function validateRange(value, min, max, fieldName) {
  if (value < min || value > max) {
    return {
      valid: false,
      errors: [{
        field: fieldName,
        message: `${fieldName} must be between ${min} and ${max}`,
        code: 'OUT_OF_RANGE',
        context: { min, max, actual: value }
      }]
    };
  }
  return { valid: true };
}
```

### Pattern Validation
```javascript
function validatePattern(value, pattern, fieldName) {
  const regex = new RegExp(pattern);
  if (!regex.test(value)) {
    return {
      valid: false,
      errors: [{
        field: fieldName,
        message: `${fieldName} format is invalid`,
        code: 'INVALID_FORMAT',
        context: { pattern, actual: value }
      }]
    };
  }
  return { valid: true };
}
```

---

## Migration Guide

### Adding New Validation

1. **Identify Layer:** Determine which layer owns the validation logic
2. **Create Validator:** Implement validator following layer patterns
3. **Add Tests:** Write comprehensive test coverage
4. **Update Schema:** If config validation, update JSON schema
5. **Document:** Add to this document and DESIGN_SYSTEM.md

### Refactoring Existing Validation

1. **Audit Current State:** Identify where validation currently lives
2. **Classify Rules:** Categorize as UI, Config, or BC validation
3. **Move Logic:** Relocate to appropriate layer
4. **Update Events:** Ensure EventBus integration
5. **Test Migration:** Verify all validation still works

---

## Related Documentation

- [EventBus Architecture](./eventbus-architecture.md)
- [Bounded Context Guide](./bounded-contexts.md)
- [Schema Management](../../harmony-schemas/README.md)
- [Web Components Guide](../../harmony-web-components/README.md)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01-XX | Three-layer validation architecture | Clear separation of concerns, testability |
| 2025-01-XX | UI validation must be synchronous | 60fps performance requirement |
| 2025-01-XX | BC validation can be asynchronous | May require state queries |
| 2025-01-XX | Consistent error structure across layers | Easier debugging and monitoring |

---

## Future Considerations

- **Validation Rule DSL:** Domain-specific language for validation rules
- **Cross-BC Validation:** Validation that spans multiple bounded contexts
- **Validation Metrics:** Track validation performance and failure rates
- **Validation Replay:** Replay validation for debugging
- **Validation Caching:** Cache validation results for repeated operations