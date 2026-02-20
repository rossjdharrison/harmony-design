/**
 * @fileoverview Test Utils Library - Custom render functions, mock providers, and test fixtures
 * @module utils/test-utils
 * 
 * Provides comprehensive testing utilities for Harmony Design System:
 * - Custom render functions for web components
 * - Mock providers for EventBus, AudioContext, GPU
 * - Test fixtures for common scenarios
 * - Assertion helpers for component testing
 * 
 * @see harmony-design/DESIGN_SYSTEM.md#testing-infrastructure
 */

/**
 * Custom render function for web components with cleanup
 * @param {string} tagName - Web component tag name
 * @param {Object} props - Properties to set on component
 * @param {Object} options - Render options
 * @returns {Promise<{container: HTMLElement, component: HTMLElement, cleanup: Function}>}
 */
export async function renderComponent(tagName, props = {}, options = {}) {
  const {
    attachTo = document.body,
    waitForRender = true,
    shadowRootMode = 'open'
  } = options;

  const container = document.createElement('div');
  container.setAttribute('data-testid', `test-container-${Date.now()}`);
  attachTo.appendChild(container);

  const component = document.createElement(tagName);
  
  // Set properties
  Object.entries(props).forEach(([key, value]) => {
    if (key.startsWith('on') && typeof value === 'function') {
      // Event listener
      const eventName = key.slice(2).toLowerCase();
      component.addEventListener(eventName, value);
    } else if (typeof value === 'object' && value !== null) {
      // Complex property
      component[key] = value;
    } else {
      // Simple attribute
      component.setAttribute(key, value);
    }
  });

  container.appendChild(component);

  // Wait for component to render if requested
  if (waitForRender) {
    await waitForComponentReady(component);
  }

  const cleanup = () => {
    container.remove();
  };

  return { container, component, cleanup };
}

/**
 * Wait for a component to be ready (connected and rendered)
 * @param {HTMLElement} component - Component to wait for
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<void>}
 */
export function waitForComponentReady(component, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Component ${component.tagName} did not become ready within ${timeout}ms`));
    }, timeout);

    if (component.shadowRoot && component.isConnected) {
      clearTimeout(timeoutId);
      // Wait one more frame for rendering
      requestAnimationFrame(() => resolve());
      return;
    }

    const observer = new MutationObserver(() => {
      if (component.shadowRoot && component.isConnected) {
        observer.disconnect();
        clearTimeout(timeoutId);
        requestAnimationFrame(() => resolve());
      }
    });

    observer.observe(component, { childList: true, subtree: true });
  });
}

/**
 * Mock EventBus for testing
 * @returns {Object} Mock EventBus with spy methods
 */
export function createMockEventBus() {
  const listeners = new Map();
  const publishedEvents = [];

  return {
    subscribe(eventType, handler, options = {}) {
      if (!listeners.has(eventType)) {
        listeners.set(eventType, []);
      }
      listeners.get(eventType).push({ handler, options });
      
      return () => {
        const handlers = listeners.get(eventType);
        const index = handlers.findIndex(h => h.handler === handler);
        if (index !== -1) handlers.splice(index, 1);
      };
    },

    publish(eventType, payload) {
      publishedEvents.push({ eventType, payload, timestamp: Date.now() });
      
      const handlers = listeners.get(eventType) || [];
      handlers.forEach(({ handler }) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    },

    // Test helpers
    getPublishedEvents(eventType = null) {
      if (eventType) {
        return publishedEvents.filter(e => e.eventType === eventType);
      }
      return [...publishedEvents];
    },

    clearPublishedEvents() {
      publishedEvents.length = 0;
    },

    hasListener(eventType) {
      return listeners.has(eventType) && listeners.get(eventType).length > 0;
    },

    getListenerCount(eventType) {
      return listeners.has(eventType) ? listeners.get(eventType).length : 0;
    },

    reset() {
      listeners.clear();
      publishedEvents.length = 0;
    }
  };
}

/**
 * Mock AudioContext for testing audio components
 * @returns {Object} Mock AudioContext
 */
export function createMockAudioContext() {
  let currentTime = 0;
  const nodes = [];

  const mockDestination = {
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    maxChannelCount: 2,
    numberOfInputs: 1,
    numberOfOutputs: 0
  };

  return {
    state: 'running',
    sampleRate: 48000,
    currentTime,
    destination: mockDestination,
    
    createGain() {
      const node = {
        gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        connect: () => node,
        disconnect: () => {}
      };
      nodes.push(node);
      return node;
    },

    createOscillator() {
      const node = {
        type: 'sine',
        frequency: { value: 440, setValueAtTime: () => {} },
        detune: { value: 0 },
        connect: () => node,
        disconnect: () => {},
        start: () => {},
        stop: () => {}
      };
      nodes.push(node);
      return node;
    },

    createBiquadFilter() {
      const node = {
        type: 'lowpass',
        frequency: { value: 350, setValueAtTime: () => {} },
        Q: { value: 1 },
        gain: { value: 0 },
        connect: () => node,
        disconnect: () => {}
      };
      nodes.push(node);
      return node;
    },

    createAnalyser() {
      const node = {
        fftSize: 2048,
        frequencyBinCount: 1024,
        minDecibels: -100,
        maxDecibels: -30,
        smoothingTimeConstant: 0.8,
        getFloatFrequencyData: (array) => array.fill(-100),
        getByteFrequencyData: (array) => array.fill(0),
        getFloatTimeDomainData: (array) => array.fill(0),
        getByteTimeDomainData: (array) => array.fill(128),
        connect: () => node,
        disconnect: () => {}
      };
      nodes.push(node);
      return node;
    },

    resume() {
      this.state = 'running';
      return Promise.resolve();
    },

    suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    },

    close() {
      this.state = 'closed';
      return Promise.resolve();
    },

    // Test helpers
    advanceTime(deltaMs) {
      currentTime += deltaMs / 1000;
      this.currentTime = currentTime;
    },

    getCreatedNodes() {
      return [...nodes];
    },

    reset() {
      nodes.length = 0;
      currentTime = 0;
      this.currentTime = 0;
      this.state = 'running';
    }
  };
}

/**
 * Mock GPU device for testing GPU-accelerated components
 * @returns {Object} Mock GPU device
 */
export function createMockGPUDevice() {
  const buffers = [];
  const pipelines = [];

  return {
    createBuffer(descriptor) {
      const buffer = {
        size: descriptor.size,
        usage: descriptor.usage,
        mapState: 'unmapped',
        getMappedRange: () => new ArrayBuffer(descriptor.size),
        unmap: () => { buffer.mapState = 'unmapped'; },
        destroy: () => {}
      };
      buffers.push(buffer);
      return buffer;
    },

    createComputePipeline(descriptor) {
      const pipeline = {
        label: descriptor.label,
        getBindGroupLayout: () => ({})
      };
      pipelines.push(pipeline);
      return pipeline;
    },

    createCommandEncoder() {
      const commands = [];
      return {
        beginComputePass: () => ({
          setPipeline: (pipeline) => commands.push({ type: 'setPipeline', pipeline }),
          setBindGroup: (index, group) => commands.push({ type: 'setBindGroup', index, group }),
          dispatchWorkgroups: (x, y, z) => commands.push({ type: 'dispatch', x, y, z }),
          end: () => {}
        }),
        copyBufferToBuffer: (src, srcOffset, dst, dstOffset, size) => {
          commands.push({ type: 'copy', src, srcOffset, dst, dstOffset, size });
        },
        finish: () => ({ commands })
      };
    },

    queue: {
      submit: (commandBuffers) => {},
      writeBuffer: (buffer, offset, data) => {}
    },

    // Test helpers
    getCreatedBuffers() {
      return [...buffers];
    },

    getCreatedPipelines() {
      return [...pipelines];
    },

    reset() {
      buffers.length = 0;
      pipelines.length = 0;
    }
  };
}

/**
 * Test fixtures for common scenarios
 */
export const fixtures = {
  /**
   * Audio buffer fixture
   */
  audioBuffer: {
    sampleRate: 48000,
    length: 48000, // 1 second
    numberOfChannels: 2,
    duration: 1.0,
    getChannelData(channel) {
      const data = new Float32Array(this.length);
      // Generate simple sine wave
      for (let i = 0; i < this.length; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / this.sampleRate);
      }
      return data;
    }
  },

  /**
   * Graph node fixture
   */
  graphNode: {
    id: 'test-node-1',
    type: 'audio-source',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    inputs: [
      { id: 'input-1', type: 'audio', label: 'Input' }
    ],
    outputs: [
      { id: 'output-1', type: 'audio', label: 'Output' }
    ],
    parameters: {
      gain: 0.5,
      frequency: 440
    }
  },

  /**
   * Graph edge fixture
   */
  graphEdge: {
    id: 'test-edge-1',
    source: 'test-node-1',
    sourcePort: 'output-1',
    target: 'test-node-2',
    targetPort: 'input-1',
    type: 'audio'
  },

  /**
   * Event fixture
   */
  event: {
    type: 'test-event',
    payload: { data: 'test' },
    timestamp: Date.now(),
    source: 'test-component'
  },

  /**
   * User interaction fixture
   */
  userInteraction: {
    click: (element, options = {}) => {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        ...options
      });
      element.dispatchEvent(event);
    },

    doubleClick: (element, options = {}) => {
      const event = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        view: window,
        ...options
      });
      element.dispatchEvent(event);
    },

    hover: (element) => {
      const enterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(enterEvent);
    },

    unhover: (element) => {
      const leaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      element.dispatchEvent(leaveEvent);
    },

    keyPress: (element, key, options = {}) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options
      });
      element.dispatchEvent(event);
    },

    drag: (element, from, to) => {
      const dragStart = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        clientX: from.x,
        clientY: from.y
      });
      element.dispatchEvent(dragStart);

      const dragEnd = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
        clientX: to.x,
        clientY: to.y
      });
      element.dispatchEvent(dragEnd);
    }
  }
};

/**
 * Assertion helpers for component testing
 */
export const assertions = {
  /**
   * Assert component has shadow root
   */
  hasShadowRoot(component) {
    if (!component.shadowRoot) {
      throw new Error(`Component ${component.tagName} does not have a shadow root`);
    }
  },

  /**
   * Assert element is visible
   */
  isVisible(element) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      throw new Error(`Element is not visible`);
    }
  },

  /**
   * Assert element has attribute
   */
  hasAttribute(element, attribute, value = null) {
    if (!element.hasAttribute(attribute)) {
      throw new Error(`Element does not have attribute: ${attribute}`);
    }
    if (value !== null && element.getAttribute(attribute) !== value) {
      throw new Error(`Attribute ${attribute} has value "${element.getAttribute(attribute)}", expected "${value}"`);
    }
  },

  /**
   * Assert element has class
   */
  hasClass(element, className) {
    if (!element.classList.contains(className)) {
      throw new Error(`Element does not have class: ${className}`);
    }
  },

  /**
   * Assert element contains text
   */
  containsText(element, text) {
    const content = element.textContent || '';
    if (!content.includes(text)) {
      throw new Error(`Element does not contain text: "${text}". Found: "${content}"`);
    }
  },

  /**
   * Assert event was published
   */
  eventWasPublished(mockEventBus, eventType, count = null) {
    const events = mockEventBus.getPublishedEvents(eventType);
    if (events.length === 0) {
      throw new Error(`Event "${eventType}" was not published`);
    }
    if (count !== null && events.length !== count) {
      throw new Error(`Event "${eventType}" was published ${events.length} times, expected ${count}`);
    }
  },

  /**
   * Assert component property equals value
   */
  propertyEquals(component, property, expectedValue) {
    const actualValue = component[property];
    if (actualValue !== expectedValue) {
      throw new Error(`Property ${property} is ${actualValue}, expected ${expectedValue}`);
    }
  },

  /**
   * Assert performance within budget
   */
  async performanceWithinBudget(fn, maxDurationMs = 16) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    
    if (duration > maxDurationMs) {
      throw new Error(`Performance budget exceeded: ${duration.toFixed(2)}ms > ${maxDurationMs}ms`);
    }
  }
};

/**
 * Wait for a condition to be true
 * @param {Function} condition - Condition function that returns boolean
 * @param {Object} options - Wait options
 * @returns {Promise<void>}
 */
export function waitFor(condition, options = {}) {
  const {
    timeout = 3000,
    interval = 50,
    timeoutMessage = 'Condition was not met within timeout'
  } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
        return;
      }

      if (Date.now() - startTime >= timeout) {
        reject(new Error(timeoutMessage));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Create a spy function for testing
 * @param {Function} implementation - Optional implementation
 * @returns {Function} Spy function with call tracking
 */
export function createSpy(implementation = () => {}) {
  const calls = [];
  
  const spy = function(...args) {
    calls.push({ args, timestamp: Date.now(), context: this });
    return implementation.apply(this, args);
  };

  spy.calls = calls;
  spy.callCount = () => calls.length;
  spy.calledWith = (...expectedArgs) => {
    return calls.some(call => 
      call.args.length === expectedArgs.length &&
      call.args.every((arg, i) => arg === expectedArgs[i])
    );
  };
  spy.reset = () => { calls.length = 0; };

  return spy;
}

/**
 * Batch test runner for multiple test cases
 * @param {Array<Object>} testCases - Array of test case objects
 * @returns {Promise<Object>} Test results
 */
export async function runTestBatch(testCases) {
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (const testCase of testCases) {
    if (testCase.skip) {
      results.skipped++;
      continue;
    }

    try {
      await testCase.test();
      results.passed++;
      console.log(`✓ ${testCase.name}`);
    } catch (error) {
      results.failed++;
      results.errors.push({
        name: testCase.name,
        error: error.message,
        stack: error.stack
      });
      console.error(`✗ ${testCase.name}:`, error.message);
    }
  }

  return results;
}

/**
 * Create a test environment with all mocks
 * @returns {Object} Test environment with mocks and utilities
 */
export function createTestEnvironment() {
  const eventBus = createMockEventBus();
  const audioContext = createMockAudioContext();
  const gpuDevice = createMockGPUDevice();

  return {
    eventBus,
    audioContext,
    gpuDevice,
    renderComponent,
    waitFor,
    createSpy,
    fixtures,
    assertions,
    
    cleanup() {
      eventBus.reset();
      audioContext.reset();
      gpuDevice.reset();
    }
  };
}